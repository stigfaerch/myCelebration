'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Monitor } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  setScreenOverride,
  clearScreenOverride,
} from '@/lib/actions/screen'
import type { ScreenInfo } from '@/components/admin/ScreenAssignmentToggle'

/**
 * Per-row "show on screen" toggle for photos / memories.
 *
 * Mirrors `ScreenAssignmentToggle` (used for page assignments) in interaction
 * shape — click toggles primary, right-click / long-press opens a per-screen
 * checkbox menu — but targets `screen_state.current_override` (single-slot
 * per screen) rather than the M:N `screen_page_assignments` table.
 *
 * Important behavioural difference vs. ScreenAssignmentToggle: each screen
 * can only have ONE active override at a time. Activating this row on a
 * screen that already has a different photo/memory override will replace it
 * (an upsert on `guest_id`). That's intentional — overrides are a single
 * "currently showing" slot.
 */

/** A single screen's current override (if any), as passed to this component. */
export interface ScreenOverrideStatus {
  screenId: string
  kind: 'photo' | 'memory'
  overrideRefId: string
}

interface Props {
  kind: 'photo' | 'memory'
  /** ID of the photo/memory this toggle represents. */
  refId: string
  /** Human-readable label for aria/title text (e.g. memory title). */
  refLabel: string
  screens: ScreenInfo[]
  /**
   * All currently active single-overrides across all screens, of any kind.
   * The component filters by `kind` and `refId === overrideRefId` to decide
   * which screens are showing THIS row.
   */
  activeOverrides: ScreenOverrideStatus[]
  /** Surface server-action errors via the parent's existing alert region. */
  onError: (message: string) => void
  disabled?: boolean
}

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 5 // px

/**
 * Sort screens for menu display: primary first, then alphabetical.
 *
 * Hoisted out of the component to keep the comparator reference stable
 * across renders (see rerender-no-inline-components and
 * rerender-memo-with-default-value).
 */
function sortScreens(screens: ScreenInfo[]): ScreenInfo[] {
  return [...screens].sort((a, b) => {
    if (a.is_primary_screen && !b.is_primary_screen) return -1
    if (!a.is_primary_screen && b.is_primary_screen) return 1
    return a.name.localeCompare(b.name, 'da')
  })
}

/**
 * Pure derivation of which screen ids are currently showing this row's
 * override. Hoisted so the function identity doesn't churn each render.
 */
function deriveActiveScreenIds(
  activeOverrides: ScreenOverrideStatus[],
  kind: 'photo' | 'memory',
  refId: string
): string[] {
  return activeOverrides
    .filter((o) => o.kind === kind && o.overrideRefId === refId)
    .map((o) => o.screenId)
}

