'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  updateScreenCycleSettings,
  type ScreenTransition,
} from '@/lib/actions/screenAssignments'

const TRANSITION_OPTIONS: { value: ScreenTransition; label: string }[] = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'none', label: 'Ingen' },
]

interface CommonProps {
  defaultCycleSeconds: number
  defaultTransition: ScreenTransition
  /** Optional id-prefix so multiple instances on one page have unique ids. */
  idPrefix?: string
}

/**
 * Embedded variant: renders inputs only (NO save button). The host form
 * collects the values via standard `name=` attributes and persists them
 * through whatever action it submits — typically `updateGuestAction`.
 */
export function ScreenCycleSettingsFields({
  defaultCycleSeconds,
  defaultTransition,
  idPrefix,
}: CommonProps) {
  const cycleId = `${idPrefix ?? ''}screen_cycle_seconds`
  const transitionId = `${idPrefix ?? ''}screen_transition`

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <label htmlFor={cycleId} className="text-sm font-medium">
          Skifte-tid (sekunder)
        </label>
        <input
          id={cycleId}
          name="screen_cycle_seconds"
          type="number"
          min={2}
          max={600}
          defaultValue={defaultCycleSeconds}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={transitionId} className="text-sm font-medium">
          Overgang
        </label>
        <select
          id={transitionId}
          name="screen_transition"
          defaultValue={defaultTransition}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TRANSITION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

interface AutoSaveProps extends CommonProps {
  screenGuestId: string
  /** Bubble errors to the parent so error UI is centralised. */
  onError?: (message: string) => void
}

/**
 * Standalone variant: input row with debounced auto-save.
 *
 * Rationale for auto-save (vs. an explicit save button):
 *   - Parity with the dnd-list above on the same page, which auto-saves on
 *     drop without an explicit submit.
 *   - The two fields are bounded and validated server-side (CHECK constraint
 *     + the action's range guard), so a typo can't corrupt the row.
 *   - Optimistic UI keeps the inputs responsive; on error we rollback both
 *     fields to the last known-good value.
 *
 * Debounce window is 500ms — the spec value. We track an `inFlight` ref to
 * avoid stomping on a save with the next debounced flush.
 */
export function ScreenCycleSettingsAutoSave({
  screenGuestId,
  defaultCycleSeconds,
  defaultTransition,
  idPrefix,
  onError,
}: AutoSaveProps) {
  const [cycleSeconds, setCycleSeconds] = React.useState(defaultCycleSeconds)
  const [transition, setTransition] = React.useState(defaultTransition)
  const [savedAt, setSavedAt] = React.useState<Date | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  // Last value the server confirmed; used for rollback.
  const lastSaved = React.useRef({
    cycle_seconds: defaultCycleSeconds,
    transition: defaultTransition,
  })
  // Pending debounce timer.
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const cycleId = `${idPrefix ?? ''}cycle_seconds_${screenGuestId}`
  const transitionId = `${idPrefix ?? ''}transition_${screenGuestId}`

  // Validate locally before scheduling a save. The server enforces the same
  // range, but rejecting client-side avoids needless round-trips.
  function validate(seconds: number, t: ScreenTransition): string | null {
    if (!Number.isFinite(seconds) || seconds < 2 || seconds > 600) {
      return 'Skifte-tid skal være mellem 2 og 600 sekunder'
    }
    if (t !== 'fade' && t !== 'slide' && t !== 'none') {
      return 'Ugyldig overgang'
    }
    return null
  }

  function scheduleSave(nextCycle: number, nextTransition: ScreenTransition) {
    const err = validate(nextCycle, nextTransition)
    if (err) {
      onError?.(err)
      return
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      void persist(nextCycle, nextTransition)
    }, 500)
  }

  async function persist(nextCycle: number, nextTransition: ScreenTransition) {
    const previous = { ...lastSaved.current }
    setIsSaving(true)
    try {
      await updateScreenCycleSettings(screenGuestId, {
        cycle_seconds: nextCycle,
        transition: nextTransition,
      })
      lastSaved.current = {
        cycle_seconds: nextCycle,
        transition: nextTransition,
      }
      setSavedAt(new Date())
    } catch (e) {
      // Rollback inputs.
      setCycleSeconds(previous.cycle_seconds)
      setTransition(previous.transition)
      lastSaved.current = previous
      onError?.(e instanceof Error ? e.message : 'Kunne ikke gemme')
    } finally {
      setIsSaving(false)
    }
  }

  React.useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor={cycleId} className="text-sm font-medium">
            Skifte-tid (sekunder)
          </label>
          <input
            id={cycleId}
            type="number"
            min={2}
            max={600}
            value={cycleSeconds}
            onChange={(e) => {
              const next = Number(e.target.value)
              setCycleSeconds(next)
              if (Number.isFinite(next)) scheduleSave(next, transition)
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={transitionId} className="text-sm font-medium">
            Overgang
          </label>
          <select
            id={transitionId}
            value={transition}
            onChange={(e) => {
              const next = e.target.value as ScreenTransition
              setTransition(next)
              scheduleSave(cycleSeconds, next)
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TRANSITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
  )
}

interface ScreenPreviewFrameProps {
  screenUuid: string
  width: number
  height: number
}

/**
 * WYSIWYG forhåndsvisning af skærm-render. Rammer iframen med skærmens
 * forventede pixel-dimensioner og CSS-skalérer den ned til admin-kortets
 * bredde, så proportionerne matcher den faktiske visning.
 *
 * Caveat: hvis admin-browseren ikke har `guest_password`-cookien sat, viser
 * iframen `/{screenUuid}/enter` (kodeordsporten). Det er forventet adfærd —
 * efter admin har indtastet kodeordet én gang, genindlæser iframen og viser
 * skærm-renderet. Vi forsøger ikke at omgå auth-laget her; resolutionen
 * er ren admin-curation-metadata og påvirker ikke render-pathen.
 */
function ScreenPreviewFrame({
  screenUuid,
  width,
  height,
}: ScreenPreviewFrameProps) {
  // Admin-card content width. Hardcoded fordi `ScreenCycleSettingsCard`
  // renderes i et 2-kolonne grid (sm:grid-cols-2) med fast padding; målet
  // er en visuel hint, ikke perfekt pixel-respons.
  const TARGET_WIDTH = 600
  // Skalér aldrig op — hvis skærmen er mindre end target, vis 1:1.
  const scale = Math.min(1, TARGET_WIDTH / width)
  const previewHref = `/${screenUuid}`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Forhåndsvisning ({width}×{height}, skaleret {Math.round(scale * 100)}
          %)
        </span>
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Åbn i nyt vindue ↗
        </a>
      </div>
      <div
        className="overflow-hidden rounded border border-border"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          src={previewHref}
          title={`Skærm-forhåndsvisning ${screenUuid}`}
          loading="lazy"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 'none',
          }}
        />
      </div>
    </div>
  )
}

