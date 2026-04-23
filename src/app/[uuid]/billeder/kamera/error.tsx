'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function KameraError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')
  const params = useParams<{ uuid: string }>()
  const uuid = params?.uuid

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
      <h1 className="text-xl font-semibold">{t('cameraFailed')}</h1>
      <p className="text-sm text-white/70">{t('tryAgainLater')}</p>
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-md bg-white px-4 py-2 text-sm text-black"
          onClick={reset}
        >
          {t('tryAgain')}
        </button>
        {uuid ? (
          <Link
            href={`/${uuid}/billeder`}
            className="rounded-md border border-white/40 px-4 py-2 text-sm text-white"
          >
            {t('backToPhotos')}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
