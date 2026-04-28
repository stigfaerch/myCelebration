import * as React from 'react'

/**
 * Screen-side program timeline, shown as a fullscreen rotation slot when an
 * admin assigns the `program` static key to a screen.
 *
 * Pure presentational. Mirrors `/[uuid]/program` content but with screen
 * typography (no chrome, large readable text). Parent-child nesting is
 * preserved: top-level rows render as cards, child rows render indented
 * under their parent.
 */
interface PerformanceJoin {
  id: string
  title: string
  // After migration 014 this column is a Postgres enum array; we keep it
  // here for shape parity with the SELECT but never render it on the screen.
  type: string[] | null
  duration_minutes: number | null
  guests: { name: string } | { name: string }[] | null
}

export interface ScreenProgramRow {
  id: string
  title: string
  start_time: string | null
  duration_minutes: number | null
  type: string
  parent_id: string | null
  notes: string | null
  performances: PerformanceJoin | PerformanceJoin[] | null
}

interface Props {
  items: ScreenProgramRow[]
}

const TYPE_LABELS: Record<string, string> = {
  break: 'Pause',
  performance: 'Indslag',
  info: 'Info',
  ceremony: 'Ceremoni',
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function performerName(p: PerformanceJoin | PerformanceJoin[] | null): string | null {
  if (!p) return null
  const first = Array.isArray(p) ? p[0] : p
  if (!first?.guests) return null
  const g = Array.isArray(first.guests) ? first.guests[0] : first.guests
  return g?.name ?? null
}

function performanceTitle(p: PerformanceJoin | PerformanceJoin[] | null): string | null {
  if (!p) return null
  const first = Array.isArray(p) ? p[0] : p
  return first?.title ?? null
}

function ProgramRowView({
  item,
  indented,
}: {
  item: ScreenProgramRow
  indented: boolean
}) {
  const time = formatTime(item.start_time)
  const performer = performerName(item.performances)
  const perfTitle = performanceTitle(item.performances)
  const subtitle =
    item.type === 'performance' && (perfTitle || performer)
      ? [perfTitle, performer].filter(Boolean).join(' · ')
      : null

  return (
    <li
      className={`rounded-2xl border border-white/10 bg-white/5 px-8 py-5 ${
        indented ? 'ml-12' : ''
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-4">
        {time ? (
          <span className="rounded-full bg-white/10 px-4 py-1 text-xl tabular-nums">
            {time}
          </span>
        ) : null}
        <h2 className="text-3xl font-semibold tracking-tight">{item.title}</h2>
        <span className="rounded-full bg-white/10 px-3 py-0.5 text-sm uppercase tracking-wide text-slate-200">
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
        {item.duration_minutes != null ? (
          <span className="text-lg text-slate-300">
            {item.duration_minutes} min
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="mt-2 text-xl text-slate-200">{subtitle}</p>
      ) : null}
      {item.notes ? (
        <p className="mt-3 whitespace-pre-line text-lg text-slate-300">
          {item.notes}
        </p>
      ) : null}
    </li>
  )
}

export function ScreenProgram({ items }: Props) {
  const childrenByParent = new Map<string, ScreenProgramRow[]>()
  for (const item of items) {
    if (item.parent_id) {
      const arr = childrenByParent.get(item.parent_id) ?? []
      arr.push(item)
      childrenByParent.set(item.parent_id, arr)
    }
  }
  const topLevel = items.filter((i) => !i.parent_id)

  return (
    <div className="absolute inset-0 overflow-auto bg-slate-950 text-white">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-12 py-16">
        <h1 className="mb-12 text-center text-7xl font-bold tracking-tight">
          Program
        </h1>
        {topLevel.length === 0 ? (
          <p className="text-center text-2xl text-slate-400">
            Programmet er ikke klar endnu
          </p>
        ) : (
          <ul className="space-y-6">
            {topLevel.map((item) => {
              const children = childrenByParent.get(item.id) ?? []
              return (
                <li key={item.id}>
                  <ul className="space-y-3">
                    <ProgramRowView item={item} indented={false} />
                    {children.length > 0 ? (
                      <ul className="space-y-3">
                        {children.map((child) => (
                          <ProgramRowView
                            key={child.id}
                            item={child}
                            indented
                          />
                        ))}
                      </ul>
                    ) : null}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
