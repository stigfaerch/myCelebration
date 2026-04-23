import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { EventMapDisplay } from '@/components/guest/EventMapDisplay'

export default async function HvorPage() {
  await resolveGuest()
  const { data: events, error } = await supabaseServer
    .from('events')
    .select('*, event_locations(id, title, description)')
    .order('sort_order')

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Hvor</h1>
      {error ? (
        <p className="text-sm text-destructive">Kunne ikke indlæse begivenheder.</p>
      ) : !events || events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen begivenheder endnu.</p>
      ) : (
        events.map((event: any) => (
          <EventMapDisplay
            key={event.id}
            event={{
              name: event.name,
              address: event.address ?? null,
              google_maps_embed: event.google_maps_embed ?? null,
              map_image_url: event.map_image_url ?? null,
              map_image_description: event.map_image_description ?? null,
              locations: event.event_locations ?? [],
            }}
          />
        ))
      )}
    </div>
  )
}
