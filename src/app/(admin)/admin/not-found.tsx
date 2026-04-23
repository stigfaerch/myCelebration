import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function AdminNotFound() {
  const t = await getTranslations('errors')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t('adminNotFound')}</h1>
      <Link href="/admin" className="text-sm underline">
        {t('backToAdmin')}
      </Link>
    </div>
  )
}
