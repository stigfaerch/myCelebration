'use client'

import * as React from 'react'

import { RichTextDisplay } from '@/components/admin/RichTextDisplay'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  getVisibleScreenAssignments,
  getScreenCycleSettings,
  type ScreenTransition,
} from '@/lib/actions/screenAssignments'

export interface ScreenPageForCycle {
  id: string
  title: string
  content: Record<string, unknown> | null
}

interface Props {
  screenGuestId: string
  initialPages: ScreenPageForCycle[]
  initialCycleSeconds: number
  initialTransition: ScreenTransition
}

const TRANSITION_MS = 400

/**
 * Renders a single page from the cycle list as full-screen content.
 * Pure presentational — no transition logic here.
 */
function CyclePageView({ page }: { page: ScreenPageForCycle }) {
  return (
    <div className="absolute inset-0 overflow-auto bg-slate-950 text-white">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-8 py-12">
        <h1 className="mb-8 text-center text-5xl font-bold tracking-tight">
          {page.title}
        </h1>
        {page.content && (
          <div className="prose prose-invert prose-lg max-w-none">
            <RichTextDisplay content={page.content} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Cycles through assigned pages with a configurable interval and
 * transition style. Subscribes to `screen_page_assignments` for the
 * given screen and refetches both pages and cycle settings on any
 * change.
 *
 * Lifecycle:
 *   - cycle interval: cleared and recreated whenever cycleSeconds or
 *     pages.length changes (and on unmount). Single page = no interval.
 *   - transition timer: per-step timeout, always cleared on unmount or
 *     when overtaken by a new step.
 *   - realtime channel: subscribed once per mount with a unique topic
 *     (instanceId) to survive React 19 Strict Mode double-effect; torn
 *     down via removeChannel on unmount.
 */
export function ScreenPageCycle({
  screenGuestId,
  initialPages,
  initialCycleSeconds,
  initialTransition,
}: Props) {
  const [pages, setPages] = React.useState<ScreenPageForCycle[]>(initialPages)
  const [cycleSeconds, setCycleSeconds] = React.useState<number>(initialCycleSeconds)
  const [transition, setTransition] = React.useState<ScreenTransition>(initialTransition)

  // Index into pages. Outgoing index is rendered alongside incoming during
  // a transition; null otherwise.
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [previousIndex, setPreviousIndex] = React.useState<number | null>(null)
  // Initialize to `true` so the very first render is fully visible. With
  // `false`, the fade-incoming style resolves to `opacity: 0`, blanking
  // the screen until the first cycle tick — which never happens for a
  // single-page assignment. The cycle step explicitly resets this to
  // `false` before bumping currentIndex, so transitions still work.
  const [animateIn, setAnimateIn] = React.useState(true)

  const instanceId = React.useId()

  // ── Cycle interval ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (pages.length <= 1) return
    const intervalMs = Math.max(2, cycleSeconds) * 1000
    const id = window.setInterval(() => {
      setCurrentIndex((i) => {
        const next = (i + 1) % pages.length
        setPreviousIndex(i)
        setAnimateIn(false)
        return next
      })
    }, intervalMs)
    return () => {
      window.clearInterval(id)
    }
  }, [cycleSeconds, pages.length])

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

  // Reset displayed index when pages list shrinks past it.
  React.useEffect(() => {
    if (pages.length === 0) {
      setCurrentIndex(0)
      setPreviousIndex(null)
      return
    }
    if (currentIndex >= pages.length) {
      setCurrentIndex(0)
      setPreviousIndex(null)
    }
  }, [pages.length, currentIndex])

  // ── Realtime subscription ─────────────────────────────────────────────
  React.useEffect(() => {
    const client = getSupabaseBrowserClient()
    const topic = `screen_page_assignments:${screenGuestId}:${instanceId}`
    let cancelled = false

    const refetch = async () => {
      try {
        const [nextPages, nextSettings] = await Promise.all([
          getVisibleScreenAssignments(screenGuestId),
          getScreenCycleSettings(screenGuestId),
        ])
        if (cancelled) return
        setPages(
          nextPages.map((a) => ({
            id: a.page.id,
            title: a.page.title,
            content: a.page.content,
          }))
        )
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
  if (pages.length === 0) {
    return <div className="h-screen w-screen bg-black" />
  }

  const current = pages[currentIndex]
  const previous = previousIndex !== null ? pages[previousIndex] : null

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
          <CyclePageView page={previous} />
        </div>
      )}
      <div className="absolute inset-0" style={incomingStyle}>
        <CyclePageView page={current} />
      </div>
    </div>
  )
}
