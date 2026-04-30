'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu as MenuIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ADMIN_NAV_META, type AdminNavKey } from '@/lib/admin/nav'

interface NavItem {
  href: string
  label: string
  /**
   * Stable key — the client looks up the matching lucide icon via
   * ADMIN_NAV_META. We don't pass the icon component itself because
   * React component references are not serializable across the
   * server/client boundary.
   */
  key: AdminNavKey
}

interface AdminNavProps {
  items: NavItem[]
  adminLabel: string
  openMenuLabel: string
}

export function AdminNav({ items, adminLabel, openMenuLabel }: AdminNavProps) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Close the sheet whenever the route changes (e.g. after a nav item click).
  React.useEffect(() => {
    setSheetOpen(false)
  }, [pathname])

  const navList = (
    <nav className="p-2 space-y-1">
      {items.map(({ href, label, key }) => {
        const Icon = ADMIN_NAV_META[key].icon
        const active =
          href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
        return (
          <Link
            key={key}
            href={href}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
              active ? 'bg-accent text-accent-foreground font-medium' : ''
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar — visible at md and up */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:bg-background">
        <div className="p-4 border-b">
          <span className="font-semibold text-sm">{adminLabel}</span>
        </div>
        {navList}
      </aside>

      {/* Mobile top bar — visible below md */}
      <header className="md:hidden flex items-center gap-2 border-b bg-background p-3">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={openMenuLabel}
              />
            }
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SheetHeader>
              <SheetTitle>{adminLabel}</SheetTitle>
            </SheetHeader>
            {navList}
          </SheetContent>
        </Sheet>
        <span className="font-semibold text-sm">{adminLabel}</span>
      </header>
    </>
  )
}
