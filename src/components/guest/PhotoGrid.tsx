'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera as CameraIcon, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteMyPhoto, type Photo } from '@/lib/actions/guest/photos'

interface Props {
  initialPhotos: Photo[]
  uuid: string
}

export function PhotoGrid({ initialPhotos, uuid }: Props) {
  const router = useRouter()
  const [photos, setPhotos] = React.useState<Photo[]>(initialPhotos)
  const [lightboxId, setLightboxId] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setPhotos(initialPhotos)
  }, [initialPhotos])

  const lightboxPhoto = React.useMemo(
    () => photos.find((p) => p.id === lightboxId) ?? null,
    [photos, lightboxId]
  )

  function handleDelete(photo: Photo) {
    if (!window.confirm('Slet dette billede? Dette kan ikke fortrydes.')) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteMyPhoto(photo.id)
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
        setLightboxId(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunne ikke slette billedet')
      }
    })
  }

  if (photos.length === 0) {
    return (
      <div className="relative">
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <p className="text-sm text-muted-foreground">
            Du har ikke taget nogen billeder endnu.
          </p>
          <Button render={<Link href={`/${uuid}/billeder/kamera`} />}>
            <CameraIcon className="size-4" />
            Tag billede
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}

      <div className="grid grid-cols-3 gap-1">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightboxId(photo.id)}
            className="relative aspect-square overflow-hidden rounded bg-muted"
            aria-label="Vis billede i stor størrelse"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.storage_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* FAB — camera */}
      <Link
        href={`/${uuid}/billeder/kamera`}
        aria-label="Tag billede"
        className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <CameraIcon className="size-6" />
      </Link>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between p-3 text-white">
            <button
              type="button"
              onClick={() => setLightboxId(null)}
              aria-label="Luk"
              className="p-2"
            >
              <X className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(lightboxPhoto)}
              disabled={isPending}
              aria-label="Slet billede"
              className="flex items-center gap-1 rounded-md bg-destructive/80 px-3 py-2 text-sm disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              {isPending ? 'Sletter…' : 'Slet'}
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4 overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhoto.storage_url}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
