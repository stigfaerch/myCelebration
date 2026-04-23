import { getTranslations } from 'next-intl/server'

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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-background">
        <div className="p-4 border-b">
          <span className="font-semibold text-sm">{t('adminLabel')}</span>
        </div>
        <nav className="p-2 space-y-1">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
