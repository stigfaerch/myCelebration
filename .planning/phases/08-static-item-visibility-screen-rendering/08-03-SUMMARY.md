# Plan 08-03 — Admin UI: visibility + screen-toggle on static items

## Status
Complete

## Files modified/created

Created:
- `/home/stigf/projects/myCelebration/src/components/admin/StaticItemVisibilityControls.tsx`

Modified:
- `/home/stigf/projects/myCelebration/src/components/admin/ScreenAssignmentToggle.tsx`
- `/home/stigf/projects/myCelebration/src/components/admin/MenuManager.tsx`
- `/home/stigf/projects/myCelebration/src/app/(admin)/admin/sider/page.tsx`

## Eligibility decision recap

Confirmed against `.planning/PROJECT.md` R25 (line 62): the screen-toggle is enabled for exactly five static keys —

- `galleri`
- `deltagere`
- `hvor`
- `tasks` (i.e. Opgaver)
- `program`

These match the explicit list in PROJECT.md R25. The remaining static keys — `camera`, `photos`, `minder` — get visibility controls (R24 parity) but no Monitor button. For ineligible keys the entire screen-toggle block is omitted from the row (the rationale is that disabling it would still occupy width, while hiding it keeps the row visually compact and matches the pattern dynamic pages use when they have no actions to render).

The eligible-set is encoded once in MenuManager as a hoisted `Set<string>` constant (`SCREEN_ELIGIBLE_STATIC_KEYS`) so the predicate is one O(1) check per row and trivially extendable if R25 grows.

## Component split

Two new components live in `StaticItemVisibilityControls.tsx`:

1. **`StaticItemVisibilityControls`** (default export concept) — the per-row collapsible inline editor. Exposes a "Synlighed" expander button; expanding reveals the three controls (`is_active` checkbox + two `datetime-local` inputs). Defaults to collapsed so the row stays compact.

2. **`VisibilityBadges`** — a co-located helper exporting just the EyeOff / Clock badges. MenuManager renders this for static rows so the visual treatment matches the existing inline EyeOff/Clock badges on dynamic-page rows. It's not a separately-extracted file because the badge logic is small (~15 lines) and tightly couples to the visibility-record shape that the editor already owns. Promoting it would have meant exporting either the predicate or the icons separately and forcing two import sites for what is one feature.

`VisibilityBadges` is consumed by `MenuManager` for both kinds-of-rows visually but is invoked only on static rows in code; dynamic-page rows continue using their inline `EyeOff` / `Clock` JSX (unchanged) because their input shape (`item.pageIsActive`, `item.pageOutsideWindow`) is already pre-computed by `getResolvedNavForAdmin` so re-doing it via the new helper would add a runtime computation for no gain.

## Drag-and-drop integrity

No drag-handler changes were needed beyond the existing 5px `PointerSensor` activation distance. Confirmation:

- The row's `<button>` drag-activator (`setActivatorNodeRef` + `{...listeners}`) is the only element that propagates dnd-kit listeners. New controls (Monitor button, "Synlighed" expander, checkbox, datetime-local inputs) sit in sibling DOM nodes and never receive `listeners` / `attributes`.
- The pointer-down → 5px-move-then-drag sequence requires sustained motion before drag activates, so a tap-to-toggle on the checkbox or expander cannot accidentally start a drag. A press-and-drag on a datetime-local would in theory move the pointer, but that input absorbs pointer events for its own picker UI before dnd-kit can claim them.
- No `touch-action` or `stopPropagation` tweaks needed — verified by tracing event flow: the only `touch-none` class is on the drag handle itself, which is the correct scope.

The keyboard sortable path (Tab → Space → Arrows) is unaffected: the new row controls are reachable via tab order but each owns its own `Enter`/`Space` semantics so the dnd-kit keyboard sensor only ever fires when focus is on the drag handle.

## Auto-save behavior

- **Debounce**: 500 ms after the last change (matches `ScreenCycleSettingsAutoSave`).
- **Optimistic UI**: input values update immediately; the `updateStaticItemVisibility` server action runs in a void-async block. The UI never blocks waiting for the round-trip.
- **Rollback strategy**: a `useRef<VisibilityState>` (`lastSaved`) holds the most recent server-confirmed values. On error, both the rendered state and the `lastSaved` ref are rolled back to that snapshot, and the message is surfaced via the `onError` prop (which MenuManager pipes into its existing `actionError` alert region — no per-row banners).
- **Saved-at indicator**: a small "Gemt HH:mm" line beneath the inputs gives the admin reassurance the change persisted, mirroring the pattern from `ScreenCycleSettingsAutoSave`.
- **Cleanup**: an `useEffect` cleanup clears any pending debounce timer on unmount, preventing a stale save firing after the row is removed (e.g. after a guest deletion).

