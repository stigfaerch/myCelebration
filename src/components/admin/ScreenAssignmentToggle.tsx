'use client'

import * as React from 'react'
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
  addPageToScreen,
  removePageFromScreen,
  addStaticItemToScreen,
  removeStaticItemFromScreen,
} from '@/lib/actions/screenAssignments'

/**
 * The minimum information this control needs about each screen.
 */
export interface ScreenInfo {
  id: string
  name: string
  is_primary_screen: boolean
}

/**
 * Discriminated subject. The toggle does not care whether it's controlling
 * page or static-item assignments — it just dispatches to the correct
 * server action based on `kind`.
 */
export type AssignmentSubject =
  | { kind: 'page'; pageId: string; pageLabel: string }
  | { kind: 'static'; staticKey: string; staticLabel: string }

interface Props {
  subject: AssignmentSubject
  screens: ScreenInfo[]
  /** Currently-assigned screen ids for this subject. */
  assignedScreenIds: string[]
  /**
   * Bubble errors back to the parent so MenuManager can surface them in its
   * existing alert region rather than each toggle owning its own banner.
   */
  onError: (message: string) => void
  disabled?: boolean
}

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 5 // px

/**
 * Sort screens for menu display: primary first, then alphabetical.
 *
 * Hoisted out of the component to avoid reallocating the comparator on every
 * render — see rerender-no-inline-components / general "stable references"
 * guidance.
 */
function sortScreens(screens: ScreenInfo[]): ScreenInfo[] {
  return [...screens].sort((a, b) => {
    if (a.is_primary_screen && !b.is_primary_screen) return -1
    if (!a.is_primary_screen && b.is_primary_screen) return 1
    return a.name.localeCompare(b.name, 'da')
  })
}

/**
 * Subject-agnostic helpers: read display label and dispatch the correct
 * mutation for the current `subject.kind`. Hoisted so the component body
 * stays focused on UI concerns.
 */
function subjectLabel(subject: AssignmentSubject): string {
  return subject.kind === 'page' ? subject.pageLabel : subject.staticLabel
}

async function addToScreenForSubject(
  subject: AssignmentSubject,
  screenId: string
): Promise<void> {
  if (subject.kind === 'page') {
    await addPageToScreen(screenId, subject.pageId)
  } else {
    await addStaticItemToScreen(screenId, subject.staticKey)
  }
}

async function removeFromScreenForSubject(
  subject: AssignmentSubject,
  screenId: string
): Promise<void> {
  if (subject.kind === 'page') {
    await removePageFromScreen(screenId, subject.pageId)
  } else {
    await removeStaticItemFromScreen(screenId, subject.staticKey)
  }
}

export function ScreenAssignmentToggle({
  subject,
  screens,
  assignedScreenIds,
  onError,
  disabled,
}: Props) {
  // Optimistic mirror of the prop; resets when the prop changes (parent
  // refreshes after server revalidation).
  const [localAssigned, setLocalAssigned] =
    React.useState<string[]>(assignedScreenIds)
  const [lastProp, setLastProp] = React.useState(assignedScreenIds)
  if (assignedScreenIds !== lastProp) {
    setLastProp(assignedScreenIds)
    setLocalAssigned(assignedScreenIds)
  }

  const [menuOpen, setMenuOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const sortedScreens = React.useMemo(() => sortScreens(screens), [screens])
  const primary = sortedScreens.find((s) => s.is_primary_screen)
  const noScreens = sortedScreens.length === 0

  const label = subjectLabel(subject)

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
    const isAssigned = localAssigned.includes(screenId)
    const previous = localAssigned
    const next = isAssigned
      ? localAssigned.filter((id) => id !== screenId)
      : [...localAssigned, screenId]

    setLocalAssigned(next) // optimistic

    startTransition(async () => {
      try {
        if (isAssigned) {
          await removeFromScreenForSubject(subject, screenId)
        } else {
          await addToScreenForSubject(subject, screenId)
        }
      } catch (err) {
        // Rollback on error.
        setLocalAssigned(previous)
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
  const assignedCount = localAssigned.length
  const onNonPrimary = localAssigned.some((id) => id !== primary?.id)
  const isActive = assignedCount > 0

  // Tooltip text describing current state.
  let tooltip: string
  if (noScreens) {
    tooltip = 'Ingen skærme konfigureret'
  } else if (assignedCount === 0) {
    tooltip = 'Vis på skærm'
  } else {
    const names = localAssigned
      .map((id) => sortedScreens.find((s) => s.id === id)?.name)
      .filter((n): n is string => Boolean(n))
    if (names.length === 1) {
      tooltip = `Vis på ${names[0]}`
    } else {
      tooltip = `Aktiv på ${names.length} skærme`
    }
  }

  // Icon colour: muted when off, primary blue when only primary, accent + badge
  // when on any non-primary screen.
  const iconClass = isActive
    ? onNonPrimary
      ? 'text-primary'
      : 'text-foreground'
    : 'text-muted-foreground'

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
        aria-label={`${tooltip} — ${label}`}
        title={tooltip}
        className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {isActive ? (
          <Monitor className={`h-4 w-4 ${iconClass}`} fill="currentColor" />
        ) : (
          <Monitor className={`h-4 w-4 ${iconClass}`} />
        )}
        {assignedCount > 1 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-medium leading-none text-primary-foreground"
          >
            {assignedCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Vis på skærme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortedScreens.map((screen) => {
            const checked = localAssigned.includes(screen.id)
            return (
              <DropdownMenuCheckboxItem
                key={screen.id}
                checked={checked}
                // closeOnClick=false keeps the menu open so admins can toggle
                // multiple screens before closing manually. See AGENTS.md spec.
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
