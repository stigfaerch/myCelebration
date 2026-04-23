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

export function IncomingSwapList({ initialIncoming, taskTitleMap }: Props) {
  const router = useRouter()

  // React 19 derive-during-render resync: if props change, adopt the new
  // server-sent list but retain the "accepted locally" ids so we don't
  // briefly re-show a row we just optimistically removed.
  const [incoming, setIncoming] = React.useState(initialIncoming)
  const [prevIncoming, setPrevIncoming] = React.useState(initialIncoming)
  const [accepted, setAccepted] = React.useState<Set<string>>(() => new Set())
  const [selected, setSelected] = React.useState<Record<string, string>>({})
  const [errorBySwap, setErrorBySwap] = React.useState<Record<string, string>>({})
  const [pendingSwap, setPendingSwap] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  if (prevIncoming !== initialIncoming) {
    setPrevIncoming(initialIncoming)
    setIncoming(initialIncoming.filter((s) => !accepted.has(s.id)))
  }

  // Subscribe to swap_requests changes. Realtime does not support
  // array-overlap filters, so we broadcast-then-refresh and let the
  // server re-filter via getIncomingSwapRequests().
  React.useEffect(() => {
    const client = getSupabaseBrowserClient()
    const channel = client
      .channel('swap_requests:incoming')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swap_requests',
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [router])

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
        // Optimistic removal + mark accepted so the next refresh doesn't flash it back
        setAccepted((prev) => {
          const next = new Set(prev)
          next.add(swap.id)
          return next
        })
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
