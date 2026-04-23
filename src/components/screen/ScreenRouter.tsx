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
  const instanceId = React.useId()

  React.useEffect(() => {
    const client = getSupabaseBrowserClient()
    // Unique topic per mount: Supabase's realtime-js returns an existing
    // channel when the same topic is re-used on the same client, which under
    // React 19 Strict Mode's intentional double-effect (and any remount) makes
    // the first cleanup tear down the still-mounted second subscription.
    const topic = `screen_state:${guestId}:${instanceId}`
    const channel = client
      .channel(topic)
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
  }, [guestId, router, instanceId])

  return <>{children}</>
}
