import * as React from 'react'
import { BottomMenu } from './BottomMenu'
import { cn } from '@/lib/utils'

interface GuestLayoutShellProps {
  children: React.ReactNode
  guestName: string
  uuid: string
  showBottomMenu?: boolean
}

export function GuestLayoutShell({
  children,
  guestName,
  uuid,
  showBottomMenu = true,
}: GuestLayoutShellProps) {
  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
      <header className="border-b px-4 py-3 shrink-0">
        <span className="text-sm font-medium">{guestName}</span>
      </header>
      <main className={cn('flex-1 overflow-auto', showBottomMenu && 'pb-16')}>
        {children}
      </main>
      {showBottomMenu && <BottomMenu uuid={uuid} />}
    </div>
  )
}
