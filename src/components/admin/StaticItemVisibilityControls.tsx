'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Clock, EyeOff } from 'lucide-react'

import { updateStaticItemVisibility } from '@/lib/actions/staticItemVisibility'
import { isPageVisibleNow } from '@/lib/guest/navItems'

/**
 * Per-row visibility editor for a static menu item on `/admin/sider`.
 *
 * UX parity with the dynamic-page visibility controls (managed via PageForm),
 * but inline rather than modal — admins toggle `is_active` and adjust the
 * visibility window directly in the row, with debounced auto-save mirroring
 * `ScreenCycleSettingsAutoSave`.
 *
 * Key behaviours:
 *   - Three inputs: `is_active` checkbox, `visible_from` / `visible_until`
 *     `datetime-local` fields.
 *   - 500ms debounced save on any change. Optimistic UI: input value updates
 *     immediately, server action runs in a transition. On error we rollback to
 *     the last server-confirmed value.
 *   - Collapsible — defaults closed to keep the row compact. Expanding shows
 *     the editor; status badges (`EyeOff`, `Clock`) live alongside the trigger
 *     so admins can see status at a glance even when collapsed.
 *
 * Drag-and-drop integrity: this component is rendered inside a dnd-kit
 * sortable row whose drag activator is a separate button. The 5px pointer
 * activation distance (configured on the parent `PointerSensor`) prevents a
 * click/tap on these inputs from accidentally starting a drag. We do NOT
 * forward listeners here — only the drag handle has them.
 */

interface VisibilityState {
  is_active: boolean
  visible_from: string | null
  visible_until: string | null
}

interface Props {
  staticKey: string
  initial: VisibilityState
  /** Bubble errors to the parent for centralised display. */
  onError: (message: string) => void
}

const DEBOUNCE_MS = 500

/**
 * Convert an ISO timestamp string (or null) to the `datetime-local` input
 * value format (`YYYY-MM-DDTHH:mm`). Browsers expect local-timezone-naive
 * strings here, so we slice the locale-formatted value.
 */
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // Build YYYY-MM-DDTHH:mm in the user's local timezone.
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

/**
 * Reverse: turn a `datetime-local` value into an ISO string suitable for the
 * server (interpreted as the user's local time, then serialized as UTC ISO).
 */
function datetimeLocalToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/**
 * Visibility status badges — pure display, no controls. Mirrors the inline
 * badges MenuManager renders for dynamic pages, hoisted here so static rows
 * can render them without duplicating the icon set + tooltip strings.
 */
export function VisibilityBadges({
  is_active,
  visible_from,
  visible_until,
  hiddenInactiveTooltip,
  hiddenWindowTooltip,
}: {
  is_active: boolean
  visible_from: string | null
  visible_until: string | null
  hiddenInactiveTooltip: string
  hiddenWindowTooltip: string
}) {
  const inactive = !is_active
  const outsideWindow =
    is_active &&
    !isPageVisibleNow({ is_active, visible_from, visible_until })

  return (
    <>
      {inactive && (
        <span
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          title={hiddenInactiveTooltip}
          aria-label={hiddenInactiveTooltip}
        >
          <EyeOff className="h-3.5 w-3.5" />
        </span>
      )}
      {outsideWindow && (
        <span
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          title={hiddenWindowTooltip}
          aria-label={hiddenWindowTooltip}
        >
          <Clock className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  )
}

export function StaticItemVisibilityControls({
  staticKey,
  initial,
  onError,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [state, setState] = React.useState<VisibilityState>(initial)
  const [isSaving, setIsSaving] = React.useState(false)
  const [savedAt, setSavedAt] = React.useState<Date | null>(null)

  // Track last server-confirmed values for rollback on error.
  const lastSaved = React.useRef<VisibilityState>(initial)

  // Adopt updated initial state on prop change (after router.refresh).
  const [lastInitial, setLastInitial] = React.useState(initial)
  if (initial !== lastInitial) {
    setLastInitial(initial)
    setState(initial)
    lastSaved.current = initial
  }

  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function persist(next: VisibilityState) {
    const previous = { ...lastSaved.current }
    setIsSaving(true)
    void (async () => {
      try {
        await updateStaticItemVisibility(staticKey, next)
        lastSaved.current = next
        setSavedAt(new Date())
      } catch (e) {
        // Rollback to last server-confirmed values.
        setState(previous)
        lastSaved.current = previous
        onError(e instanceof Error ? e.message : 'Kunne ikke gemme synlighed')
      } finally {
        setIsSaving(false)
      }
    })()
  }

  function scheduleSave(next: VisibilityState) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      persist(next)
    }, DEBOUNCE_MS)
  }

  function update(patch: Partial<VisibilityState>) {
    const next = { ...state, ...patch }
    setState(next)
    scheduleSave(next)
  }

  React.useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const checkboxId = `static-active-${staticKey}`
  const fromId = `static-from-${staticKey}`
  const untilId = `static-until-${staticKey}`

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={`static-vis-${staticKey}`}
        className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>Synlighed</span>
      </button>

      {isOpen && (
        <div
          id={`static-vis-${staticKey}`}
          className="mt-2 grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[auto_1fr_1fr]"
        >
          <div className="flex items-center gap-2">
            <input
              id={checkboxId}
              type="checkbox"
              checked={state.is_active}
              onChange={(e) => update({ is_active: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor={checkboxId} className="text-sm">
              Aktiv
            </label>
          </div>
          <div className="space-y-1">
            <label htmlFor={fromId} className="block text-xs text-muted-foreground">
              Synlig fra
            </label>
            <input
              id={fromId}
              type="datetime-local"
              value={isoToDatetimeLocal(state.visible_from)}
              onChange={(e) =>
                update({ visible_from: datetimeLocalToIso(e.target.value) })
              }
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={untilId} className="block text-xs text-muted-foreground">
              Synlig indtil
            </label>
            <input
              id={untilId}
              type="datetime-local"
              value={isoToDatetimeLocal(state.visible_until)}
              onChange={(e) =>
                update({ visible_until: datetimeLocalToIso(e.target.value) })
              }
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
          </div>
          <div className="text-xs text-muted-foreground sm:col-span-3">
            {isSaving ? (
              <span>Gemmer…</span>
            ) : savedAt ? (
              <span>
                Gemt {savedAt.toLocaleTimeString('da-DK', { timeStyle: 'short' })}
              </span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
