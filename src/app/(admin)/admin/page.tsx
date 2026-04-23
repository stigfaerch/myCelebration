import { getTranslations } from 'next-intl/server'

export default async function AdminDashboardPage() {
  const t = await getTranslations('admin.dashboardPage')
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-2">{t('title')}</h1>
      <p className="text-muted-foreground">{t('subtitle')}</p>
    </div>
  )
}
