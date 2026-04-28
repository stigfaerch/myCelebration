'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Trash2, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getPhotos,
  togglePhotoActive,
  deletePhoto,
  type Photo,
} from '@/lib/actions/photos'
import { showOnPrimaryScreen, clearScreenOverride } from '@/lib/actions/screen'

export interface ActivePhotoOverride {
  screenId: string
  screenName: string
}

interface Props {
  initialPhotos: Photo[]
  activeOverrides?: ActivePhotoOverride[]
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('da-DK', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function PhotoManager({ initialPhotos, activeOverrides = [] }: Props) {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [filterAfter, setFilterAfter] = useState('')
  const [filterBefore, setFilterBefore] = useState('')
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  function applyFilters() {
    setActionError(null)
    startTransition(async () => {
      try {
        const filtered = await getPhotos({
          after: fromDatetimeLocal(filterAfter),
          before: fromDatetimeLocal(filterBefore),
        })
        setPhotos(filtered)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function clearFilters() {
    setFilterAfter('')
    setFilterBefore('')
    setActionError(null)
    startTransition(async () => {
      try {
        const all = await getPhotos()
        setPhotos(all)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleToggleActive(photo: Photo) {
    setActionError(null)
    const nextActive = !photo.is_active
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, is_active: nextActive } : p))
    )
    startTransition(async () => {
      try {
        await togglePhotoActive(photo.id, nextActive)
      } catch (err) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id ? { ...p, is_active: photo.is_active } : p
          )
        )
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleDelete(photo: Photo) {
    const guestName = photo.guests?.name ?? 'gæst'
    if (!window.confirm(`Slet billede fra ${guestName}? Dette kan ikke fortrydes.`)) return
    setActionError(null)
    startTransition(async () => {
      try {
        await deletePhoto(photo.id)
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleShowOnScreen(photo: Photo) {
    setActionError(null)
    startTransition(async () => {
      try {
        await showOnPrimaryScreen('photo', photo.id)
        router.refresh()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleClearOverride(screenId: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await clearScreenOverride(screenId)
        router.refresh()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {activeOverrides.length > 0 && (
        <div className="space-y-2">
          {activeOverrides.map((override) => (
            <div
              key={override.screenId}
              className="rounded-md border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3"
            >
              <p className="text-sm text-amber-900">
                Skærm <strong>{override.screenName}</strong> viser et billede —
                skærm-rotationen er sat på pause.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleClearOverride(override.screenId)}
                disabled={isPending}
              >
                Tilbage til skærm-rotation
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
        <div className="grid gap-1">
          <Label htmlFor="photos-after">Efter</Label>
          <Input
            id="photos-after"
            type="datetime-local"
            value={filterAfter}
            onChange={(e) => setFilterAfter(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="photos-before">Før</Label>
          <Input
            id="photos-before"
            type="datetime-local"
            value={filterBefore}
            onChange={(e) => setFilterBefore(e.target.value)}
          />
        </div>
        <Button type="button" size="sm" onClick={applyFilters} disabled={isPending}>
          Filtrér
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearFilters}
          disabled={isPending}
        >
          Nulstil
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ingen billeder endnu. Billeder uploades af gæster.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.id} className="rounded-md border overflow-hidden">
              <div className="aspect-video bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.storage_url}
                  alt={`Billede fra ${photo.guests?.name ?? 'ukendt gæst'}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {photo.guests?.name ?? 'Ukendt gæst'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(photo.taken_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      photo.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {photo.is_active ? 'Aktiv' : 'Deaktiveret'}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleShowOnScreen(photo)}
                    aria-label="Vis på skærm"
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleToggleActive(photo)}
                    aria-label={photo.is_active ? 'Deaktivér billede' : 'Aktivér billede'}
                  >
                    {photo.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(photo)}
                    aria-label="Slet billede"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
