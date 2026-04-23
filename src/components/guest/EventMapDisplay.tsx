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

export function EventMapDisplay({ event }: EventMapDisplayProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{event.name}</h2>
        {event.address ? (
          <p className="text-sm text-muted-foreground">{event.address}</p>
        ) : null}
      </div>

      {event.google_maps_embed ? (
        <div
          className="aspect-video w-full overflow-hidden rounded border [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
          dangerouslySetInnerHTML={{ __html: event.google_maps_embed }}
        />
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
