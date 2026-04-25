'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Home, Menu as MenuIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ICON_BY_KEY, type NavIconKey } from '@/lib/guest/navItems'

export interface BottomMenuItem {
  /** Stable React key. */
  key: string
  href: string
  /** i18n key under `guest.nav.*` for static items. */
  labelKey?: string
  /** Display title for dynamic admin pages. */
  pageTitle?: string
  iconKey: NavIconKey
}

interface BottomMenuProps {
  uuid: string
  /** Already filtered to visibility — no extra filtering needed here. */
  navItems: BottomMenuItem[]
}

interface ResolvedItem {
  key: string
  href: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

export function BottomMenu({ uuid, navItems }: BottomMenuProps) {
  const pathname = usePathname()
  const t = useTranslations('guest.nav')
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Resolve label + icon component for each item. Page items use the supplied
  // pageTitle directly (no i18n); static items look up their label by key.
  const resolved = React.useMemo<ResolvedItem[]>(
    () =>
      navItems.map((item) => ({
        key: item.key,
        href: item.href,
        label: item.labelKey ? t(item.labelKey) : (item.pageTitle ?? ''),
        Icon: ICON_BY_KEY[item.iconKey],
      })),
    [navItems, t]
  )

  const slot2 = resolved[0]
  const slot3 = resolved[1]
  const sheetItems = resolved.slice(2)

  const isActive = (href: string) => pathname === href

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] border-t bg-background"
      aria-label={t('primaryNavAria')}
    >
      <div className="flex items-center justify-around py-2">
        {/* Slot 1 — Hjem (fixed) */}
        <Link
          href={`/${uuid}`}
          aria-current={isActive(`/${uuid}`) ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center gap-0.5 p-2 text-xs',
            isActive(`/${uuid}`) ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <Home className="size-5" />
          <span>{t('home')}</span>
        </Link>

        {/* Slot 2 */}
        {slot2 && <PrimarySlot item={slot2} active={isActive(slot2.href)} />}

        {/* Slot 3 */}
        {slot3 && <PrimarySlot item={slot3} active={isActive(slot3.href)} />}

        {/* Slot 4 — Menu trigger (fixed) */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                aria-label={t('openMenuAria')}
                className="flex flex-col items-center gap-0.5 p-2 text-xs text-muted-foreground"
              />
            }
          >
            <MenuIcon className="size-5" />
            <span>{t('menu')}</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0">
            <SheetHeader>
              <SheetTitle>{t('menu')}</SheetTitle>
            </SheetHeader>
            <ul className="px-2 pb-4">
              {sheetItems.map((item) => {
                const Icon = item.Icon
                const active = isActive(item.href)
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-3 text-sm',
                        active
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent/60'
                      )}
                    >
                      <Icon className="size-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}

function PrimarySlot({ item, active }: { item: ResolvedItem; active: boolean }) {
  const Icon = item.Icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center gap-0.5 p-2 text-xs',
        active ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      <Icon className="size-5" />
      <span className="max-w-[80px] truncate">{item.label}</span>
    </Link>
  )
}
