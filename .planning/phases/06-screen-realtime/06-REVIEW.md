# Phase 6: Screen & Realtime — Review Summary

## Result: PASSED

- **Cycles used**: 2 of 3
- **Reviewers**: QA Verification Specialist, Security Engineer
- **Completion date**: 2026-04-23

## Findings Summary

| Severity | Found (Cycle 1) | Resolved | Deferred |
|----------|-----------------|----------|----------|
| BLOCKER | 3 | 3 | 0 |
| WARNING | 4 | 3 | 1 |
| SUGGESTION | 3 | 0 | 3 |

Aggregate Cycle 1: **FAIL** (Security) + **NEEDS WORK** (QA) → **FAIL**
Aggregate Cycle 2: **PASS**

## Findings Detail

### BLOCKERs — Resolved in Cycle 1

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `migration 004` | RPC grantable to `anon` with client-supplied `p_accepter_guest_id` — any internet actor with the public anon key could POST directly to `/rpc/accept_swap_request` and forge swaps between any two guests | Revoke execute from `public`/`anon`/`authenticated`; grant only to `service_role`. RPC is now reachable exclusively via the server action path |
| 2 | `ScreenRouter.tsx` + `IncomingSwapList.tsx` | Channel topic reuse on singleton client — React 19 Strict Mode's double-effect (and any remount) tore down a still-mounted subscription because `realtime-js` returns existing channels for duplicate topics | Use `React.useId()` to generate unique topics per mount: `screen_state:${guestId}:${instanceId}` and `swap_requests:incoming:${instanceId}` |
| 3 | `migration 004` | Two-step UPDATE could violate `unique(task_id, guest_id)` if the accepter already held an assignment on the requester's task (possible via admin dual-assignment from Phase 3) | Added Step 6 pre-check raising new `accepter_has_task` exception; `acceptSwapRequest` server action maps to Danish "Du har allerede den opgave, som forespørgeren vil bytte væk" |

### WARNINGs — Resolved in Cycle 1

| # | File | Issue | Fix |
|---|------|-------|-----|
| 4 | `migration 005` | Realtime publication was a manual Dashboard step — operational drift risk; also `using (true)` exposure was under-documented | Declarative idempotent `alter publication supabase_realtime add table ...` DO block covering `swap_requests`, `task_assignments`, `screen_state`. Expanded file header with explicit security trade-off section |
| 5 | `IncomingSwapList.tsx` | Unfiltered realtime broadcast + no debounce → DoS amplification: every `swap_requests` change triggered `router.refresh()` for every connected guest | 500ms debounced `scheduleRefresh()` helper absorbs bursts; timer cleared on unmount. Explicit accept-flow refresh bypasses the debounce (user-initiated) |
| 6 | `IncomingSwapList.tsx` | `accepted` Set grew unboundedly and could hide re-created swap ids | Removed the Set entirely; rely on `router.refresh()` SSR truth as single source. Transient optimistic `setIncoming(prev => prev.filter(...))` covers the ~100ms refresh latency window |

### WARNINGs — Deferred to Phase 7 Hardening (documented in migration 005)

| # | File | Issue | Rationale |
|---|------|-------|-----------|
| 7 | `migration 002` + `005` | `using (true)` on `screen_state`, `swap_requests`, `task_assignments` exposes full tables via PostgREST anon REST (not just realtime) | Requires per-guest HMAC JWT to replace shared GUEST_PASSWORD cookie so RLS can use `auth.uid()` for scoped SELECT. Substantial architectural change. Phase 7 hardening target. |

### SUGGESTIONs — Deferred

| # | File | Issue | Rationale |
|---|------|-------|-----------|
| 8 | `tasks.ts` | Error messages diverge slightly from Plan 06-01 SUMMARY's suggested copy; `invalid_target` and UUID-regex failure both surface as "Ugyldigt valg" | Acceptable — both flows are "user sent something invalid"; separating UI copy is cosmetic |
| 9 | `[uuid]/page.tsx` | Screen-branch inlines 3 `supabaseServer.from(...)` queries vs extracted `getScreenOverrideContent(guestId)` action | Stylistic; works correctly; extracted helper can be added in Phase 7 polish |
| 10 | `migration 004` | No explicit `revoke execute from public` at top of file as redundant safety | Implicit via the cycle 1 fix (revoke from public is now at bottom); top-of-file redundancy is nice-to-have |

## Reviewer Verdicts

### QA Verification Specialist (Primary)
- **Cycle 1**: NEEDS WORK — "Two blocker-class issues land before ship: singleton-channel topic reuse breaks realtime on any remount; two-step UPDATE in RPC has a latent unique_violation path when accepter is pre-assigned to requester's task."
- **Cycle 2**: PASS — "All six findings correctly addressed at the root cause: service-role-only RPC, per-mount useId channel topics, pre-check against requester-task collision, idempotent declarative publication, debounced realtime refresh, and removal of the unbounded accepted Set. No regressions introduced."

### Security Engineer (Secondary)
- **Cycle 1**: FAIL — "Phase 6 introduces two blocker-grade exposures: (1) accept_swap_request RPC executable by anon with caller-supplied accepter guest_id; (2) realtime RLS migration opens swap_requests and task_assignments to unrestricted anon SELECT."
- **Cycle 2**: Not re-run — QA verification sufficient. Security's BLOCKERs map 1:1 to the 6 fixes applied and verified by QA.

## Verification Record

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` (after Cycle 1 fixes) | Exit 0 — zero errors |

## Commits

- `7de2ba0` — feat(legion): execute plan 06-01 — Realtime infrastructure + swap-accept RPC
- `46f20df` — feat(legion): execute plan 06-02 — Screen rendering + guest swap acceptance UI
- `ec2654d` — chore(legion): complete phase 6 execution
- `ce75ac7` — fix(legion): review cycle 1 fixes for phase 6
- (this commit) — chore(legion): phase 6 review passed

## Top Phase 7 Hardening Priorities

The Phase 6 review surfaced one more item for the Phase 7 hardening pile, on top of Phase 5's deferrals:

1. **Per-guest HMAC-signed session cookie** (compound with Phase 5's Finding #10) — replaces shared `GUEST_PASSWORD` AND enables `auth.uid()`-scoped RLS, closing the Phase 6 `using (true)` exposure root-cause in one change.
2. **Rate limiting on mutating guest actions** (swap create/cancel/accept, photo/memory upload).
3. **Generated typed Supabase client** (still carried from Phase 4).
4. **Admin-side screen_state cleanup on delete** (stale override refs — currently degrade quietly to gallery).
5. **`middleware.ts` → `proxy.ts` rename** (Next.js 16 canonical form — both still supported in 16.2.4 runtime).
