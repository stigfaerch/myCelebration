'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { acceptSwapRequest } from '@/lib/actions/guest/tasks'
import type { IncomingSwapRequest } from '@/lib/actions/guest/tasks'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface Props {
  initialIncoming: IncomingSwapRequest[]
  taskTitleMap: Record<string, string>
}

const REFRESH_DEBOUNCE_MS = 500

export function IncomingSwapList({ initialIncoming, taskTitleMap }: Props) {
  const router = useRouter()
  const instanceId = React.useId()

  // Server-sent incoming list is the source of truth. Local state holds only
  // the post-accept optimistic removal; router.refresh() lands fresh data and
  // the derive-during-render assignment below adopts it.
  const [incoming, setIncoming] = React.useState(initialIncoming)
  const [prevIncoming, setPrevIncoming] = React.useState(initialIncoming)
  const [selected, setSelected] = React.useState<Record<string, string>>({})
  const [errorBySwap, setErrorBySwap] = React.useState<Record<string, string>>({})
  const [pendingSwap, setPendingSwap] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  if (prevIncoming !== initialIncoming) {
    setPrevIncoming(initialIncoming)
    setIncoming(initialIncoming)
  }

  // Subscribe to swap_requests changes. Realtime does not support
  // array-overlap filters, so broadcast-then-refresh and let the server
  // re-filter via getIncomingSwapRequests(). Debounce router.refresh() to
  // absorb bursts and prevent per-event re-render storms.
  React.useEffect(() => {
    const client = getSupabaseBrowserClient()
    let refreshTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        router.refresh()
      }, REFRESH_DEBOUNCE_MS)
    }

    // Unique topic per mount — avoids singleton-channel reuse pitfall
    // where React Strict Mode's double-effect tears down a still-live channel.
    const topic = `swap_requests:incoming:${instanceId}`
    const channel = client
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swap_requests',
        },
        () => {
          scheduleRefresh()
        }
      )
      .subscribe()

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      void client.removeChannel(channel)
    }
  }, [router, instanceId])

  function handleAccept(swap: IncomingSwapRequest) {
    const accepterTaskId =
      swap.my_matching_task_ids.length === 1
        ? swap.my_matching_task_ids[0]
        : selected[swap.id]
    if (!accepterTaskId) {
      setErrorBySwap((prev) => ({ ...prev, [swap.id]: 'Vælg en opgave at bytte med' }))
      return
    }

    setErrorBySwap((prev) => {
      const next = { ...prev }
      delete next[swap.id]
      return next
    })
    setPendingSwap(swap.id)

    startTransition(async () => {
      try {
        await acceptSwapRequest(swap.id, accepterTaskId)
        // Optimistic removal — router.refresh() will land SSR truth shortly.
        setIncoming((prev) => prev.filter((s) => s.id !== swap.id))
        setPendingSwap(null)
        router.refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Kunne ikke acceptere bytte'
        setErrorBySwap((prev) => ({ ...prev, [swap.id]: msg }))
        setPendingSwap(null)
      }
    })
  }

  if (incoming.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Indkommende bytte-forespørgsler</h2>
      <ul className="space-y-3">
        {incoming.map((swap) => {
          const multi = swap.my_matching_task_ids.length > 1
          const chosen = selected[swap.id] ?? ''
          const err = errorBySwap[swap.id]
          const disabled = isPending && pendingSwap === swap.id

          return (
            <li key={swap.id} className="rounded-lg border p-3 space-y-2">
              <p className="text-sm">
                <span className="font-semibold">{swap.requester_guest_name}</span>{' '}
                vil bytte{' '}
                <span className="font-semibold">{swap.requester_task_title}</span>{' '}
                til en af dine opgaver
              </p>

              {multi ? (
                <div className="space-y-1">
                  <label
                    htmlFor={`accepter-task-${swap.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Vælg opgave du giver fra dig:
                  </label>
                  <select
                    id={`accepter-task-${swap.id}`}
                    value={chosen}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [swap.id]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm"
                    disabled={disabled}
                  >
                    <option value="">— Vælg —</option>
                    {swap.my_matching_task_ids.map((tid) => (
                      <option key={tid} value={tid}>
                        {taskTitleMap[tid] ?? tid}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Du bytter med:{' '}
                  <span className="font-medium">
                    {taskTitleMap[swap.my_matching_task_ids[0]] ??
                      swap.my_matching_task_ids[0]}
                  </span>
                </p>
              )}

              <Button
                type="button"
                size="sm"
                onClick={() => handleAccept(swap)}
                disabled={disabled}
              >
                {disabled ? 'Accepterer…' : 'Acceptér bytte'}
              </Button>

              {err && <p className="text-sm text-destructive">{err}</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
