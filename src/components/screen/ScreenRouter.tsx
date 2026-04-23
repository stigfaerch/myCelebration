'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface Props {
  guestId: string
  children: React.ReactNode
}

/**
 * Client-side realtime subscriber for screen-type guests.
 * Listens to `screen_state` changes for this guest and triggers
 * `router.refresh()` to re-render the server component tree with
 * fresh override data. Renders its children unchanged.
 */
export function ScreenRouter({ guestId, children }: Props) {
  const router = useRouter()

  React.useEffect(() => {
    const client = getSupabaseBrowserClient()
    const channel = client
      .channel(`screen_state:${guestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_state',
          filter: `guest_id=eq.${guestId}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [guestId, router])

  return <>{children}</>
}
