'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload } from 'lucide-react'
import { createEvent, updateEvent, uploadMapImage } from '@/lib/actions/information'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EventFormData {
  name: string
  description?: string
  start_time?: string
  address?: string
  google_maps_embed?: string
  map_image_url?: string
  map_image_description?: string
}

interface Props {
  eventId?: string
  initialData?: Partial<EventFormData>
  onDone: () => void
}

export function EventForm({ eventId, initialData, onDone }: Props) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [startTime, setStartTime] = useState(
    initialData?.start_time
      ? new Date(initialData.start_time).toISOString().slice(0, 16)
      : ''
  )
  const [address, setAddress] = useState(initialData?.address ?? '')
  const [googleMapsEmbed, setGoogleMapsEmbed] = useState(initialData?.google_maps_embed ?? '')
  const [mapImageUrl, setMapImageUrl] = useState(initialData?.map_image_url ?? '')
  const [mapImageDescription, setMapImageDescription] = useState(initialData?.map_image_description ?? '')
  const [mapUploadError, setMapUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const mapFileRef = useRef<HTMLInputElement>(null)

  async function handleMapUpload(file: File) {
    setMapUploadError(null)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const publicUrl = await uploadMapImage(formData)
      setMapImageUrl(publicUrl)
    } catch (err) {
      setMapUploadError(`Upload fejlede: ${err instanceof Error ? err.message : 'Ukendt fejl'}`)
    } finally {
      setIsUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setFormError(null)
    const payload: EventFormData = {
      name: name.trim(),
      description: description.trim() || undefined,
      start_time: startTime || undefined,
      address: address.trim() || undefined,
      google_maps_embed: googleMapsEmbed.trim() || undefined,
      map_image_url: mapImageUrl || undefined,
      map_image_description: mapImageDescription.trim() || undefined,
    }

    startTransition(async () => {
      try {
        if (eventId) {
          await updateEvent(eventId, payload)
        } else {
          await createEvent(payload)
        }
        onDone()
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
      <div className="space-y-1">
        <Label htmlFor="event-name">Navn *</Label>
        <Input
          id="event-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Begivenhedens navn"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="event-description">Beskrivelse</Label>
        <Input
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kort beskrivelse"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="event-start-time">Starttid</Label>
        <Input
          id="event-start-time"
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="event-address">Adresse</Label>
        <Input
          id="event-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Vejnavn 1, 1234 By"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="event-maps-embed">Google Maps embed-kode</Label>
        <textarea
          id="event-maps-embed"
          value={googleMapsEmbed}
          onChange={(e) => setGoogleMapsEmbed(e.target.value)}
          placeholder='Indsæt <iframe ...> kode fra Google Maps'
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <Label>Kortbillede</Label>
        {mapImageUrl && (
          <p className="text-xs text-muted-foreground">
            Nuværende:{' '}
            <a href={mapImageUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Se billede
            </a>
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={mapFileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleMapUpload(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => mapFileRef.current?.click()}
          >
            <Upload className="size-4" />
            {isUploading
              ? 'Uploader...'
              : mapImageUrl
                ? 'Skift billede'
                : 'Upload billede'}
          </Button>
        </div>
        {mapUploadError && <p className="text-xs text-destructive">{mapUploadError}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="event-map-desc">Kortbillede beskrivelse</Label>
        <Input
          id="event-map-desc"
          value={mapImageDescription}
          onChange={(e) => setMapImageDescription(e.target.value)}
          placeholder="Alt-tekst til kortbilledet"
        />
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || isUploading}>
          {isPending ? 'Gemmer...' : eventId ? 'Opdater' : 'Opret'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Annuller
        </Button>
      </div>
    </form>
  )
}
