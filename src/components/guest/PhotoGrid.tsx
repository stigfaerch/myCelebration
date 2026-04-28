'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera as CameraIcon, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  confirmPhotoUpload,
  deleteMyPhoto,
  type Photo,
} from '@/lib/actions/guest/photos'
import { getR2UploadUrl } from '@/lib/storage/r2-presign'

interface Props {
  initialPhotos: Photo[]
  uuid: string
}

const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]

export function PhotoGrid({ initialPhotos, uuid }: Props) {
  const router = useRouter()
  const [photos, setPhotos] = React.useState<Photo[]>(initialPhotos)
  const [lightboxId, setLightboxId] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [isUploading, startUpload] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setPhotos(initialPhotos)
  }, [initialPhotos])

  const lightboxPhoto = React.useMemo(
    () => photos.find((p) => p.id === lightboxId) ?? null,
    [photos, lightboxId]
  )

  function handleUploadClick() {
    setError(null)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so picking the same file twice still fires
    if (!file) return
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError('Filtype ikke understøttet. Brug JPG, PNG, HEIC eller WebP.')
      return
    }
    setError(null)
    startUpload(async () => {
      try {
        const id = crypto.randomUUID()
        const { url, publicUrl } = await getR2UploadUrl({
          prefix: 'images',
          id,
          contentType: file.type,
        })
        const putResp = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })
        if (!putResp.ok) throw new Error('Upload fejlede')
        await confirmPhotoUpload({ publicUrl })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload fejlede')
      }
    })
  }

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
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <p className="text-sm text-muted-foreground">
            Du har ingen billeder endnu.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button
              nativeButton={false}
              render={<Link href={`/${uuid}/billeder/kamera`} />}
            >
              <CameraIcon className="size-4" />
              Tag billede
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              <Upload className="size-4" />
              {isUploading ? 'Uploader…' : 'Upload billede'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
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

      {/* FABs — upload (above) and camera (below) */}
      <button
        type="button"
        onClick={handleUploadClick}
        disabled={isUploading}
        aria-label={isUploading ? 'Uploader' : 'Upload billede'}
        className="fixed bottom-40 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg hover:bg-secondary/90 disabled:opacity-60"
      >
        <Upload className="size-6" />
      </button>
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
