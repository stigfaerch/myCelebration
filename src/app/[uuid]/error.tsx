'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function GuestError({
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
      <h1 className="text-xl font-semibold">{t('somethingWentWrong')}</h1>
      <p className="text-sm text-muted-foreground">{t('tryAgainLater')}</p>
      <button
        type="button"
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        onClick={reset}
      >
        {t('tryAgain')}
      </button>
    </div>
  )
}
