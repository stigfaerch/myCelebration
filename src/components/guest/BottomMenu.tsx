'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  CheckSquare,
  Image as ImageIcon,
  Menu as MenuIcon,
  MapPin,
  Users,
  BookHeart,
  LayoutGrid,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface BottomMenuProps {
  uuid: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function BottomMenu({ uuid }: BottomMenuProps) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const primary: NavItem[] = [
    { href: `/${uuid}`, label: 'Hjem', icon: Home },
    { href: `/${uuid}/opgaver`, label: 'Opgaver', icon: CheckSquare },
    { href: `/${uuid}/billeder`, label: 'Billeder', icon: ImageIcon },
  ]

  const secondary: NavItem[] = [
    { href: `/${uuid}/hvor`, label: 'Hvor', icon: MapPin },
    { href: `/${uuid}/deltagere`, label: 'Deltagere', icon: Users },
    { href: `/${uuid}/minder`, label: 'Minder', icon: BookHeart },
    { href: `/${uuid}/galleri`, label: 'Galleri', icon: LayoutGrid },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] border-t bg-background"
      aria-label="Primær navigation"
    >
      <div className="flex items-center justify-around py-2">
        {primary.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 p-2 text-xs',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                aria-label="Åbn menu"
                className="flex flex-col items-center gap-0.5 p-2 text-xs text-muted-foreground"
              />
            }
          >
            <MenuIcon className="size-5" />
            <span>Menu</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <ul className="px-2 pb-4">
              {secondary.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
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
