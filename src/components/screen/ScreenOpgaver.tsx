import * as React from 'react'

/**
 * Screen-side task list view, shown as a fullscreen rotation slot when an
 * admin assigns the `tasks` static key to a screen.
 *
 * Pure presentational, read-only (no swap or assign actions). Receives the
 * tasks list with assignment join already resolved.
 */
interface AssignedGuest {
  id: string
  name: string
  type: string
}

interface TaskAssignment {
  id: string
  guest_id: string
  is_owner: boolean
  guests: AssignedGuest | AssignedGuest[] | null
}

export interface ScreenOpgaverTask {
  id: string
  title: string
  description: string | null
  location: string | null
  due_time: string | null
  max_persons: number | null
  task_assignments: TaskAssignment[]
}

interface Props {
  tasks: ScreenOpgaverTask[]
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('da-DK', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function assigneeNames(assignments: TaskAssignment[]): string[] {
  const names: string[] = []
  for (const a of assignments) {
    if (!a.guests) continue
    const guest = Array.isArray(a.guests) ? a.guests[0] : a.guests
    if (guest && guest.type !== 'screen') names.push(guest.name)
  }
  return names
}

export function ScreenOpgaver({ tasks }: Props) {
  return (
    <div className="absolute inset-0 overflow-auto bg-slate-950 text-white">
      <div className="flex min-h-full flex-col px-8 py-8">
        <h1 className="mb-8 text-center text-7xl font-bold tracking-tight">
          Opgaver
        </h1>
        {tasks.length === 0 ? (
          <p className="text-center text-2xl text-slate-400">
            Ingen opgaver endnu
          </p>
        ) : (
          <ul className="columns-2 gap-8">
            {tasks.map((task) => {
              const time = formatTime(task.due_time)
              const names = assigneeNames(task.task_assignments)
              return (
                <li
                  key={task.id}
                  className="mb-6 break-inside-avoid rounded-2xl border border-white/10 bg-white/5 px-6 py-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {task.title}
                    </h2>
                    {time ? (
                      <span className="rounded-full bg-white/10 px-4 py-1 text-lg tabular-nums text-slate-100">
                        {time}
                      </span>
                    ) : null}
                  </div>
                  {task.location ? (
                    <p className="mt-2 text-xl text-slate-300">
                      {task.location}
                    </p>
                  ) : null}
                  {names.length > 0 ? (
                    <p className="mt-4 text-xl text-slate-200">
                      <span className="text-slate-400">Tildelt: </span>
                      {names.join(', ')}
                    </p>
                  ) : (
                    <p className="mt-4 text-xl italic text-slate-400">
                      Ingen tildelt
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