The screen-toggle (Monitor button) keeps its existing pattern: optimistic local-state update, action runs in `useTransition`, rollback on error. No debouncing — toggle is a discrete user action, not a stream of edits.

## Accessibility notes

- "Synlighed" expander uses `aria-expanded` + `aria-controls` so screen-reader users get an explicit collapsed/expanded announcement.
- Checkbox + both datetime-local inputs have associated `<label>` elements via `htmlFor`/`id` (id includes the static key for uniqueness across rows on the page).
- `VisibilityBadges` icons carry both `title` and `aria-label` so the EyeOff/Clock indicators speak to assistive tech (matching dynamic-page badge a11y).
- Existing toggle's `aria-label` (`"${tooltip} — ${label}"`) now uses `subjectLabel(subject)` so static rows get sensible spoken labels (e.g. "Vis på Storskærm — Galleri") with no fork in the toggle component.

## Verification

- `npx tsc --noEmit` → exit 0, no output.
- ScreenAssignmentToggle's prop interface migrated to a discriminated union (`AssignmentSubject = { kind: 'page', ... } | { kind: 'static', ... }`); the existing call site in MenuManager was updated to pass `subject={{ kind: 'page', ... }}`. No other call sites of ScreenAssignmentToggle exist (verified by grep), so the rename is closed.

### Manual click-test list (for the user, after migrations 010 and 011 are applied)

1. Open `/admin/sider`. Each of the 8 static rows (Galleri, Deltagere, Hvor, Opgaver, Program, Kamera, Billeder, Minder) renders with: drag handle → icon → label → "Indbygget" badge (initially) → "Synlighed" expander.
2. The five eligible rows (Galleri, Deltagere, Hvor, Opgaver, Program) ALSO show a Monitor button on the right. Kamera, Billeder, Minder do NOT.
3. Click Galleri's Monitor button: assigns the primary screen, icon turns filled. Click again to remove.
4. Right-click (or long-press on touch) Deltagere's Monitor button: dropdown opens with all screens listed. Tick a non-primary screen — count badge appears.
5. Expand "Synlighed" on Deltagere, untick "Aktiv". Within ~500 ms the row label gets a strikethrough and an EyeOff icon appears next to it. The "Indbygget" badge disappears (it only shows when no custom record exists).
6. On the same row, set "Synlig fra" to a future timestamp (e.g. tomorrow). The Clock badge appears; the EyeOff badge disappears once "Aktiv" is re-ticked. The "Synlig fra ... — Indtil ..." line shows beneath the label.
7. Drag Galleri above Hvor. Order persists after a refresh.
8. Drag a dynamic page row (e.g. one created in Phase 6). Behaviour identical to before — chevron expands content, Monitor button works, no regressions.
9. With the page still open, edit a dynamic page's visibility via PageForm. Confirm the dynamic-page row visual treatment is unchanged.

## Risks / Follow-ups

- **Realtime visibility propagation**: per 08-CONTEXT.md and 08-01-SUMMARY.md, toggling a static item's `is_active` does NOT push to live screens — they only pick up the change on the next normal refetch trigger. Plan 08-05 may surface this as user-visible help text if it proves surprising.
- **No per-row "reset to default"**: if an admin upserts a static row then later wants to "remove the override and go back to absence-of-record", they'd have to delete the row via SQL (or we'd add a "Nulstil" button in a future increment). For v1 this is acceptable since the upserted values don't differ from the defaults unless the admin chose a non-default value.
- **datetime-local + UTC**: the `datetime-local` input is interpreted in the user's local timezone; we serialize to UTC ISO via `Date.toISOString()`. Same convention as PageForm. Admins in different timezones see the SAME wall-clock when reading another admin's window — a known limitation of HTML datetime-local across all admin UI in this project.
- **Static-toggle screen-eligibility set is hard-coded**: `SCREEN_ELIGIBLE_STATIC_KEYS` is a constant in MenuManager. If R25 expands later (e.g. add `minder`), update both the constant here AND ensure Plan 08-05's static-screen-renderer covers the new key. A misconfiguration where the toggle exists but no renderer is wired would render a blank screen step at runtime.
