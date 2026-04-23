import * as React from 'react'

interface EventLocation {
  id: string
  title: string
  description: string | null
}

interface EventMapDisplayProps {
  event: {
    name: string
    address: string | null
    google_maps_embed: string | null
    map_image_url: string | null
    map_image_description: string | null
    locations: EventLocation[]
  }
}

// Extract the iframe src from an admin-pasted Google Maps embed snippet, or
// accept a bare URL. Rejects any src that isn't google.com/maps/embed — this
// blocks arbitrary HTML/JS injection via admin-supplied embed HTML.
function extractMapsEmbedSrc(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const srcMatch = /src\s*=\s*"([^"]+)"/i.exec(trimmed) ?? /src\s*=\s*'([^']+)'/i.exec(trimmed)
  const candidate = srcMatch ? srcMatch[1] : trimmed
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:') return null
    if (url.hostname !== 'www.google.com' && url.hostname !== 'maps.google.com') return null
    if (!url.pathname.startsWith('/maps/embed')) return null
    return url.toString()
  } catch {
    return null
  }
}

export function EventMapDisplay({ event }: EventMapDisplayProps) {
  const safeMapsSrc = event.google_maps_embed ? extractMapsEmbedSrc(event.google_maps_embed) : null

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{event.name}</h2>
        {event.address ? (
          <p className="text-sm text-muted-foreground">{event.address}</p>
        ) : null}
      </div>

      {safeMapsSrc ? (
        <div className="aspect-video w-full overflow-hidden rounded border">
          <iframe
            src={safeMapsSrc}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups"
            title={`Kort: ${event.name}`}
          />
        </div>
      ) : null}

      {event.map_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.map_image_url}
          alt={event.map_image_description ?? 'Kort over festlokalet'}
          className="w-full rounded"
        />
      ) : null}

      {event.locations.length > 0 ? (
        <ul className="space-y-2">
          {event.locations.map((loc) => (
            <li key={loc.id} className="rounded-md border p-3">
              <p className="text-sm font-medium">{loc.title}</p>
              {loc.description ? (
                <p className="text-sm text-muted-foreground">
                  {loc.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
