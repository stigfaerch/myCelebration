# Phase 6 / Plan 06-02 — Realtime UI Layer

Status: Complete

## Scope

Plan 06-02 delivered the realtime UI layer on top of Plan 06-01's infrastructure
(browser anon client, `accept_swap_request` RPC, anon RLS SELECT on `screen_state`,
`swap_requests`, `task_assignments`).

Three user-visible capabilities landed:

1. **Screen-type guest page** subscribes to `screen_state` and re-renders on
   override change. Default state (no active override) is the gallery.
2. **Non-screen guest** sees incoming swap requests live on `/opgaver`.
3. **Accept flow** calls the server action `acceptSwapRequest`, which invokes
   the atomic RPC and maps contention errors to Danish copy.

## Files Created

- `src/components/screen/ScreenRouter.tsx` — client-side realtime wrapper;
  subscribes to `screen_state` filtered on `guest_id` and calls
  `router.refresh()` on change; renders `{children}` unchanged.
- `src/components/screen/ScreenDefault.tsx` — full-viewport wrapper around
  `<GalleryHorizontal>` on black background.
- `src/components/screen/ScreenPage.tsx` — large centered title +
  `<RichTextDisplay>` on a dark background, full viewport (`prose-invert`).
- `src/components/screen/ScreenPhoto.tsx` — fullscreen `<img>` (`object-contain`)
  on black background with ESLint `no-img-element` suppression.
- `src/components/screen/ScreenMemory.tsx` — two layouts (with/without image),
  type badge top-right, Danish type labels (Sjov / Højtidelig / Hverdag /
  Milepæl) with colored pill, `da-DK` date formatter.
- `src/components/guest/IncomingSwapList.tsx` — client component. Subscribes to
  `swap_requests` (broadcast-then-refresh), renders one row per incoming swap,
  offers a `<select>` for the accepter's task when multiple matches exist, and
  drives `acceptSwapRequest` via `useTransition` with optimistic removal and a
  per-row error display.
- `.planning/phases/06-screen-realtime/06-02-SUMMARY.md` — this file.

## Files Modified

- `src/app/[uuid]/page.tsx` — Replaced the screen-type festinfo-only branch
  with a full resolver: reads `screen_state`; branches on
  `current_override` ∈ {`page`, `photo`, `memory`}; falls back to a gallery
  render (`ScreenDefault`) for null / `gallery` / `program` / stale references.
  Wraps the resolved content in `<ScreenRouter guestId=…>` so the client
  subscribes and triggers refresh on override change.
- `src/app/[uuid]/opgaver/page.tsx` — Added `getIncomingSwapRequests()` to the
  `Promise.all`, built a `taskTitleMap` from the caller's assignments, and
  rendered `<IncomingSwapList>` above `<TaskList>`.
- `src/lib/actions/guest/tasks.ts` — Added:
  - `IncomingSwapRequest` interface
  - `normalizeFirst<T>` helper (PostgREST embed shape variance)
  - `getIncomingSwapRequests()` — three-step server read: (1) my assignments
    to capture `myTaskIds`, (2) `swap_requests` where `status='pending'` and
    `desired_task_ids OVERLAPS myTaskIds`, (3) resolve requester assignment
    → guest name + task title via an `.in('id', …)` second query. Filters out
    self-originated swaps and computes `my_matching_task_ids` per swap.
  - `acceptSwapRequest(swapId, accepterTaskId)` — `assertNotScreen`, UUID
    validation, `supabaseServer.rpc('accept_swap_request', { … })`, Danish
    error mapping keyed on the RPC's exception substrings (`not_found`,
    `already_accepted`, `invalid_target`, `not_assigned`, `self_accept`),
    `revalidatePath('/' + guest.id + '/opgaver')`.

## Verification

| Command | Result | Pass |
|---|---|---|
| `npx tsc --noEmit` | Exit 0, no output | Yes |

### Manual Test Plan

Reproduce these flows manually before declaring the phase done at the QA gate.

1. **Screen realtime override**: open `/admin/sider` and invoke the "Vis på
   skærm" action targeting an existing screen guest; observe the guest's
   `/[uuid]` page re-render to `<ScreenPage>` within ~1 second. Repeat for
   photos (from `/admin/billeder`) and memories (from `/admin/minder`).
2. **Default state (no override)**: clear the `current_override` for a screen
   (or invoke "Vis galleri"); the guest page shows `<ScreenDefault>` with
   `<GalleryHorizontal>` filling the viewport.
