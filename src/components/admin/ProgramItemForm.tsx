'use client'
import { useState, useTransition, useMemo, useRef } from 'react'
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
  { value: 'event', label: 'Begivenhed' },
  { value: 'break', label: 'Pause' },
  { value: 'performance', label: 'Indslag' },
  { value: 'info', label: 'Information' },
  { value: 'ceremony', label: 'Ceremoni' },
]

// Convert a UTC ISO string to a local-clock `YYYY-MM-DDTHH:MM` for
// <input type="datetime-local">. Using local accessors flips UTC -> wall time.
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Inverse: parse the local-clock input value as local time and emit a UTC
// ISO string. `new Date("YYYY-MM-DDTHH:MM")` (no offset) is parsed as local.
function fromDatetimeLocal(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
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
  // Default Type to 'event' (Begivenhed) on new items — matches the DB
  // column default. When editing, preserve the existing type.
  const [selectedType, setSelectedType] = useState<ProgramItemType>(
    item?.type ?? 'event'
  )
  const titleRef = useRef<HTMLInputElement>(null)
  const durationRef = useRef<HTMLInputElement>(null)

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
    const start_time = fromDatetimeLocal(fd.get('start_time') as string)
    // Duration only applies to 'performance' (Indslag). For any other type,
    // we explicitly null it so old values don't linger after a type change.
    const durationRaw = fd.get('duration_minutes') as string
    const duration_minutes =
      type === 'performance' && durationRaw ? Number(durationRaw) : null
    // show_duration is meaningful only for 'performance'. For other types
    // we persist false so the guest page never accidentally renders a
    // duration even if duration_minutes is somehow non-null.
    const show_duration =
      type === 'performance' && fd.get('show_duration') === 'on'
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
      show_duration,
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

  // Show all indslag except explicitly-rejected ones. Pending indslag should
  // be selectable so the admin doesn't have to approve before scheduling.
  const selectablePerformances = performances.filter((p) => p.status !== 'rejected')

  function handlePerformanceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    if (!id) return
    setSelectedType('performance')
    const perf = selectablePerformances.find((p) => p.id === id)
    if (!perf) return
    if (titleRef.current && !titleRef.current.value) {
      titleRef.current.value = perf.title
    }
    if (
      durationRef.current &&
      !durationRef.current.value &&
      perf.duration_minutes != null
    ) {
      durationRef.current.value = String(perf.duration_minutes)
    }
  }

  const STATUS_LABELS: Record<string, string> = {
    pending: 'afventer',
    approved: 'godkendt',
    scheduled: 'planlagt',
  }

  const parentIdDefault = item?.parent_id ?? defaultParentId ?? ''

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="pi-title" className="text-sm font-medium">Titel *</label>
        <input
          ref={titleRef}
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

      {selectedType === 'performance' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label htmlFor="pi-duration" className="text-sm font-medium">Varighed (minutter)</label>
            <input
              ref={durationRef}
              id="pi-duration"
              name="duration_minutes"
              type="number"
              min="1"
              defaultValue={item?.duration_minutes ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="pi-show-duration"
              name="show_duration"
              type="checkbox"
              defaultChecked={item?.show_duration ?? false}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="pi-show-duration" className="text-sm font-medium">
              Vis varighed på programsiden
            </label>
          </div>
        </div>
      )}

      {selectedType === 'performance' && (
        <div className="space-y-1">
          <label htmlFor="pi-performance" className="text-sm font-medium">Indslag</label>
          <select
            id="pi-performance"
            name="performance_id"
            defaultValue={item?.performance_id ?? ''}
            onChange={handlePerformanceChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">-- Vælg indslag (valgfrit) --</option>
            {selectablePerformances.length === 0 ? (
              <option value="" disabled>Ingen indslag oprettet endnu</option>
            ) : (
              selectablePerformances.map((p) => {
                const guestName = getGuestName(p)
                const statusLabel = STATUS_LABELS[p.status] ?? p.status
                const durationSuffix = p.duration_minutes ? ` · ${p.duration_minutes} min` : ''
                const namePrefix = guestName ? `${guestName} – ` : ''
                const label = `${namePrefix}${p.title}${durationSuffix} [${statusLabel}]`
                return (
                  <option key={p.id} value={p.id}>{label}</option>
                )
              })
            )}
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
