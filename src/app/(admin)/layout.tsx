import { getTranslations } from 'next-intl/server'

import { AdminNav } from '@/components/admin/AdminNav'
import { ADMIN_NAV_META } from '@/lib/admin/nav'
import { getAdminNavOrder } from '@/lib/actions/settings'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [t, order] = await Promise.all([
    getTranslations('admin.nav'),
    getAdminNavOrder(),
  ])

  const items = order.map((key) => {
    const meta = ADMIN_NAV_META[key]
    return { key, href: meta.href, label: t(meta.labelKey) }
  })

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav
        items={items}
        adminLabel={t('adminLabel')}
        openMenuLabel={t('openMenu')}
      />
      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
