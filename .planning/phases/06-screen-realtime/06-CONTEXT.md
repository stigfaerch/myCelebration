# Phase 6: Screen & Realtime — Context

## Goal
Screens receive realtime admin overrides and render dynamic content; swap requests propagate live to all eligible guests; atomic first-writer-wins accept semantics prevent double-accept races.

## Requirements
- **R17 (realtime part)** — `/{uuid}/opgaver`: bytte-forespørgsler opdateres realtime hos alle berørte deltagere; concurrent-accept scenario håndteres korrekt (den der accepterer først vinder)
- **R23** — Screen-deltager type: default visning + realtime admin-overskrivning der forbliver aktiv indtil admin aktivt vælger andet

## Prior Phase Handoffs

### From Phase 1 (Foundation)
- `src/lib/supabase/server.ts` exports `supabaseServer` (service role) — bypasses RLS, server-only
- RLS is enabled on ALL tables in `supabase/migrations/002_rls.sql`
- Only existing RLS policy: `screen_state_realtime_select` (anon SELECT on screen_state)
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in env; will also use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for browser realtime

### From Phase 3 (Admin Program, Indslag & Opgaver)
- `swap_program_items` RPC pattern (migration 003) uses `FOR UPDATE` locks + `security definer` — reuse as template for `accept_swap_request`

### From Phase 4 (Admin Medier, Sider & Galleri)
- `screen_state` table with `current_override` (enum: page/photo/memory/gallery/program) + `override_ref_id` + `updated_at`
- Admin "Vis på skærm" buttons on sider/billeder/minder/galleri already upsert screen_state rows
- `clearScreenOverridesFor(type, id)` in `src/lib/actions/screen.ts` used by delete actions

### From Phase 5 (Gæste-sider)
- Screen-type guest branch exists in `src/app/[uuid]/page.tsx` (currently shows only festinfo)
- Guest swap creation (`createSwapRequest`) in `src/lib/actions/guest/tasks.ts`
- `TaskList` / `SwapRequestForm` components render swap state from props (no realtime yet)
- Guest auth via `resolveGuest()` / `assertGuest()` / `assertNotScreen()` from middleware-forwarded headers
- Phase 5 review passed cycle 2 after middleware fix (header forwarding)

## Database Tables Used (Phase 6)

- `screen_state` (Phase 4) — realtime subject; already has anon SELECT policy
- `swap_requests` (Phase 1 schema) — needs anon SELECT policy added for realtime
- `task_assignments` (Phase 1) — needs anon SELECT policy for realtime join; muting sensitive columns if any
- `guests`, `tasks` — used for joining display data; evaluate whether anon SELECT needs opening (preference: keep closed; join server-side when resolving swap display)

## Realtime Architecture

**Two independent subscriptions**:

1. **Screen override subscription** (per screen guest)
   - Subject: `screen_state` UPDATE where `guest_id = <this screen's id>`
   - On receipt: re-query `screen_state` row (the update payload may omit projected columns); then re-fetch the referenced content (page/photo/memory)
   - Default state: when `current_override = null`, render the gallery

2. **Incoming swap subscription** (per non-screen guest)
   - Subject: `swap_requests` INSERT (and UPDATE for status changes)
   - Client-side filter: only show swaps whose `desired_task_ids` overlap with the current guest's assigned `task_id`s (Supabase Realtime doesn't support array-contains filters; broadcast all and filter in browser)
   - On accept: call `acceptSwapRequest(swapId)` server action → PL/pgSQL RPC → atomic transfer

## Atomic Swap Accept — Concurrent-Accept Protection

Two guests could try to accept the same swap simultaneously. First must win; second must get a clear error.

**Approach**: PL/pgSQL function `accept_swap_request(swap_id, accepter_guest_id, accepter_task_id)` with:
- `SELECT ... FOR UPDATE` on the `swap_requests` row inside the function body — this serializes concurrent callers
- Inside the lock: assert `status = 'pending'`; raise `EXCEPTION 'already_accepted'` if not
- Verify `accepter_task_id` belongs to `accepter_guest_id` and is in the swap's `desired_task_ids`
- Update the two task_assignments rows to swap guest_ids atomically
- Set `swap_requests.status = 'accepted'`
- `security definer` so anon-triggered callers execute with elevated privs (server action is the anon-bridge)

