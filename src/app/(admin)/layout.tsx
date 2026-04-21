export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-background">
        <div className="p-4 border-b">
          <span className="font-semibold text-sm">Admin</span>
        </div>
        <nav className="p-2 space-y-1">
          {[
            { href: '/admin', label: 'Dashboard' },
            { href: '/admin/deltagere', label: 'Deltagere' },
            { href: '/admin/information', label: 'Information' },
            { href: '/admin/program', label: 'Program' },
            { href: '/admin/indslag', label: 'Indslag' },
            { href: '/admin/opgaver', label: 'Opgaver' },
            { href: '/admin/sider', label: 'Sider' },
            { href: '/admin/billeder', label: 'Billeder' },
            { href: '/admin/minder', label: 'Minder' },
            { href: '/admin/galleri', label: 'Galleri' },
            { href: '/admin/indstillinger', label: 'Indstillinger' },
          ].map((item) => (
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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
