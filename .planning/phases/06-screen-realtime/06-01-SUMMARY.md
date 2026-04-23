# Plan 06-01 — Realtime Infrastructure — SUMMARY

**Status**: Complete
**Date**: 2026-04-23
**Agent**: Backend Architect

## Files Created / Modified

- **Modified**: `src/lib/supabase/client.ts`
  - Added `getSupabaseBrowserClient()` singleton factory for Realtime subscriptions.
  - Retained the existing eager-exported `supabaseClient` (used by `InvitationUpload.tsx` and `EventForm.tsx` for Supabase Storage uploads) to preserve backwards compatibility. Both exports share the same anon-key and `NEXT_PUBLIC_SUPABASE_*` env requirements.
- **Created**: `supabase/migrations/004_swap_accept_rpc.sql`
  - `accept_swap_request(p_swap_id uuid, p_accepter_guest_id uuid, p_accepter_task_id uuid) returns void`
  - `security definer`, `language plpgsql`, `set search_path = public`
  - Granted to `anon, authenticated, service_role`.
- **Created**: `supabase/migrations/005_realtime_rls.sql`
  - `swap_requests_realtime_select` — anon SELECT true
  - `task_assignments_realtime_select` — anon SELECT true

## Verification

- `npx tsc --noEmit` → exit code **0** (clean).
- SQL files are not exercised by tsc; they will be verified when the user runs them in the Supabase SQL Editor (tracked in STATE.md Manual Actions).

## Decisions

### 1. RPC failure-mode taxonomy (5 exceptions)

The RPC raises these exact exception messages so the server action can map them to Danish user-facing strings:

| Exception | Trigger |
|---|---|
| `not_found` | `p_swap_id` does not exist OR `requester_assignment_id` points at a deleted row |
| `already_accepted` | `swap_requests.status` is not `'pending'` (i.e. already accepted or cancelled) |
| `invalid_target` | `p_accepter_task_id` is not in `desired_task_ids` (or list is null) |
| `not_assigned` | `p_accepter_guest_id` has no row in `task_assignments` for `p_accepter_task_id` |
| `self_accept` | `p_accepter_guest_id` equals the requester's current `guest_id` on the locked assignment |

### 2. Atomicity strategy

- **Serialization**: `FOR UPDATE` lock is taken on the `swap_requests` row first — this is the gate. Two concurrent callers racing to accept the same swap will block until the winner commits, at which point the loser sees `status = 'accepted'` and raises `already_accepted`.
- **Assignment swap**: Both `task_assignments` rows are locked `FOR UPDATE` before mutation. Guest IDs are swapped via two sequential `UPDATE`s. Because the unique `(task_id, guest_id)` constraint only fires at statement end (not mid-statement) and the two updates target different `id`s with no overlap on `(task_id, guest_id)` pairs (each task_assignment has a distinct task_id), the two-step update is safe without a sentinel value.
- **`is_owner` preservation**: Not swapped. Per the Phase 3 design note, `is_owner` describes the original assignee's relationship to the task and stays pinned to the row, not to the guest.

### 3. Realtime RLS scope — which tables stay closed

Opened to anon SELECT (so Supabase Realtime can emit change events):
- `swap_requests` (migration 005)
- `task_assignments` (migration 005)
- `screen_state` (already in migration 002)

Kept closed to anon (RLS enabled, zero policies = implicit deny-all):
- `guests`, `fest_info`, `events`, `event_locations`
- `choice_definitions`, `guest_choices`
- `performances`, `program_items`, `tasks`
- `memories`, `photos`
- `pages`, `gallery_config`, `app_settings`

All server-side queries continue to use the service role key which bypasses RLS — the opening of these two tables is strictly a Realtime-subscription affordance.

### 4. Singleton browser client

The new `getSupabaseBrowserClient()` memoises a single `SupabaseClient` instance in a module-scoped variable. Reasons:
- A single WebSocket (the Realtime socket) is shared across all components that subscribe — avoids socket fan-out per component mount.
- `autoRefreshToken: false` and `persistSession: false` — we do not use Supabase Auth; guest identity is carried by HMAC-signed admin/guest tokens in cookies.
- `eventsPerSecond: 10` — conservative rate that handles the expected swap volume without throttling.

## Issues / Concerns

1. **Supabase Realtime publication** — RLS SELECT policies are necessary but not sufficient. The user must enable the `supabase_realtime` publication for `swap_requests` and `task_assignments` in the Supabase Dashboard (Database → Replication). STATE.md Manual Actions already lists this as step 4 under First-time setup.
2. **Pre-existing eager anon client** — I did not remove `supabaseClient` (the eager export) because two Phase 2/4 admin components import it for Supabase Storage uploads and those files are explicitly out of scope for this plan. If a future plan consolidates to `getSupabaseBrowserClient()` everywhere, those two files need migration.
3. **`NEXT_PUBLIC_SUPABASE_ANON_KEY` env** — The existing `supabaseClient` already required this variable at module load, so the env should already be present in `.env.local`. No new env var introduced.

## Handoff to Plan 06-02

### Import paths

```ts
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
// Inside a 'use client' component:
const supabase = getSupabaseBrowserClient()
```

### RPC invocation (from a server action)

```ts
import { supabaseServer } from '@/lib/supabase/server'

const { error } = await supabaseServer.rpc('accept_swap_request', {
  p_swap_id,
  p_accepter_guest_id,
  p_accepter_task_id,
})
```

### Expected server action signature

```ts
// src/app/... — server action
'use server'
export async function acceptSwapRequest(
  swapId: string,
  accepterTaskId: string
): Promise<{ ok: true } | { ok: false; error: string }>
```

The accepter's guest_id comes from `assertGuest()` (middleware-injected `x-guest-id` header), so the caller does not pass it.

### Danish error-message mapping

| RPC exception | User-facing Danish string |
|---|---|
| `not_found` | `"Bytte-forespørgslen findes ikke længere."` |
| `already_accepted` | `"Denne bytte-forespørgsel er allerede accepteret."` |
| `invalid_target` | `"Den valgte opgave er ikke en del af denne bytte-forespørgsel."` |
| `not_assigned` | `"Du er ikke tildelt den valgte opgave."` |
| `self_accept` | `"Du kan ikke acceptere din egen bytte-forespørgsel."` |

Supabase returns PostgreSQL exception messages on `error.message`. The server action should `switch` on the exact string and fall back to a generic Danish error for unknown values.

### Realtime subscription pattern (for Plan 06-02)

```ts
const supabase = getSupabaseBrowserClient()
const channel = supabase
  .channel('swap-requests')
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'swap_requests' },
      (payload) => { /* refresh state */ })
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'task_assignments' },
      (payload) => { /* refresh state */ })
  .subscribe()

// On unmount:
supabase.removeChannel(channel)
```
