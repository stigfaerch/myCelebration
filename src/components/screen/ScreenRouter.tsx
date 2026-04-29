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
 *
 * Subscribes to three tables:
 *   - `screen_state` filtered to this guest — picks up override changes
 *     (Vis på skærm / Tilbage til skærm-rotation, photo/memory single-render).
 *   - `gallery_config` (singleton, no filter) — picks up admin changes on
 *     `/admin/galleri` (interval, filter dates, source, display type, etc.)
 *     so screens currently in the gallery default render path re-render
 *     without a manual reload. The cycler/page-mode paths also re-render on
 *     this signal, which is acceptable noise (admin saves rarely).
 *   - `screen_page_assignments` filtered to this guest — picks up the FIRST
 *     INSERT into the cycler for this screen. Without this subscription on
 *     ScreenRouter, screens currently in gallery-default mode (zero
 *     assignments) wouldn't notice when admin assigns a page or static item:
 *     `ScreenPageCycle` only mounts when the cycler is already active and
 *     carries its own redundant subscription, but ScreenRouter is always
 *     mounted so it covers the empty→non-empty transition.
 *
 * All three subscriptions trigger `router.refresh()` to re-render the server
 * component tree. Children are passed through unchanged.
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
    const topic = `screen:${guestId}:${instanceId}`
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gallery_config',
          // Singleton table — no filter; any change refreshes all screens.
        },
        () => {
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_page_assignments',
          filter: `screen_guest_id=eq.${guestId}`,
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
