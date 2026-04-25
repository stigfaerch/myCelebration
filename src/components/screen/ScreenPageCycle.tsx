'use client'

import * as React from 'react'

import { RichTextDisplay } from '@/components/admin/RichTextDisplay'
import { ScreenDefault } from '@/components/screen/ScreenDefault'
import { ScreenDeltagere } from '@/components/screen/ScreenDeltagere'
import { ScreenHvor, type ScreenHvorEvent } from '@/components/screen/ScreenHvor'
import {
  ScreenOpgaver,
  type ScreenOpgaverTask,
} from '@/components/screen/ScreenOpgaver'
import {
  ScreenProgram,
  type ScreenProgramRow,
} from '@/components/screen/ScreenProgram'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  getHydratedMixedScreenItems,
  getScreenCycleSettings,
  type MixedScreenItem,
  type ScreenTransition,
} from '@/lib/actions/screenAssignments'
import type { GalleryConfig } from '@/lib/actions/gallery'
import type { GalleryItem } from '@/lib/actions/guest/gallery'

/**
 * Re-export so consumers (e.g. `[uuid]/page.tsx`) can import the polymorphic
 * shape from a single module without reaching into the actions file directly.
 */
export type { MixedScreenItem } from '@/lib/actions/screenAssignments'

interface Props {
  screenGuestId: string
  initialItems: MixedScreenItem[]
  initialCycleSeconds: number
  initialTransition: ScreenTransition
}

const TRANSITION_MS = 400

/**
 * Render a single MixedScreenItem as a fullscreen slide. Pure presentational
 * — no transition logic here. Each `kind`/`staticKey` branch dispatches to a
 * dedicated screen renderer; unknown static keys fall through to a defensive
 * black div so a corrupt assignment row never crashes the screen.
 */
