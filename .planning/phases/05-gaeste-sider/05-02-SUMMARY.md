# Plan 05-02 — Guest Forside & Opgaver — Summary

**Status**: Complete

## Files Created

### Server actions (all `'use server'`)
- `src/lib/actions/guest/performances.ts` — `getMyPerformances`, `createPerformance`, `updatePerformance`, `deletePerformance`. Ownership enforced via combined `.eq('id', id).eq('guest_id', guest.id)` for update/delete. `status` and `sort_order` are admin-only and never written from this module.
- `src/lib/actions/guest/choices.ts` — `getChoiceDefinitions` (requires any authenticated guest), `getMyChoiceAnswers`, `upsertChoiceAnswer` (null/empty → delete row; otherwise upsert on `guest_id,choice_definition_id`; text answers capped at 500 chars).
- `src/lib/actions/guest/invitations.ts` — `getMyInvitation`, `acceptInvitation`. **The schema has no `invitations` table**; acceptance is a boolean on the `guests` row (`invitation_accepted`, `invitation_accepted_by`). The shared invitation file URL is sourced from `fest_info.invitation_url`.
- `src/lib/actions/guest/tasks.ts` — `getMyAssignments` (with `normalizeTask` for PostgREST embed shape), `getAssignmentCount`, `getSwappableTasks`, `getMySwapRequests`, `createSwapRequest`, `cancelSwapRequest`. Swap flow validates target tasks don't have `contact_host=true` and that `desiredTaskIds` all exist.

### Client components
- `src/components/guest/InvitationAccept.tsx` — shows invitation link if present; accepted state or "Acceptér invitation" button.
- `src/components/guest/TaskIndicator.tsx` — muted "Du har ingen opgaver." when 0, else a linkable card to `/{uuid}/opgaver`.
- `src/components/guest/ChoiceAnswers.tsx` — binary checkbox / multichoice radio-or-select (>4 options) / text textarea (max 500 chars). Debounces text at 500ms, instant for binary/multichoice. Per-row "Gemmer…/Gemt/error".
- `src/components/guest/PerformanceManager.tsx` — list with inline edit, create form toggle, optimistic delete with rollback on error, status badge (pending/approved/rejected/scheduled), type translation to Danish.
- `src/components/guest/TaskList.tsx` — assignment cards with owner/byttet badge, truncate-and-expand description, contact_host amber warning (no swap), pending swap info + cancel, otherwise "Foreslå bytte" toggle.
- `src/components/guest/SwapRequestForm.tsx` — checkbox multiselect of swappable tasks with title/location/due_time, validates at least one selected.

### Pages
- `src/app/[uuid]/opgaver/page.tsx` — server component; fetches assignments, swap requests, swappable tasks in parallel; rejects screen type early.

## Files Modified
- `src/app/[uuid]/page.tsx` — replaced skeleton. Screen-type guests see only the fest_info description (TipTap rendered via `RichTextDisplay`). Non-screen guests see: festinfo, InvitationAccept, TaskIndicator, ChoiceAnswers, PerformanceManager. All non-screen data is fetched in `Promise.all` to avoid waterfalls.

## Verification

### TypeScript
```
npx tsc --noEmit
EXIT_CODE=0
```

### Lint (Plan 05-02 files only)
```
npx eslint src/lib/actions/guest src/components/guest/{InvitationAccept,PerformanceManager,ChoiceAnswers,TaskIndicator,TaskList,SwapRequestForm}.tsx src/app/\[uuid\]/page.tsx src/app/\[uuid\]/opgaver/page.tsx
EXIT=0
```

Note: broader lint on the whole `src/components/guest/` tree reports errors in `GalleryHorizontal.tsx`, `MemoryManager.tsx`, `PhotoGrid.tsx`, and `src/app/[uuid]/hvor/page.tsx` — these are Plan 05-03 / pre-existing files outside the scope of this plan, per the instructions. They are not regressions.

## Key Decisions

1. **No `invitations` table exists** — the plan document and execution brief both referenced a separate `invitations` table, but the migration (`001_initial_schema.sql`) only has `guests.invitation_accepted` and `fest_info.invitation_url`. I modeled `MyInvitation` as `{ accepted, accepted_by, invitation_url }` assembled from those two sources. `acceptInvitation()` updates `guests.invitation_accepted = true` and `invitation_accepted_by = 'guest'` (the admin-acceptance path already uses `'admin'`).

