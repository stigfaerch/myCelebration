import { notFound } from 'next/navigation'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { getProgramItems, type ProgramItem } from '@/lib/actions/program'
import {
  getStaticItemVisibilityMap,
  isStaticItemVisibleNow,
} from '@/lib/actions/staticItemVisibility'

interface PerformanceJoin {
  id: string
  title: string
  // After migration 014 this column is a Postgres enum array; we keep it
  // here for shape parity with the SELECT but never render it on this page.
  type: string[] | null
  duration_minutes: number | null
  guests: { name: string } | { name: string }[] | null
}

type ProgramRow = ProgramItem & {
  performances: PerformanceJoin | PerformanceJoin[] | null
}

const TYPE_LABELS: Record<string, string> = {
  break: 'Pause',
  performance: 'Indslag',
  info: 'Info',
  ceremony: 'Ceremoni',
  event: 'Begivenhed',
}

const TYPE_COLORS: Record<string, string> = {
  break: 'bg-gray-100 text-gray-700',
  performance: 'bg-purple-100 text-purple-800',
  info: 'bg-blue-100 text-blue-800',
  ceremony: 'bg-amber-100 text-amber-800',
  event: 'bg-muted text-muted-foreground',
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
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

function ProgramItemRow({ item, indented = false }: { item: ProgramRow; indented?: boolean }) {
  const time = formatTime(item.start_time)
  const performer = performerName(item.performances)
  const perfTitle = performanceTitle(item.performances)
  const subtitle = item.type === 'performance' && (perfTitle || performer)
    ? [perfTitle, performer].filter(Boolean).join(' · ')
    : null

  return (
    <li
      className={`rounded-md border p-3 ${indented ? 'ml-6' : ''}`}
    >
      <div className="flex items-start gap-3">
        {time ? (
          <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
            {time}
          </span>
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{item.title}</span>
            {item.type !== 'event' && (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${TYPE_COLORS[item.type] ?? ''}`}
              >
                {TYPE_LABELS[item.type] ?? item.type}
              </span>
            )}
            {item.show_duration && item.duration_minutes != null && (
              <span className="text-xs text-muted-foreground">{item.duration_minutes} min</span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {item.notes && (
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{item.notes}</p>
          )}
        </div>
      </div>
    </li>
  )
}

export default async function ProgramPage() {
  await resolveGuest()
  const visibilityMap = await getStaticItemVisibilityMap()
  if (!(await isStaticItemVisibleNow('program', visibilityMap))) notFound()

  const items = (await getProgramItems()) as ProgramRow[] | null

  const safe = items ?? []
  const childrenByParent = new Map<string, ProgramRow[]>()
  for (const item of safe) {
    if (item.parent_id) {
      const arr = childrenByParent.get(item.parent_id) ?? []
      arr.push(item)
      childrenByParent.set(item.parent_id, arr)
    }
  }
  const topLevel = safe.filter((i) => !i.parent_id)

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Program</h1>
      {topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground">Programmet er ikke klar endnu.</p>
      ) : (
        <ul className="space-y-3">
          {topLevel.map((item) => {
            const children = childrenByParent.get(item.id) ?? []
            return (
              <li key={item.id}>
                <ul className="space-y-2">
                  <ProgramItemRow item={item} />
                  {children.length > 0 && (
                    <ul className="space-y-2 mt-2">
                      {children.map((child) => (
                        <ProgramItemRow key={child.id} item={child} indented />
                      ))}
                    </ul>
                  )}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
