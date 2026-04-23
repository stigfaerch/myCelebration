import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('errors')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t('pageNotFound')}</h1>
      <Link href="/" className="text-sm underline">
        {t('goHome')}
      </Link>
    </div>
  )
}