2. **Performance enum values** — used the actual schema enum `'speech' | 'toast' | 'music' | 'dance' | 'poem' | 'other'` (with `toast` and `poem` rather than the prompt's `game`/`video`/`song`) and `performance_status` of `'pending' | 'approved' | 'rejected' | 'scheduled'`. Danish labels map matches Phase 3's `PerformanceList`.

3. **Swap status enum** — schema defines `'pending' | 'accepted' | 'cancelled'` only (no `'rejected'`). Pending-swap detection in `TaskList` filters on `status === 'pending'`.

4. **Prop-sync pattern** — the project's ESLint config (React 19) bans `setState` inside `useEffect` (rule `react-hooks/set-state-in-effect`). I used the React 19 idiomatic pattern: store previous prop in state and compare during render:
   ```ts
   const [prev, setPrev] = useState(propValue)
   if (prev !== propValue) { setPrev(propValue); setLocalState(propValue) }
   ```
   Phase 4's `MemoryManager.tsx` / `PhotoGrid.tsx` still use the old `useEffect` pattern and trigger the lint error — noted as pre-existing tech debt.

5. **Screen-type guards** — both pages reject screen-type in the server component before any guest data is fetched. The forside falls back to festinfo only (matching plan decision); the opgaver page shows a short "Ikke tilgængelig for skærme." message. Server actions that mutate state call `assertNotScreen()` as a second defense.

6. **Ownership enforcement pattern** — for update/delete on guest-owned rows, I use a single combined WHERE (`.eq('id', id).eq('guest_id', guest.id)`) rather than a two-step SELECT-then-UPDATE. For swap actions, a SELECT-first check is used because the swap operation joins through `swap_requests.requester_assignment_id → task_assignments.guest_id`.

7. **Swappable tasks filter** — excludes tasks already assigned to the current guest AND tasks with `contact_host=true`, computed in the action (application-side filter after fetch). Simpler than a PostgREST NOT IN subquery and avoids untyped-client quirks.

8. **Generic error messages** — every action throws `new Error('Failed to <verb>')` (English) or Danish `'Ugyldige bytte-mål'` for user-facing validation. Supabase `error.message` is never leaked.

9. **Optimistic updates** — only on `PerformanceManager.handleDelete` (with rollback on error). Other mutations rely on `router.refresh()`; the delay is acceptable because the server action returns before `revalidatePath` propagates.

10. **Debouncing** — `ChoiceAnswers` debounces text input at 500ms, but binary/multichoice saves immediately (single-click interaction). `router.refresh()` is called after each save so subsequent renders get fresh server state.

## Issues / Pre-existing Debt

- **Phase 4 prop-sync pattern is lint-dirty**: `src/components/guest/MemoryManager.tsx` and `src/components/guest/PhotoGrid.tsx` use `useEffect(() => setX(prop), [prop])` which violates `react-hooks/set-state-in-effect`. Out of scope for this plan — flag for a cleanup pass.
- **Phase 4 GalleryHorizontal**: defines `<Frame>` component inside the render function, triggering `react-hooks/static-components`. Out of scope.
- **`src/app/[uuid]/hvor/page.tsx`**: has a `no-explicit-any` error. Out of scope.
- **Untyped Supabase client**: all new action files rely on `as` casts for row shapes; this is the project convention. A typed client (via `supabase gen types`) would eliminate these casts but is a phase-level decision.

## Handoff Notes for Phase 6 (Realtime)

The following integration points are ready for realtime subscriptions:

1. **Swap request subscription** — when an admin accepts a swap in Phase 6:
   - The client should subscribe to `swap_requests` (filtered by `requester_assignment_id IN <my-assignment-ids>`) and/or `task_assignments` (filtered by `guest_id = my-guest-id`).
   - On change, re-fetch via `getMyAssignments()` and `getMySwapRequests()`. `TaskList` already re-derives the pending-swap map from props, so simply calling `router.refresh()` from a subscription handler is sufficient.
   - The current status set is `'pending' | 'accepted' | 'cancelled'` — Phase 6 should add UI states for `'accepted'` (e.g., "Bytte godkendt" — green banner).

2. **Choice answer subscription** (useful for admin dashboards, not the guest themselves) — admin screens in Phase 6 may want to subscribe to `guest_choices` to watch responses roll in. No guest-side change needed.

3. **Invitation acceptance** — no realtime required; one-shot mutation with `revalidatePath`.

4. **Performance status changes** — when admin approves/rejects/schedules a performance:
   - The guest currently sees stale status until refresh.
   - Phase 6 could subscribe `PerformanceManager` to `performances` filtered by `guest_id = my-guest-id` and re-fetch on change. The component already prop-syncs from `initialPerformances`, so a simple `router.refresh()` from a subscription handler will flow through cleanly.

5. **Typing** — all new server actions export typed return shapes (`MyPerformance`, `ChoiceDefinition`, `MyAssignment`, `MySwapRequest`, `SwappableTask`, `MyInvitation`). Phase 6 components can reuse these types for realtime payload shapes.
