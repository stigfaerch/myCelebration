'use client'
import { useState, useTransition } from 'react'
import { EventForm } from '@/components/admin/EventForm'
import { deleteEvent, createEventLocation, deleteEventLocation } from '@/lib/actions/information'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronRight, Trash2, Pencil, Plus } from 'lucide-react'

interface EventLocation {
  id: string
  event_id: string
  title: string
  description?: string | null
}

interface Event {
  id: string
  name: string
  description?: string | null
  start_time?: string | null
  address?: string | null
  google_maps_embed?: string | null
  map_image_url?: string | null
  map_image_description?: string | null
  sort_order?: number | null
  event_locations: EventLocation[]
}

interface Props {
  events: Event[]
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('da-DK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function AddLocationForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await createEventLocation(eventId, {
          title: title.trim(),
          description: description.trim() || undefined,
        })
        onDone()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded border p-3">
      <div className="space-y-1">
        <Label htmlFor={`loc-title-${eventId}`}>Titel *</Label>
        <Input
          id={`loc-title-${eventId}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lokationens navn"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`loc-desc-${eventId}`}>Beskrivelse</Label>
        <Input
          id={`loc-desc-${eventId}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Valgfri beskrivelse"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Tilføjer...' : 'Tilføj'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Annuller
        </Button>
      </div>
    </form>
  )
}

function EventRow({ event }: { event: Event }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [addingLocation, setAddingLocation] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDeleteEvent() {
    if (!confirm(`Slet begivenheden "${event.name}"? Dette kan ikke fortrydes.`)) return
    setDeleteError(null)
    startTransition(async () => {
      try {
        await deleteEvent(event.id)
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleDeleteLocation(locationId: string, locationTitle: string) {
    if (!confirm(`Slet lokationen "${locationTitle}"?`)) return
    startTransition(async () => {
      await deleteEventLocation(locationId)
    })
  }

  if (editing) {
    return (
      <li>
        <EventForm
          eventId={event.id}
          initialData={{
            name: event.name,
            description: event.description ?? undefined,
            start_time: event.start_time ?? undefined,
            address: event.address ?? undefined,
            google_maps_embed: event.google_maps_embed ?? undefined,
            map_image_url: event.map_image_url ?? undefined,
            map_image_description: event.map_image_description ?? undefined,
          }}
          onDone={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="rounded-md border">
      <div className="flex items-center justify-between p-3">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{event.name}</span>
          {event.start_time && (
            <span className="text-xs text-muted-foreground">{formatDateTime(event.start_time)}</span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleDeleteEvent}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {deleteError && (
        <p className="px-3 pb-2 text-xs text-destructive">{deleteError}</p>
      )}

      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-3">
          {event.address && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Adresse:</span> {event.address}
            </p>
          )}

          <div>
            <h4 className="mb-2 text-sm font-medium">Lokationer</h4>
            {event.event_locations.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen lokationer endnu.</p>
            ) : (
              <ul className="space-y-1">
                {event.event_locations.map((loc) => (
                  <li key={loc.id} className="flex items-center justify-between rounded border px-2 py-1">
                    <div>
                      <span className="text-sm font-medium">{loc.title}</span>
                      {loc.description && (
                        <span className="ml-2 text-xs text-muted-foreground">{loc.description}</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDeleteLocation(loc.id, loc.title)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {addingLocation ? (
              <AddLocationForm eventId={event.id} onDone={() => setAddingLocation(false)} />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setAddingLocation(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Tilføj lokation
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export function EventsManager({ events }: Props) {
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen begivenheder endnu.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      )}

      {creating ? (
        <EventForm onDone={() => setCreating(false)} />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCreating(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Ny begivenhed
        </Button>
      )}
    </div>
  )
}
