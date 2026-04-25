import * as React from 'react'

/**
 * Screen-side events / "Hvor" view, shown as a fullscreen rotation slot when
 * an admin assigns the `hvor` static key to a screen.
 *
 * Pure presentational — receives the events list (already joined with
 * `event_locations`) as a prop. The Google Maps iframe is embedded inline at
 * fullscreen scale rather than wrapped in the mobile-only bottom-sheet
 * MapOverlay used on `/[uuid]/hvor`.
 */
interface EventLocation {
  id: string
  title: string
  description: string | null
}

export interface ScreenHvorEvent {
  id: string
  name: string
  description: string | null
  start_time: string | null
  address: string | null
  google_maps_embed: string | null
  map_image_url: string | null
  map_image_description: string | null
  locations: EventLocation[]
}

interface Props {
  events: ScreenHvorEvent[]
}

// Reuse the same defense-in-depth filter used by EventMapDisplay: only
// permit Google-hosted /maps/embed sources, reject anything else (block
// arbitrary HTML or JS injection via admin-supplied embed snippets).
function extractMapsEmbedSrc(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const srcMatch =
    /src\s*=\s*"([^"]+)"/i.exec(trimmed) ?? /src\s*=\s*'([^']+)'/i.exec(trimmed)
  const candidate = srcMatch ? srcMatch[1] : trimmed
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:') return null
    if (url.hostname !== 'www.google.com' && url.hostname !== 'maps.google.com')
      return null
    const path = url.pathname
    if (!path.startsWith('/maps/embed') && !path.startsWith('/maps/d/embed'))
      return null
    return url.toString()
  } catch {
    return null
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('da-DK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function ScreenHvor({ events }: Props) {
  return (
    <div className="absolute inset-0 overflow-auto bg-slate-950 text-white">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col px-12 py-16">
        <h1 className="mb-10 text-center text-7xl font-bold tracking-tight">
          Hvor
        </h1>
        {events.length === 0 ? (
          <p className="text-center text-2xl text-slate-400">
            Ingen begivenheder endnu
          </p>
        ) : (
          <div className="space-y-12">
            {events.map((event) => {
              const safeMapsSrc = event.google_maps_embed
                ? extractMapsEmbedSrc(event.google_maps_embed)
                : null
              return (
                <section
                  key={event.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-10"
                >
                  <h2 className="text-5xl font-semibold tracking-tight">
                    {event.name}
                  </h2>
                  {event.start_time ? (
                    <p className="mt-3 text-2xl text-slate-300">
                      {formatDateTime(event.start_time)}
                    </p>
                  ) : null}
                  {event.address ? (
                    <p className="mt-1 text-2xl text-slate-300">
                      {event.address}
                    </p>
                  ) : null}
                  {event.description ? (
                    <p className="mt-6 whitespace-pre-line text-xl leading-relaxed text-slate-200">
                      {event.description}
                    </p>
                  ) : null}
                  {safeMapsSrc ? (
                    <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
                      <iframe
                        src={safeMapsSrc}
                        title={`Kort: ${event.name}`}
                        className="h-[480px] w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : null}
                  {event.locations.length > 0 ? (
                    <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                      {event.locations.map((loc) => (
                        <li
                          key={loc.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-5"
                        >
                          <p className="text-2xl font-semibold">{loc.title}</p>
                          {loc.description ? (
                            <p className="mt-1 text-lg text-slate-300">
                              {loc.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