interface ScreenCardProps {
  screenId: string
  screenName: string
  isPrimary: boolean
  defaultCycleSeconds: number
  defaultTransition: ScreenTransition
  /** Pixel-bredde for iframe-forhåndsvisning. Curation-only. */
  screenWidth: number
  /** Pixel-højde for iframe-forhåndsvisning. Curation-only. */
  screenHeight: number
  visibleCount: number
  hiddenCount: number
  onError?: (message: string) => void
}

/**
 * One card per screen. Used in the bottom section of /admin/sider.
 */
export function ScreenCycleSettingsCard({
  screenId,
  screenName,
  isPrimary,
  defaultCycleSeconds,
  defaultTransition,
  screenWidth,
  screenHeight,
  visibleCount,
  hiddenCount,
  onError,
}: ScreenCardProps) {
  return (
    <div className="rounded-md border bg-background p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{screenName}</h3>
        {isPrimary && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-primary">
            Primær
          </span>
        )}
      </div>
      <ScreenCycleSettingsAutoSave
        screenGuestId={screenId}
        defaultCycleSeconds={defaultCycleSeconds}
        defaultTransition={defaultTransition}
        onError={onError}
      />
      <p className="text-xs text-muted-foreground">
        I rotation: {visibleCount} {visibleCount === 1 ? 'side' : 'sider'}
        {hiddenCount > 0 && (
          <em className="not-italic ml-1 italic">
            ({hiddenCount} {hiddenCount === 1 ? 'side' : 'sider'} er skjult lige nu)
          </em>
        )}
      </p>
      <ScreenPreviewFrame
        screenUuid={screenId}
        width={screenWidth}
        height={screenHeight}
      />
    </div>
  )
}

/** Top-level wrapper used on /admin/sider — collects errors and renders cards. */
interface SectionProps {
  screens: {
    id: string
    name: string
    is_primary_screen: boolean
    cycle_seconds: number
    transition: ScreenTransition
    /** Pixel-bredde til WYSIWYG-forhåndsvisning. */
    screen_width: number
    /** Pixel-højde til WYSIWYG-forhåndsvisning. */
    screen_height: number
    visibleCount: number
    hiddenCount: number
  }[]
}

export function ScreenCycleSettingsSection({ screens }: SectionProps) {
  const [error, setError] = React.useState<string | null>(null)

  if (screens.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Skærm-indstillinger</h2>
        <p className="text-sm text-muted-foreground">
          Ingen skærme konfigureret.{' '}
          <Link
            href="/admin/deltagere/ny"
            className="text-primary underline-offset-4 hover:underline"
          >
            Opret en deltager med type &quot;screen&quot;
          </Link>{' '}
          for at konfigurere skærm-indstillinger.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Skærm-indstillinger</h2>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {screens.map((s) => (
          <ScreenCycleSettingsCard
            key={s.id}
            screenId={s.id}
            screenName={s.name}
            isPrimary={s.is_primary_screen}
            defaultCycleSeconds={s.cycle_seconds}
            defaultTransition={s.transition}
            screenWidth={s.screen_width}
            screenHeight={s.screen_height}
            visibleCount={s.visibleCount}
            hiddenCount={s.hiddenCount}
            onError={setError}
          />
        ))}
      </div>
    </section>
  )
}