function CycleItemView({ item }: { item: MixedScreenItem }) {
  if (item.kind === 'page') {
    return (
      <div className="absolute inset-0 overflow-auto bg-slate-950 text-white">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-8 py-12">
          <h1 className="mb-8 text-center text-5xl font-bold tracking-tight">
            {item.title}
          </h1>
          {item.content && (
            <div className="prose prose-invert prose-lg max-w-none">
              <RichTextDisplay content={item.content} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Static-key dispatch. The data payload was hydrated server-side (initial
  // render) or by `getHydratedMixedScreenItems` (realtime refetch), so the
  // shape per key is fixed and we cast accordingly.
  switch (item.staticKey) {
    case 'galleri': {
      const data = item.data as { config: GalleryConfig; items: GalleryItem[] }
      return (
        <div className="absolute inset-0">
          <ScreenDefault config={data.config} items={data.items} />
        </div>
      )
    }
    case 'deltagere': {
      const data = item.data as {
        guests: Array<{
          id: string
          name: string
          type: string
          relation: string | null
        }>
      }
      return <ScreenDeltagere guests={data.guests} />
    }
    case 'hvor': {
      const data = item.data as { events: ScreenHvorEvent[] }
      return <ScreenHvor events={data.events} />
    }
    case 'tasks': {
      const data = item.data as { tasks: ScreenOpgaverTask[] }
      return <ScreenOpgaver tasks={data.tasks} />
    }
    case 'program': {
      const data = item.data as { items: ScreenProgramRow[] }
      return <ScreenProgram items={data.items} />
    }
    default: {
      // Defensive fallback for an unknown static_key (e.g., key removed from
      // STATIC_NAV_KEYS but assignment row still in DB). Log so operators
      // see something in the screen browser console; show a small label so
      // the slide isn't silently black for cycle_seconds.
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn(
          `[ScreenPageCycle] Unknown static_key in assignment: ${item.staticKey}`
        )
      }
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black p-8">
          <span className="text-sm text-white/30">
            Ukendt skærm-element: {item.staticKey}
          </span>
        </div>
      )
    }
  }
}

/**
 * Cycles through assigned screen items (mixed dynamic pages + static views)
 * with a configurable interval and transition style. Subscribes to
 * `screen_page_assignments` for the given screen and refetches both the
 * hydrated item list and the cycle settings on any change.
 *
 * Polymorphic refactor (Plan 08-05): item shape is `MixedScreenItem`, a
 * discriminated union with `kind: 'page' | 'static'`. Cycle interval and
 * transition mechanics are unchanged from the page-only ancestor — they
 * operate on indices into the items array, oblivious to per-item kind.
 *
 * Lifecycle:
 *   - cycle interval: cleared and recreated whenever cycleSeconds or
 *     items.length changes (and on unmount). Single item = no interval.
 *   - transition timer: per-step timeout, always cleared on unmount or
 *     when overtaken by a new step.
 *   - realtime channel: subscribed once per mount with a unique topic
 *     (instanceId) to survive React 19 Strict Mode double-effect; torn
 *     down via removeChannel on unmount. Per Plan 08-02 Decision B1
 *     (polymorphic single table), the existing channel filter
 *     `screen_guest_id=eq.<id>` already covers BOTH page-row and
 *     static-row inserts/updates/deletes — no second subscription needed.
 */
export function ScreenPageCycle({
  screenGuestId,
  initialItems,
  initialCycleSeconds,
  initialTransition,
}: Props) {
  const [items, setItems] = React.useState<MixedScreenItem[]>(initialItems)
  const [cycleSeconds, setCycleSeconds] = React.useState<number>(initialCycleSeconds)
  const [transition, setTransition] = React.useState<ScreenTransition>(initialTransition)

  // Index into items. Outgoing index is rendered alongside incoming during
  // a transition; null otherwise.
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [previousIndex, setPreviousIndex] = React.useState<number | null>(null)
  // Initialize to `true` so the very first render is fully visible. With
  // `false`, the fade-incoming style resolves to `opacity: 0`, blanking
  // the screen until the first cycle tick — which never happens for a
  // single-item assignment. The cycle step explicitly resets this to
  // `false` before bumping currentIndex, so transitions still work.
  const [animateIn, setAnimateIn] = React.useState(true)

  const instanceId = React.useId()

  // ── Cycle interval ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (items.length <= 1) return
    const intervalMs = Math.max(2, cycleSeconds) * 1000
    const id = window.setInterval(() => {
      setCurrentIndex((i) => {
        const next = (i + 1) % items.length
        setPreviousIndex(i)
        setAnimateIn(false)
        return next
      })
    }, intervalMs)
    return () => {
      window.clearInterval(id)
    }
  }, [cycleSeconds, items.length])

  // ── Transition kick-off + cleanup ─────────────────────────────────────
  // After the new index renders at "start" position, flip animateIn so
  // CSS transitions toward the resting state. Drop the previous layer
  // after TRANSITION_MS.
  React.useEffect(() => {
    if (previousIndex === null) return
    if (transition === 'none') {
      setPreviousIndex(null)
      setAnimateIn(true)
      return
    }
    // Two rAFs: one to commit the "start" frame, one to flip to "end".
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setAnimateIn(true)
      })
    })
    const drop = window.setTimeout(() => {
      setPreviousIndex(null)
    }, TRANSITION_MS)
    return () => {
      window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
      window.clearTimeout(drop)
    }
  }, [previousIndex, currentIndex, transition])

  // Reset displayed index when items list shrinks past it.
  React.useEffect(() => {
    if (items.length === 0) {
      setCurrentIndex(0)
      setPreviousIndex(null)
      return
    }
    if (currentIndex >= items.length) {
      setCurrentIndex(0)
      setPreviousIndex(null)
    }
  }, [items.length, currentIndex])

  // ── Realtime subscription ─────────────────────────────────────────────
  React.useEffect(() => {
    const client = getSupabaseBrowserClient()
    const topic = `screen_page_assignments:${screenGuestId}:${instanceId}`
    let cancelled = false

    const refetch = async () => {
      try {
        const [nextItems, nextSettings] = await Promise.all([
          getHydratedMixedScreenItems(screenGuestId),
          getScreenCycleSettings(screenGuestId),
        ])
        if (cancelled) return
        setItems(nextItems)
        setCycleSeconds(nextSettings.cycle_seconds)
        setTransition(nextSettings.transition)
      } catch {
        // Realtime refetch is best-effort; surface nothing to the screen.
      }
    }

    const channel = client
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_page_assignments',
          filter: `screen_guest_id=eq.${screenGuestId}`,
        },
        () => {
          void refetch()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [screenGuestId, instanceId])

  // ── Render ────────────────────────────────────────────────────────────
  // Strict-blank invariant: when assignments exist but zero are currently
  // visible (window violations) the parent route still mounts this cycler
  // with `initialItems = []`. Render blank-black instead of falling through
  // to the gallery default — assigning items is an explicit operator signal
  // and silently substituting the gallery would mask schedule mistakes.
  if (items.length === 0) {
    return <div className="h-screen w-screen bg-black" />
  }

  const current = items[currentIndex]
  const previous = previousIndex !== null ? items[previousIndex] : null

  // Style maps for entering and exiting layers per transition mode.
  // We use absolute positioning + double-render so the layers cross-fade
  // or slide past each other without depending on react-transition-group.
  const transitionStyle = `${TRANSITION_MS}ms ease-in-out`

  let incomingStyle: React.CSSProperties = { transition: 'none' }
  let outgoingStyle: React.CSSProperties = { transition: 'none' }

  if (transition === 'fade') {
    incomingStyle = {
      transition: `opacity ${transitionStyle}`,
      opacity: animateIn ? 1 : 0,
    }
    outgoingStyle = {
      transition: `opacity ${transitionStyle}`,
      opacity: animateIn ? 0 : 1,
    }
  } else if (transition === 'slide') {
    incomingStyle = {
      transition: `transform ${transitionStyle}`,
      transform: animateIn ? 'translateX(0%)' : 'translateX(100%)',
    }
    outgoingStyle = {
      transition: `transform ${transitionStyle}`,
      transform: animateIn ? 'translateX(-100%)' : 'translateX(0%)',
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {previous && (
        <div className="absolute inset-0" style={outgoingStyle} aria-hidden>
          <CycleItemView item={previous} />
        </div>
      )}
      <div className="absolute inset-0" style={incomingStyle}>
        <CycleItemView item={current} />
      </div>
    </div>
  )
}
