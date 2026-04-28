'use client'
import { useState, useTransition } from 'react'
import type { PerformanceType, PerformanceStatus } from '@/lib/actions/performances'
import { updatePerformanceDuration, updatePerformanceStatus } from '@/lib/actions/performances'

type PerformanceWithGuest = {
  id: string
  guest_id: string
  type: PerformanceType[]
  title: string
  description: string | null
  duration_minutes: number | null
  sort_order: number
  status: PerformanceStatus
  created_at: string
  guests: { name: string; type: string } | null
}

interface Props {
  initialPerformances: PerformanceWithGuest[]
}

const TYPE_LABELS: Record<PerformanceType | 'all', string> = {
  all: 'Alle',
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

const TYPE_COLORS: Record<PerformanceType, string> = {
  speech: 'bg-purple-100 text-purple-800',
  toast: 'bg-amber-100 text-amber-800',
  music: 'bg-teal-100 text-teal-800',
  dance: 'bg-pink-100 text-pink-800',
  poem: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-800',
}

const FILTER_TYPES = ['all', 'speech', 'toast', 'music', 'dance', 'poem', 'other'] as const
type FilterType = (typeof FILTER_TYPES)[number]

function PerformanceRow({ performance }: { performance: PerformanceWithGuest }) {
  const [durationValue, setDurationValue] = useState<string>(
    performance.duration_minutes != null ? String(performance.duration_minutes) : ''
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDurationCommit() {
    const parsed = durationValue === '' ? null : Number(durationValue)
    if (durationValue !== '' && !Number.isFinite(parsed)) return
    startTransition(async () => {
      try {
        await updatePerformanceDuration(performance.id, parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fejl')
      }
    })
  }

  function handleDurationKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as PerformanceStatus
    startTransition(async () => {
      try {
        await updatePerformanceStatus(performance.id, newStatus)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fejl')
      }
    })
  }

  const description = performance.description
    ? performance.description.length > 80
      ? performance.description.slice(0, 80) + '...'
      : performance.description
    : null

  // Defensive: if the migration hasn't run yet or the row was hand-edited,
  // tolerate a non-array value rather than crashing the admin list.
  const types: PerformanceType[] = Array.isArray(performance.type) ? performance.type : []

  return (
    <li className="rounded-md border p-4 space-y-2">
      <div className="flex flex-wrap items-start gap-2">
        {types.map((t) => (
          <span
            key={t}
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[t]}`}
          >
            {TYPE_LABELS[t]}
          </span>
        ))}
        <span className="text-sm font-medium">{performance.title}</span>
        {performance.guests && (
          <span className="text-xs text-muted-foreground">— {performance.guests.name}</span>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {/* Duration input */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-muted-foreground">Varighed (min):</label>
          <input
            type="number"
            min="0"
            value={durationValue}
            onChange={(e) => setDurationValue(e.target.value)}
            onBlur={handleDurationCommit}
            onKeyDown={handleDurationKeyDown}
            disabled={isPending}
            placeholder="—"
            className="w-16 rounded border border-input bg-background px-2 py-0.5 text-sm disabled:opacity-50"
          />
        </div>

        {/* Status select */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-muted-foreground">Status:</label>
          <select
            value={performance.status}
            onChange={handleStatusChange}
            disabled={isPending}
            className="rounded border border-input bg-background px-2 py-0.5 text-sm disabled:opacity-50"
          >
            {(Object.keys(STATUS_LABELS) as PerformanceStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[performance.status]}`}>
            {STATUS_LABELS[performance.status]}
          </span>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </li>
  )
}

export function PerformanceList({ initialPerformances }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = filter === 'all'
    ? initialPerformances
    : initialPerformances.filter((p) =>
        Array.isArray(p.type) ? p.type.includes(filter) : false
      )

  return (
    <div className="space-y-4">
      {/* Type filter buttons */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              filter === t
                ? 'bg-primary text-primary-foreground'
                : 'border border-input bg-background hover:bg-muted'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen indslag fundet.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <PerformanceRow key={`${p.id}-${p.duration_minutes}`} performance={p} />
          ))}
        </ul>
      )}
    </div>
  )
}
