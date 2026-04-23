'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t('adminError')}</h1>
      <p className="text-sm text-muted-foreground">{t('tryAgainLater')}</p>
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={reset}
        >
          {t('tryAgain')}
        </button>
        <Link
          href="/admin"
          className="rounded-md border px-4 py-2 text-sm"
        >
          {t('backToAdmin')}
        </Link>
      </div>
    </div>
  )
}