export function ScreenOverrideToggle({
  kind,
  refId,
  refLabel,
  screens,
  activeOverrides,
  onError,
  disabled,
}: Props) {
  // Optimistic mirror of which screens currently show THIS row. The prop is
  // the source of truth after server revalidation; we re-sync when it changes.
  const initialActive = React.useMemo(
    () => deriveActiveScreenIds(activeOverrides, kind, refId),
    [activeOverrides, kind, refId]
  )

  const [localActive, setLocalActive] = React.useState<string[]>(initialActive)
  const [lastProp, setLastProp] = React.useState(initialActive)
  // Re-sync when the derived prop list actually changes (shallow compare).
  if (
    initialActive.length !== lastProp.length ||
    initialActive.some((id, i) => id !== lastProp[i])
  ) {
    setLastProp(initialActive)
    setLocalActive(initialActive)
  }

  const [menuOpen, setMenuOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const router = useRouter()

  const sortedScreens = React.useMemo(() => sortScreens(screens), [screens])
  const primary = sortedScreens.find((s) => s.is_primary_screen)
  const noScreens = sortedScreens.length === 0

  // Long-press tracking. Refs because they are transient and must not trigger
  // re-renders.
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStart = React.useRef<{ x: number; y: number } | null>(null)
  const longPressFired = React.useRef(false)

  function clearPressTimer() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function toggleScreen(screenId: string) {
    if (disabled) return
    const isActive = localActive.includes(screenId)
    const previous = localActive
    const next = isActive
      ? localActive.filter((id) => id !== screenId)
      : [...localActive, screenId]

    setLocalActive(next) // optimistic

    startTransition(async () => {
      try {
        if (isActive) {
          await clearScreenOverride(screenId)
        } else {
          await setScreenOverride(screenId, kind, refId)
        }
        // revalidatePath inside the action invalidates the cache but does not
        // re-render the current page when the action is invoked from a client
        // handler (rather than a form submit). Pull the refreshed
        // activeOverrides prop down so the banner and cross-row toggle states
        // update without a manual reload.
        router.refresh()
      } catch (err) {
        // Rollback on error.
        setLocalActive(previous)
        onError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // If a long-press just fired, the press path already opened the menu —
    // suppress the synthesised click.
    if (longPressFired.current) {
      longPressFired.current = false
      e.preventDefault()
      return
    }
    if (noScreens) return
    if (!primary) {
      onError('Ingen primær skærm konfigureret')
      return
    }
    toggleScreen(primary.id)
  }

  function handleContextMenu(e: React.MouseEvent<HTMLButtonElement>) {
    if (noScreens || disabled) return
    e.preventDefault()
    setMenuOpen(true)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (noScreens || disabled) return
    // Only react to touch / pen — mouse uses contextmenu instead. Keeping the
    // long-press path off mouse avoids interfering with the click handler.
    if (e.pointerType === 'mouse') return
    pressStart.current = { x: e.clientX, y: e.clientY }
    longPressFired.current = false
    clearPressTimer()
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true
      setMenuOpen(true)
    }, LONG_PRESS_MS)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!pressStart.current) return
    const dx = e.clientX - pressStart.current.x
    const dy = e.clientY - pressStart.current.y
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) {
      clearPressTimer()
      pressStart.current = null
    }
  }

  function handlePointerUp() {
    clearPressTimer()
    pressStart.current = null
  }

  function handlePointerCancel() {
    clearPressTimer()
    pressStart.current = null
    longPressFired.current = false
  }

  React.useEffect(() => {
    return () => {
      // Defensive: clear any in-flight timer when the component unmounts.
      if (pressTimer.current) clearTimeout(pressTimer.current)
    }
  }, [])

  // ---- Visual state ----
  const activeCount = localActive.length
  const isActive = activeCount > 0

  let tooltip: string
  if (noScreens) {
    tooltip = 'Ingen skærme konfigureret'
  } else if (activeCount === 0) {
    tooltip = 'Vis på skærm'
  } else {
    const names = localActive
      .map((id) => sortedScreens.find((s) => s.id === id)?.name)
      .filter((n): n is string => Boolean(n))
    if (names.length === 1) {
      tooltip = `Vises på ${names[0]}`
    } else {
      tooltip = `Vises på ${names.length} skærme`
    }
  }

  const iconClass = isActive ? 'text-primary' : 'text-muted-foreground'
  const isDisabled = disabled || noScreens

  return (
    <DropdownMenu open={menuOpen} onOpenChange={(next) => setMenuOpen(next)}>
      <DropdownMenuTrigger
        type="button"
        disabled={isDisabled}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label={`${tooltip} — ${refLabel}`}
        title={tooltip}
        className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {isActive ? (
          <Monitor className={`h-4 w-4 ${iconClass}`} fill="currentColor" />
        ) : (
          <Monitor className={`h-4 w-4 ${iconClass}`} />
        )}
        {activeCount > 1 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-medium leading-none text-primary-foreground"
          >
            {activeCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Vis på skærme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortedScreens.map((screen) => {
            const checked = localActive.includes(screen.id)
            return (
              <DropdownMenuCheckboxItem
                key={screen.id}
                checked={checked}
                // closeOnClick=false keeps the menu open so admins can toggle
                // multiple screens before closing manually. Mirrors
                // ScreenAssignmentToggle's behaviour.
                closeOnClick={false}
                disabled={isPending}
                onCheckedChange={() => toggleScreen(screen.id)}
              >
                <span className="flex items-center gap-2">
                  {screen.name}
                  {screen.is_primary_screen && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-primary">
                      Primær
                    </span>
                  )}
                </span>
              </DropdownMenuCheckboxItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
