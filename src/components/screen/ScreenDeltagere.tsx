import * as React from 'react'

/**
 * Screen-side guest list view, shown as a fullscreen rotation slot when an
 * admin assigns the `deltagere` static key to a screen.
 *
 * Pure presentational — receives the already-filtered guest list (admins'
 * non-screen rows) as a prop. Hydration happens server-side in
 * `src/app/[uuid]/page.tsx` so the cycler can stay a thin client component.
 */
interface GuestRow {
  id: string
  name: string
  type: string
  relation: string | null
}

interface Props {
  guests: GuestRow[]
}

const TYPE_LABELS: Record<string, string> = {
  main_person: 'Hovedperson',
  family: 'Familie',
  friend: 'Ven',
}

export function ScreenDeltagere({ guests }: Props) {
  return (
    <div className="absolute inset-0 overflow-auto bg-slate-950 text-white">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-12 py-16">
        <h1 className="mb-12 text-center text-7xl font-bold tracking-tight">
          Deltagere
        </h1>
        {guests.length === 0 ? (
          <p className="text-center text-2xl text-slate-400">
            Ingen deltagere endnu
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {guests.map((guest) => {
              const badge = TYPE_LABELS[guest.type]
              return (
                <li
                  key={guest.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5"
                >
                  <p className="truncate text-3xl font-semibold">
                    {guest.name}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-lg text-slate-300">
                    {guest.relation ? (
                      <span className="truncate">{guest.relation}</span>
                    ) : null}
                    {badge ? (
                      <span className="rounded-full bg-white/10 px-3 py-0.5 text-sm uppercase tracking-wide text-slate-200">
                        {badge}
                      </span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
