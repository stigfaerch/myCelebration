'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Circle } from 'lucide-react'
import { createPhotoFromFile } from '@/lib/actions/guest/photos'

interface Props {
  uuid: string
}

type CameraError =
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'upload'; message: string }

export function Camera({ uuid }: Props) {
  const router = useRouter()
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [ready, setReady] = React.useState(false)
  const [error, setError] = React.useState<CameraError | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [showSavedToast, setShowSavedToast] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError({ kind: 'unavailable' })
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setReady(true)
      } catch (err) {
        if (cancelled) return
        const name = (err as { name?: string })?.name
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setError({ kind: 'permission' })
        } else {
          setError({ kind: 'unavailable' })
        }
      }
    }

    start()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  function handleCapture() {
    const video = videoRef.current
    if (!video || !ready) return

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError({ kind: 'upload', message: 'Kunne ikke optage billedet' })
          return
        }
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
        const formData = new FormData()
        formData.append('file', file)

        startTransition(async () => {
          try {
            await createPhotoFromFile(formData)
            setShowSavedToast(true)
            setTimeout(() => {
              router.push(`/${uuid}/billeder`)
            }, 600)
          } catch (err) {
            setError({
              kind: 'upload',
              message: err instanceof Error ? err.message : 'Upload fejlede',
            })
          }
        })
      },
      'image/jpeg',
      0.85
    )
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 p-3">
        <Link
          href={`/${uuid}/billeder`}
          aria-label="Tilbage"
          className="inline-flex size-10 items-center justify-center rounded-full bg-black/50 text-white"
        >
          <ArrowLeft className="size-5" />
        </Link>
      </div>

      {/* Capture button */}
      {ready && !error && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-10">
          <button
            type="button"
            onClick={handleCapture}
            disabled={isPending}
            aria-label="Tag billede"
            className="relative flex size-20 items-center justify-center rounded-full bg-white shadow-lg disabled:opacity-50"
          >
            <Circle className="size-16 text-white fill-white stroke-black/30" />
          </button>
        </div>
      )}

      {/* Loading */}
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <p className="text-sm">Starter kamera…</p>
        </div>
      )}

      {/* Error states */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
          {error.kind === 'permission' && (
            <p className="text-base">
              Adgang til kameraet blev afvist. Aktivér kameraadgang i
              browserens indstillinger for at tage billeder.
            </p>
          )}
          {error.kind === 'unavailable' && (
            <p className="text-base">
              Kameraet er ikke tilgængeligt på denne enhed.
            </p>
          )}
          {error.kind === 'upload' && <p className="text-base">{error.message}</p>}
          <Link
            href={`/${uuid}/billeder`}
            className="rounded-md bg-white px-4 py-2 text-sm text-black"
          >
            Tilbage
          </Link>
        </div>
      )}

      {/* Saved toast */}
      {showSavedToast && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/80 px-6 py-3 text-white">Gemt!</div>
        </div>
      )}
    </div>
  )
}
