import * as React from 'react'

import { MapOverlay } from './MapOverlay'

interface EventLocation {
  id: string
  title: string
  description: string | null
}

interface EventMapDisplayProps {
  event: {
    name: string
    description: string | null
    start_time: string | null
    address: string | null
    google_maps_embed: string | null
    map_image_url: string | null
    map_image_description: string | null
    locations: EventLocation[]
  }
}

// Extract the iframe src from an admin-pasted Google Maps embed snippet, or
// accept a bare URL. Rejects any src that isn't a Google-hosted maps embed
// (/maps/embed for standard place embeds, /maps/d/embed for My Maps).
// This blocks arbitrary HTML/JS injection via admin-supplied embed HTML.
function extractMapsEmbedSrc(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const srcMatch = /src\s*=\s*"([^"]+)"/i.exec(trimmed) ?? /src\s*=\s*'([^']+)'/i.exec(trimmed)
  const candidate = srcMatch ? srcMatch[1] : trimmed
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:') return null
    if (url.hostname !== 'www.google.com' && url.hostname !== 'maps.google.com') return null
    const path = url.pathname
    if (!path.startsWith('/maps/embed') && !path.startsWith('/maps/d/embed')) return null
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

export function EventMapDisplay({ event }: EventMapDisplayProps) {
  const safeMapsSrc = event.google_maps_embed ? extractMapsEmbedSrc(event.google_maps_embed) : null

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{event.name}</h2>
        {event.start_time ? (
          <p className="text-sm text-muted-foreground">
            {formatDateTime(event.start_time)}
          </p>
        ) : null}
        {event.address ? (
          <p className="text-sm text-muted-foreground">{event.address}</p>
        ) : null}
      </div>

      {event.description ? (
        <p className="text-sm whitespace-pre-line">{event.description}</p>
      ) : null}

      {safeMapsSrc ? (
        <div>
          <MapOverlay src={safeMapsSrc} eventName={event.name} />
        </div>
      ) : null}

      {event.map_image_url ? (
        <figure className="space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.map_image_url}
            alt={event.map_image_description ?? 'Kort over festlokalet'}
            className="w-full rounded"
          />
          {event.map_image_description ? (
            <figcaption className="text-xs text-muted-foreground">
              {event.map_image_description}
            </figcaption>
          ) : null}
        </figure>
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