## Auth for Swap Accept

The `acceptSwapRequest` server action uses `resolveGuest()` + service-role client to call the RPC. The RPC itself accepts `accepter_guest_id` as a parameter but the server action passes the resolved guest id (not client-supplied). Client can never invoke RPC directly — only via the server action, which performs ownership checks before calling.

## Codebase Conventions (relevant to Phase 6)
- Async Server Components; `params: Promise<{ uuid: string }>`; `headers()` async
- `'use client'` for realtime subscription components (React effects + Supabase channel)
- Supabase browser client: import `createClient` from `@supabase/supabase-js`, pass `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Generic error messages on all server actions; `revalidatePath` after mutations
- Match Phase 3's RPC pattern: `create or replace function ... language plpgsql security definer ... begin ... end;` + `grant execute on function ... to anon, authenticated;` (service_role has execute by default)
- shadcn/ui Base UI (no asChild)
- TypeScript strict, React 19, `useTransition`

## Plan Structure

| Plan | Wave | Agent | Focus |
|------|------|-------|-------|
| 06-01 | 1 | Backend Architect | Browser Supabase client + swap-accept RPC (migration 004) + realtime RLS policies (migration 005) |
| 06-02 | 2 | Senior Developer | Screen dynamic rendering (subscription + viewers) + guest incoming-swap UI + accept/contention UX |

Wave 2 depends on Wave 1 — imports browser client and calls RPC.

## File Disjointness

**Plan 06-01 files**:
- `src/lib/supabase/client.ts` (NEW — browser anon client)
- `supabase/migrations/004_swap_accept_rpc.sql` (NEW)
- `supabase/migrations/005_realtime_rls.sql` (NEW — extend anon-select policies for swap_requests + task_assignments)
- `.planning/STATE.md` (add manual action for running migrations 004 + 005)

**Plan 06-02 files**:
- `src/app/[uuid]/page.tsx` (MODIFY — replace screen branch with `<ScreenRouter uuid={uuid} guestId={guest.id} />`)
- `src/app/[uuid]/opgaver/page.tsx` (MODIFY — surface incoming swaps)
- `src/lib/actions/guest/tasks.ts` (MODIFY — add `acceptSwapRequest(swapId, accepterTaskId)` + `getIncomingSwapRequests()` getter)
- `src/components/screen/ScreenRouter.tsx` (NEW)
- `src/components/screen/ScreenDefault.tsx` (NEW — gallery fallback wrapper)
- `src/components/screen/ScreenPage.tsx` (NEW)
- `src/components/screen/ScreenPhoto.tsx` (NEW)
- `src/components/screen/ScreenMemory.tsx` (NEW)
- `src/components/guest/IncomingSwapList.tsx` (NEW — client with realtime subscription)

No overlap between 06-01 and 06-02.

## Success Criteria
- Screen guest's `/{uuid}` page re-renders within ~1 second when admin clicks "Vis på skærm" in any admin view
- Screen default state (no override) shows the gallery
- Guest with a task targeted by someone's swap sees the request appear in their `/opgaver` without reloading
- Two guests attempting to accept the same swap: one succeeds, the other sees "Denne bytte-forespørgsel er allerede accepteret" error cleanly
- Swap acceptance atomically transfers task_assignment guest_ids and sets status to `accepted`
- All existing Phase 5 flows still work (no regressions)
- RLS holds: anon can SELECT screen_state, swap_requests, task_assignments (read-only subscriptions); cannot INSERT/UPDATE/DELETE; all mutations still go via service-role server actions
- `npx tsc --noEmit` clean after each plan

## Out of Scope (Phase 6)
- Per-screen configurable default page (defer — default is always gallery)
- Realtime gallery (photos/memories appearing live) — acceptable as Phase 7 polish
- Admin-side realtime (admin page refreshes after own mutations already suffice)
- Swap request rejection UX (cancellation via requester already exists; targeted-guest rejection deferred)
- Rate limiting on accept calls