3. **Incoming swap live**: open two browsers. Browser A (guest Alice) is on
   `/[alice-uuid]/opgaver`. Browser B (guest Bob) creates a swap request
   desiring one of Alice's tasks. Alice sees the row appear without refresh.
4. **Concurrent accept**: Alice opens two tabs on `/opgaver`. Both see the
   same incoming swap. Both click "Acceptér bytte" within the same second.
   One succeeds (row disappears); the other shows
   "Denne bytte-forespørgsel er allerede accepteret".
5. **Regression check**: on Phase 5 flows — `createSwapRequest`,
   `cancelSwapRequest`, `TaskList`, forside rendering for non-screen guests —
   no behavioral change.

## Key Decisions

- **`router.refresh()` over payload-driven updates.** The realtime channel is
  used purely as an invalidation signal. The server re-executes the server
  component which re-derives state via the existing server actions. This
  avoids dual-source-of-truth drift (RLS is also the ultimate filter) and
  reuses the exact same code paths as the initial render.
- **Broadcast-then-filter for `swap_requests`.** Supabase Realtime filters
  are equality-only; there is no array-overlap operator. The client
  subscribes unfiltered and `router.refresh()` always triggers the
  server-side `getIncomingSwapRequests()` which applies the overlap query.
  Cost is negligible (tens of swap rows over a wedding's lifetime, ~1 event
  per swap create/cancel/accept).
- **`taskTitleMap` pass-through.** Titles are resolved server-side (the page
  already has assignments) and passed as a plain `Record<string,string>` to
  the client component, avoiding a second client-side fetch for a static lookup.
- **Inline default gallery fetch in page.tsx.** Rather than a named helper,
  the fallback `getGalleryItems()` call runs inline after all override
  branches have failed to produce content. Screen requests are rare and each
  renders once per override change, so the extra branch is cheap and keeps
  the flow linear and readable in one file.
- **Screen fallback on stale ref.** If an override references a deleted
  `page`/`photo`/`memory`, the resolver quietly falls back to the gallery
  instead of rendering an error. This is the most defensible "blank screen"
  avoidance behavior for a public display.
- **Full-viewport black backgrounds.** Every screen variant uses `bg-black`
  or `bg-slate-950` + fixed viewport dimensions so layout shell padding from
  `GuestLayoutShell` doesn't bleed through the content.
- **Danish error copy matches Plan 06-01 handoff.** The RPC raises
  `PLPGSQL_EXCEPTION` with the keyword embedded in `error.message`; the
  server action does a case-insensitive substring match to select the
  user-facing translation.

## Open Issues

- **Supabase Realtime publication** must list `screen_state`, `swap_requests`,
  `task_assignments`. Already documented in `STATE.md`; flag for production
  bootstrap so the schema migration includes the publication.
- **HEIC on screens.** Safari's `image/heic` is the only browser that
  renders HEIC natively. The `Camera` component already normalizes captures
  to JPEG, so this is expected-behavior rather than a bug. Callout remains
  for admin uploads if anyone uploads HEIC via a future admin form.
- **Self-healing stale override.** If an admin deletes a `page`/`photo`/
  `memory` while it is actively displayed on a screen, the screen falls
  back to gallery but the `screen_state` row still holds the stale ref.
  Admin-side cleanup or a server-side trigger could null it out. Not
  blocking; documented as Phase 7 candidate.

## Handoff to Phase 7

- **Per-screen configurable default**: currently hardcoded to gallery. Add a
  `screen_guests.default_mode` enum (`gallery` | `page:<id>` | `memory:<id>`)
  or similar so admins can pin a screen's home view.
- **Realtime for new photos/memories in gallery**: currently the gallery
  client does not subscribe; only the override switch triggers a re-render.
  Add a secondary `photos`/`memories` subscription on `ScreenDefault` so
  newly uploaded content appears live without admin intervention.
- **Admin-side realtime**: give admins a live preview of which override is
  active per screen (mirror of this plan's subscription, filtered to the
  admin's organization).
- **Rate limiting on accept calls**: the RPC is atomic but unthrottled. Two
  tabs racing works correctly. Ten bots racing against the RPC could
  saturate Postgres. Add an Upstash rate limiter or Supabase function-level
  throttle before opening to a large guest list.
- **Full realtime regression test plan**: Playwright E2E that exercises
  override flipping, incoming swap delivery, and concurrent accept with two
  contexts. Manual QA passes are documented here but a scripted run gates
  future refactors safely.
