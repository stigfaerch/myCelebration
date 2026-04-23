'use client'
import { useState, useTransition, useMemo } from 'react'
import { getProgramItems, createProgramItem, updateProgramItem, type ProgramItemType } from '@/lib/actions/program'
import { getPerformances } from '@/lib/actions/performances'
import { Button } from '@/components/ui/button'

type Items = Awaited<ReturnType<typeof getProgramItems>>
type Performances = Awaited<ReturnType<typeof getPerformances>>

interface Props {
  item?: Items[number]
  performances: Performances
  items: Items
  defaultParentId?: string | null
  onSave: () => void
  onCancel: () => void
}

const TYPE_OPTIONS: { value: ProgramItemType; label: string }[] = [
  { value: 'break', label: 'Pause' },
  { value: 'performance', label: 'Indslag' },
  { value: 'info', label: 'Information' },
  { value: 'ceremony', label: 'Ceremoni' },
]

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

function getGuestName(perf: Performances[number]): string {
  const guests = perf.guests
  if (!guests) return ''
  if (Array.isArray(guests)) {
    const first = guests[0]
    return first ? (first as { name: string }).name : ''
  }
  return (guests as { name: string }).name ?? ''
}

export function ProgramItemForm({ item, performances, items, defaultParentId, onSave, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<ProgramItemType>(item?.type ?? 'info')

  const topLevelItems = useMemo(
    () => items.filter((i) => i.parent_id === null),
    [items]
  )

  const hasChildren = useMemo(
    () => item ? items.some((i) => i.parent_id === item.id) : false,
    [items, item]
  )

  const showParentSelect = !item || !hasChildren

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const title = (fd.get('title') as string).trim()
    if (!title) return

    const type = fd.get('type') as ProgramItemType
    const start_time = (fd.get('start_time') as string) || null
    const durationRaw = fd.get('duration_minutes') as string
    const duration_minutes = durationRaw ? Number(durationRaw) : null
    const performance_id = type === 'performance'
      ? ((fd.get('performance_id') as string) || null)
      : null
    const parent_id_raw = fd.get('parent_id') as string
    const parent_id = parent_id_raw || null
    const notes = (fd.get('notes') as string).trim() || null

    const formData = {
      title,
      type,
      start_time,
      duration_minutes,
      performance_id,
      parent_id,
      notes,
    }

    setError(null)
    startTransition(async () => {
      try {
        if (item) {
          await updateProgramItem(item.id, formData)
        } else {
          await createProgramItem(formData)
        }
        onSave()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  const approvedPerformances = performances.filter(
    (p) => p.status === 'approved' || p.status === 'scheduled'
  )

  const parentIdDefault = item?.parent_id ?? defaultParentId ?? ''

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="pi-title" className="text-sm font-medium">Titel *</label>
        <input
          id="pi-title"
          name="title"
          type="text"
          required
          defaultValue={item?.title ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="pi-type" className="text-sm font-medium">Type</label>
        <select
          id="pi-type"
          name="type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as ProgramItemType)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="pi-start-time" className="text-sm font-medium">Starttid</label>
        <input
          id="pi-start-time"
          name="start_time"
          type="datetime-local"
          defaultValue={toDatetimeLocal(item?.start_time)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="pi-duration" className="text-sm font-medium">Varighed (minutter)</label>
        <input
          id="pi-duration"
          name="duration_minutes"
          type="number"
          min="1"
          defaultValue={item?.duration_minutes ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {selectedType === 'performance' && (
        <div className="space-y-1">
          <label htmlFor="pi-performance" className="text-sm font-medium">Indslag</label>
          <select
            id="pi-performance"
            name="performance_id"
            defaultValue={item?.performance_id ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">-- Vlg indslag (valgfrit) --</option>
            {approvedPerformances.map((p) => {
              const guestName = getGuestName(p)
              const label = guestName
                ? `${guestName} -- ${p.title}${p.duration_minutes ? ` (${p.duration_minutes} min)` : ''}`
                : `${p.title}${p.duration_minutes ? ` (${p.duration_minutes} min)` : ''}`
              return (
                <option key={p.id} value={p.id}>{label}</option>
              )
            })}
          </select>
        </div>
      )}

      {showParentSelect && (
        <div className="space-y-1">
          <label htmlFor="pi-parent" className="text-sm font-medium">Overordnet punkt</label>
          <select
            id="pi-parent"
            name="parent_id"
            defaultValue={parentIdDefault}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">-- Ingen (top-niveau) --</option>
            {topLevelItems
              .filter((t) => t.id !== item?.id)
              .map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="pi-notes" className="text-sm font-medium">Noter</label>
        <textarea
          id="pi-notes"
          name="notes"
          rows={3}
          defaultValue={item?.notes ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Gemmer...' : item ? 'Opdater' : 'Opret'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Annuller
        </Button>
      </div>
    </form>
  )
}
