import { getTranslations } from 'next-intl/server'

import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('admin.nav')

  const items: { href: string; label: string }[] = [
    { href: '/admin', label: t('dashboard') },
    { href: '/admin/deltagere', label: t('guests') },
    { href: '/admin/information', label: t('information') },
    { href: '/admin/program', label: t('program') },
    { href: '/admin/indslag', label: t('performances') },
    { href: '/admin/opgaver', label: t('tasks') },
    { href: '/admin/sider', label: t('pages') },
    { href: '/admin/billeder', label: t('photos') },
    { href: '/admin/minder', label: t('memories') },
    { href: '/admin/galleri', label: t('gallery') },
    { href: '/admin/indstillinger', label: t('settings') },
  ]

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
