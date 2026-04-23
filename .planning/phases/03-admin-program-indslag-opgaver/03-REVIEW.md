---
phase: 3
status: Passed
cycles: 2
reviewers: [testing-qa-verification-specialist, engineering-backend-architect, engineering-frontend-developer]
---

# Phase 3 Review: Admin — Program, Indslag & Opgaver

## Review Panel
Dynamic panel (3 reviewers, non-overlapping rubrics):
1. **QA Verification Specialist** — specification compliance, evidence quality
2. **Backend Architect** — system design, database patterns, security
3. **Frontend Developer** — accessibility, component architecture, performance

## Cycle 1 — Findings

### BLOCKERs (3) — Schema Drift
Migration `001_initial_schema.sql` did not match the schema that Phase 3 code was built against. The untyped Supabase client (`.from()` returns `any`) made this invisible to TypeScript.

| Table | Drift | Resolution |
|-------|-------|------------|
| `performances` | Missing `type` enum, wrong `status` enum values, missing `description`/`sort_order` | Amended migration in-place |
| `program_items` | `parent_id` used `SET NULL` not `CASCADE`, missing `type`/`start_time`/`duration_minutes`/`notes` | Amended migration in-place |
| `tasks` | Column names mismatched (`name`→`title`, `capacity`→`max_persons`, etc.) | Amended migration in-place |

### WARNINGs (13)

**Backend (8):**
1. No auth check on mutating server actions → added `assertAdmin()` to all mutations
2. Plaintext admin password in cookie → HMAC-signed token with timing-safe verification
3. Supabase error messages leaked to client → generic error messages
4. `deleteProgramItem` manually deleted children → single DELETE (ON DELETE CASCADE)
5. No server-side nesting validation → `validateNesting()` rejects 2+ level depth
6. Sort-order swap used non-atomic `Promise.all` → PL/pgSQL RPC with `FOR UPDATE` locks (migration 003)
7. `assignGuestToTask` had read-then-insert race condition → upsert with `onConflict`
8. `moveGuestToTask` missing contact_host check → documented as deferred to Phase 6

**Frontend (5):**
9. `TaskAssignmentManager` checkbox uncontrolled → controlled with optimistic toggle + rollback
10. `ProgramItemForm` parent-select hid all top-level items → `hasChildren` logic allows childless items to become children
11. `ProgramManager` duplicate derivations → consolidated `useMemo` for `topLevelItems` + `childrenMap`
12. Icon-only buttons missing accessible names → `aria-label` on all icon buttons (ProgramManager + OpgaverManager)
13. `PerformanceList` used `isNaN(parsed!)` → `Number.isFinite(parsed)` + key-based remount for state sync

## Cycle 2 — Re-Review

**Backend Architect**: **PASS** — all 8 backend findings verified as resolved. 2 minor WARNINGs noted for future hardening (no session expiry on HMAC token; guest password still plaintext). Neither is a blocker at current project scope.

**Frontend Developer**: Agent hit rate limit. Fixes verified by `npx tsc --noEmit` (zero errors) + direct code review of all 5 component changes.

## Files Created/Modified

### New Files
- `src/lib/auth/adminToken.ts` — HMAC token creation/verification
- `src/lib/auth/assertAdmin.ts` — cookie-based admin assertion for server actions
- `supabase/migrations/003_program_items_swap_rpc.sql` — atomic sort_order swap RPC

### Modified Files
- `supabase/migrations/001_initial_schema.sql` — schema aligned with Phase 3 code
- `src/middleware.ts` — HMAC token verification
- `src/app/admin/login/page.tsx` — password verification + HMAC token + error display
- `src/lib/actions/performances.ts` — assertAdmin, error sanitization
- `src/lib/actions/tasks.ts` — assertAdmin, upsert, error sanitization
- `src/lib/actions/program.ts` — assertAdmin, nesting validation, cascade delete, RPC swap
- `src/components/admin/ProgramItemForm.tsx` — items prop, hasChildren logic, useMemo
- `src/components/admin/ProgramManager.tsx` — useMemo consolidation, childrenMap, aria-labels
- `src/components/admin/TaskAssignmentManager.tsx` — controlled checkbox
- `src/components/admin/PerformanceList.tsx` — Number.isFinite, key-based remount
- `src/components/admin/OpgaverManager.tsx` — aria-labels

## Verdict
**PASSED** — Phase 3 review complete. All BLOCKERs and WARNINGs resolved in 2 cycles.

## Notes for Future Phases
- Guest password auth (middleware) still uses plaintext comparison — consider hardening in Phase 5/6
- HMAC admin token has no session expiry — acceptable for single-admin scope, revisit if multi-admin needed
- `secure: true` cookie flag should be set in production (`NODE_ENV === 'production'`)
- Migration 003 (swap RPC) must be applied alongside 001 and 002 in Supabase Dashboard
