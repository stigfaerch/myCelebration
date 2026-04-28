'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createPerformance,
  updatePerformance,
  deletePerformance,
} from '@/lib/actions/guest/performances'
import type {
  MyPerformance,
  PerformanceInput,
  PerformanceType,
  PerformanceStatus,
} from '@/lib/actions/guest/performances'

interface Props {
  initialPerformances: MyPerformance[]
}

const TYPE_LABELS: Record<PerformanceType, string> = {
  speech: 'Tale',
  toast: 'Skål',
  music: 'Sang & musik',
  dance: 'Dans',
  poem: 'Digt',
  other: 'Andet',
}

const STATUS_LABELS: Record<PerformanceStatus, string> = {
  pending: 'Afventer',
  approved: 'Godkendt',
  rejected: 'Afvist',
  scheduled: 'Planlagt',
}

const STATUS_COLORS: Record<PerformanceStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  scheduled: 'bg-blue-100 text-blue-800',
}

const TYPE_OPTIONS: PerformanceType[] = ['speech', 'toast', 'music', 'dance', 'poem', 'other']

export function PerformanceManager({ initialPerformances }: Props) {
  const router = useRouter()
  const [items, setItems] = React.useState<MyPerformance[]>(initialPerformances)
  const [prevInitial, setPrevInitial] = React.useState(initialPerformances)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  // Re-sync local list when server data changes (React 19 pattern — derive
  // during render rather than useEffect to avoid cascading renders).
  if (prevInitial !== initialPerformances) {
    setPrevInitial(initialPerformances)
    setItems(initialPerformances)
  }

  function handleCreate(input: PerformanceInput) {
    setError(null)
    startTransition(async () => {
      try {
        await createPerformance(input)
        setShowCreateForm(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunne ikke oprette indslag')
      }
    })
  }

  function handleUpdate(id: string, input: PerformanceInput) {
    setError(null)
    startTransition(async () => {
      try {
        await updatePerformance(id, input)
        setEditingId(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunne ikke gemme ændringer')
      }
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm('Slet dette indslag?')) return
    setError(null)
    // Optimistic removal
    const previous = items
    setItems((prev) => prev.filter((p) => p.id !== id))
    startTransition(async () => {
      try {
        await deletePerformance(id)
        router.refresh()
      } catch (err) {
        setItems(previous)
        setError(err instanceof Error ? err.message : 'Kunne ikke slette indslag')
      }
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Mine indslag</h2>
        {!showCreateForm && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null)
              setShowCreateForm(true)
            }}
          >
            <Plus className="size-4" />
            Nyt indslag
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showCreateForm && (
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Nyt indslag</p>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setShowCreateForm(false)}
              aria-label="Luk"
            >
              <X className="size-4" />
            </Button>
          </div>
          <PerformanceForm
            disabled={isPending}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            submitLabel="Opret"
          />
        </div>
      )}

      {items.length === 0 && !showCreateForm ? (
        <p className="text-sm text-muted-foreground">Du har endnu ikke oprettet indslag.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="rounded-lg border p-3">
              {editingId === p.id ? (
                <PerformanceForm
                  disabled={isPending}
                  initial={p}
                  onSubmit={(input) => handleUpdate(p.id, input)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Gem"
                />
              ) : (
                <PerformanceRow
                  performance={p}
                  disabled={isPending}
                  onEdit={() => {
                    setError(null)
                    setEditingId(p.id)
                  }}
                  onDelete={() => handleDelete(p.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PerformanceRow({
  performance,
  disabled,
  onEdit,
  onDelete,
}: {
  performance: MyPerformance
  disabled: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  // Defensive: pre-migration rows or unexpected payloads might present a
  // non-array value. Treat anything non-array as empty so the row still
  // renders without crashing the page.
  const types: PerformanceType[] = Array.isArray(performance.type) ? performance.type : []

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{performance.title}</span>
            {types.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-muted text-muted-foreground"
              >
                {TYPE_LABELS[t]}
              </span>
            ))}
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[performance.status]}`}
            >
              {STATUS_LABELS[performance.status]}
            </span>
          </div>
          {performance.description && (
            <p className="text-xs text-muted-foreground break-words">
              {performance.description}
            </p>
          )}
          {performance.duration_minutes != null && (
            <p className="text-xs text-muted-foreground">
              Varighed: {performance.duration_minutes} min
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onEdit}
            disabled={disabled}
            aria-label="Rediger"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Slet"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function PerformanceForm({
  initial,
  disabled,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: MyPerformance
  disabled: boolean
  onSubmit: (input: PerformanceInput) => void
  onCancel: () => void
  submitLabel: string
}) {
  const [title, setTitle] = React.useState(initial?.title ?? '')
  // Multi-select state. Default for a new indslag is an empty Set so the
  // user must explicitly pick at least one type. For existing rows we seed
  // from the stored array, defensively filtering non-array values.
  const [selectedTypes, setSelectedTypes] = React.useState<Set<PerformanceType>>(
    () => new Set(Array.isArray(initial?.type) ? initial!.type : [])
  )
  const [description, setDescription] = React.useState(initial?.description ?? '')
  const [duration, setDuration] = React.useState<string>(
    initial?.duration_minutes != null ? String(initial.duration_minutes) : ''
  )
  const [validationError, setValidationError] = React.useState<string | null>(null)

  function toggleType(t: PerformanceType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) {
        next.delete(t)
      } else {
        next.add(t)
      }
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('Titel er påkrævet')
      return
    }
    if (selectedTypes.size === 0) {
      setValidationError('Vælg mindst én type')
      return
    }
    const parsedDuration = duration === '' ? null : Number(duration)
    if (duration !== '' && !Number.isFinite(parsedDuration)) {
      setValidationError('Ugyldig varighed')
      return
    }
    setValidationError(null)
    onSubmit({
      title: trimmedTitle,
      type: Array.from(selectedTypes),
      description: description.trim() || null,
      duration_minutes: parsedDuration,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="perf-title">Titel</Label>
        <Input
          id="perf-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          maxLength={200}
          required
        />
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Type</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          {TYPE_OPTIONS.map((t) => {
            const id = `perf-type-${t}`
            const checked = selectedTypes.has(t)
            return (
              <label
                key={t}
                htmlFor={id}
                className="inline-flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleType(t)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-input"
                />
                {TYPE_LABELS[t]}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="perf-desc">Beskrivelse</Label>
        <textarea
          id="perf-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled}
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm resize-none"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="perf-duration">Varighed (min, valgfri)</Label>
        <Input
          id="perf-duration"
          type="number"
          min="0"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          disabled={disabled}
          placeholder="—"
        />
      </div>

      {validationError && <p className="text-sm text-destructive">{validationError}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={disabled}>
          {disabled ? 'Gemmer…' : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={disabled}>
          Annullér
        </Button>
      </div>
    </form>
  )
}
