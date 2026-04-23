'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Label } from '@/components/ui/label'
import { upsertChoiceAnswer } from '@/lib/actions/guest/choices'
import type { ChoiceDefinition } from '@/lib/actions/guest/choices'

interface Props {
  definitions: ChoiceDefinition[]
  initialAnswers: Record<string, string>
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const MAX_TEXT_LEN = 500
const DEBOUNCE_MS = 500

export function ChoiceAnswers({ definitions, initialAnswers }: Props) {
  const router = useRouter()
  const [values, setValues] = React.useState<Record<string, string>>(initialAnswers)
  const [prevInitial, setPrevInitial] = React.useState(initialAnswers)
  const [saveState, setSaveState] = React.useState<Record<string, SaveState>>({})
  const [errorMessages, setErrorMessages] = React.useState<Record<string, string>>({})
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Resync local values when server sends fresh answers (React 19 pattern —
  // derive during render rather than useEffect to avoid cascading renders).
  if (prevInitial !== initialAnswers) {
    setPrevInitial(initialAnswers)
    setValues(initialAnswers)
  }

  // Clear all timers on unmount
  React.useEffect(() => {
    const t = timers.current
    return () => {
      Object.values(t).forEach((id) => clearTimeout(id))
    }
  }, [])

  const scheduleSave = React.useCallback(
    (definitionId: string, value: string | null, delay: number) => {
      if (timers.current[definitionId]) {
        clearTimeout(timers.current[definitionId])
      }
      setSaveState((prev) => ({ ...prev, [definitionId]: 'saving' }))
      setErrorMessages((prev) => ({ ...prev, [definitionId]: '' }))

      timers.current[definitionId] = setTimeout(() => {
        ;(async () => {
          try {
            await upsertChoiceAnswer(definitionId, value)
            setSaveState((prev) => ({ ...prev, [definitionId]: 'saved' }))
            router.refresh()
          } catch (err) {
            setSaveState((prev) => ({ ...prev, [definitionId]: 'error' }))
            setErrorMessages((prev) => ({
              ...prev,
              [definitionId]: err instanceof Error ? err.message : 'Kunne ikke gemme',
            }))
          }
        })()
      }, delay)
    },
    [router]
  )

  function handleBinaryChange(def: ChoiceDefinition, checked: boolean) {
    const nextValue = checked ? 'true' : ''
    setValues((prev) => ({ ...prev, [def.id]: nextValue }))
    // No debounce for binary — it's a single click
    scheduleSave(def.id, checked ? 'true' : null, 0)
  }

  function handleMultichoiceChange(def: ChoiceDefinition, option: string) {
    setValues((prev) => ({ ...prev, [def.id]: option }))
    scheduleSave(def.id, option, 0)
  }

  function handleTextChange(def: ChoiceDefinition, value: string) {
    const capped = value.length > MAX_TEXT_LEN ? value.slice(0, MAX_TEXT_LEN) : value
    setValues((prev) => ({ ...prev, [def.id]: capped }))
    scheduleSave(def.id, capped.trim() === '' ? null : capped, DEBOUNCE_MS)
  }

  if (definitions.length === 0) return null

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Valg</h2>

      <ul className="space-y-4">
        {definitions.map((def) => {
          const current = values[def.id] ?? ''
          const state = saveState[def.id] ?? 'idle'
          const errMsg = errorMessages[def.id]
          return (
            <li key={def.id} className="rounded-lg border p-3 space-y-2">
              <ChoiceRow
                def={def}
                value={current}
                onBinaryChange={handleBinaryChange}
                onMultichoiceChange={handleMultichoiceChange}
                onTextChange={handleTextChange}
              />
              <StatusRow state={state} error={errMsg} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ChoiceRow({
  def,
  value,
  onBinaryChange,
  onMultichoiceChange,
  onTextChange,
}: {
  def: ChoiceDefinition
  value: string
  onBinaryChange: (def: ChoiceDefinition, checked: boolean) => void
  onMultichoiceChange: (def: ChoiceDefinition, option: string) => void
  onTextChange: (def: ChoiceDefinition, value: string) => void
}) {
  if (def.type === 'binary') {
    const checked = value === 'true'
    return (
      <Label className="items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onBinaryChange(def, e.target.checked)}
          className="mt-0.5 size-4 rounded border-input"
        />
        <span className="font-medium">{def.title}</span>
      </Label>
    )
  }

  if (def.type === 'multichoice') {
    const options = Array.isArray(def.options) ? def.options : []
    if (options.length === 0) {
      return (
        <div className="text-sm">
          <p className="font-medium">{def.title}</p>
          <p className="text-muted-foreground">Ingen muligheder defineret.</p>
        </div>
      )
    }

    if (options.length > 4) {
      return (
        <div className="space-y-2">
          <Label htmlFor={`choice-${def.id}`}>{def.title}</Label>
          <select
            id={`choice-${def.id}`}
            value={value}
            onChange={(e) => onMultichoiceChange(def, e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm"
          >
            <option value="">— Vælg —</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )
    }

    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{def.title}</legend>
        <div className="space-y-1">
          {options.map((opt) => (
            <Label key={opt} className="items-center gap-2 font-normal">
              <input
                type="radio"
                name={`choice-${def.id}`}
                value={opt}
                checked={value === opt}
                onChange={() => onMultichoiceChange(def, opt)}
                className="size-4 border-input"
              />
              <span>{opt}</span>
            </Label>
          ))}
        </div>
      </fieldset>
    )
  }

  // text
  return (
    <div className="space-y-2">
      <Label htmlFor={`choice-${def.id}`}>{def.title}</Label>
      <textarea
        id={`choice-${def.id}`}
        value={value}
        maxLength={MAX_TEXT_LEN}
        onChange={(e) => onTextChange(def, e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm resize-none"
      />
      <p className="text-xs text-muted-foreground">
        {value.length}/{MAX_TEXT_LEN}
      </p>
    </div>
  )
}

function StatusRow({ state, error }: { state: SaveState; error?: string }) {
  if (state === 'saving') {
    return <p className="text-xs text-muted-foreground">Gemmer…</p>
  }
  if (state === 'saved') {
    return <p className="text-xs text-green-700">Gemt</p>
  }
  if (state === 'error') {
    return <p className="text-xs text-destructive">{error || 'Kunne ikke gemme'}</p>
  }
  return null
}
