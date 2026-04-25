# Phase 8: Static-item Visibility & Screen Rendering — Review Summary

## Result: PASSED (with documented follow-up)

## Cycles Used
1 of 3 (max). Cycle 2 skipped — fixes were mechanical and surgical; deferred finding is by user direction.

## Reviewers
- testing-qa-verification-specialist (primary)
- testing-test-results-analyzer (secondary)

## Completion Date
2026-04-25

## Findings Summary

| Type | Found | Resolved | Deferred |
|---|---|---|---|
| BLOCKERs | 0 | 0 | 0 |
| WARNINGs | 5 | 4 | 1 |
| SUGGESTIONs | 8 | 0 | 8 |

## Findings Detail

| # | Severity | File | Issue | Status | Resolution / Cycle |
|---|---|---|---|---|---|
| QA-1 | WARNING | `src/lib/actions/screenAssignments.ts:781` | `getHydratedMixedScreenItems` lacked identity gating — cross-guest leak | ✓ Fixed | Cycle 1: added screen-self-OR-admin gate using proxy headers + assertAdmin fallback |
| QA-7 | WARNING | `src/components/screen/ScreenPageCycle.tsx:101` | Silent black fallback on unknown staticKey — no observability | ✓ Fixed | Cycle 1: console.warn + visible "Ukendt skærm-element: <key>" label |
| Test-1 | WARNING | `tests/smoke/` (none) | Zero Playwright tests for Phase 8 features | ⏸ Deferred | User direction — track as follow-up phase or quick task |
| Test-3 | WARNING | `08-05-SUMMARY.md` | Migration 009 DELETE realtime claim unverified for static rows | ✓ Fixed | Cycle 1: added "Manual realtime DELETE verification" block (steps 7–9) covering insert/remove + mixed cycle DELETE + legacy shadow edge case |
| Test-4 | WARNING | `08-02-SUMMARY.md` | `hasAnyScreenAssignments` static-only behavior unverified | ✓ Fixed | Cycle 1: added "Manual SQL verification of hasAnyScreenAssignments" block covering empty/page-only/mixed/static-only |

### Suggestions (not addressed — recorded for future polish)

| # | File | Suggestion |
|---|---|---|
| QA-2 | `screenAssignments.ts:494` | Add inline audit comment to `updateScreenCycleSettings` bump query so future maintainers don't add a `kind='page'` filter |
| QA-3 | `staticItemVisibility.ts:137` | Move pure `isStaticItemVisibleNow` helper out of `'use server'` module so callers can use sync |
| QA-4 | `migration 011, lines 80-83` | Defensive constraint-drop by `pg_constraint` lookup instead of relying on Postgres default name |
| QA-5 | `MenuManager.tsx:64` | Export `SCREEN_ELIGIBLE_STATIC_KEYS` from `navItems.ts` typed as `Set<StaticNavKey>` so future additions are TS-enforced |
| QA-8 | `StaticItemVisibilityControls.tsx:147` | Use `React.startTransition` instead of bare IIFE for save consistency |
| Test-2 | doc | Manual-test list should require menu+route consistency check in same session |
| Test-5 | doc | Document legacy `showOnPrimaryScreen` shadowing edge case (covered by Cycle 1 doc fix step 9) |
| Test-6 | observability | Add `console.time` around `getHydratedMixedScreenItems` in dev mode for tick-latency spot-checks |
| Test-7 | doc | Manual-test list should exercise auto-save rollback path (offline mode + re-toggle) |

## Reviewer Verdicts

**testing-qa-verification-specialist** — Final: PASS (after Cycle 1 fixes addressed both code-level WARNINGs)
- "All BLOCKER-style issues are absent. Code is correct as written. Two warnings (cross-guest data leak, silent observability gap) closed. Production readiness: PASS with the deferred Playwright coverage acknowledged."

**testing-test-results-analyzer** — Final: PASS-with-deferred (after Cycle 1 doc fixes)
- "Code level passes. Documentation gaps (manual-test lists for the migration 009 invariant + the hasAnyScreenAssignments behavioral shift) are now covered. The remaining gap — automated Playwright coverage for Phase 8 features — is real but explicitly accepted by user direction. Recommend tracking as a follow-up phase or quick task before any production deployment to a multi-screen event."

## Aggregate Verdict

PASS-with-documented-follow-up. The phase delivers what it promised:
- Schema + actions for static-item visibility (R24)
- Polymorphic screen assignments + 4 new screen renderers + cycler refactor (R25)
- Admin UI parity for visibility + screen-toggle on static items
- Guest menu filter + 8 route notFound() guards
- Strict-blank invariant preserved; animateIn initial-true regression-fix preserved

## Follow-up Recommendation

Before promoting Phase 8 to a real-event deployment:
1. **Apply migrations 010 and 011** in Supabase Dashboard SQL Editor (still pending per user — none of the code paths exercise the new schema yet without migration application)
2. **Run the manual-test lists** in the SUMMARY files — particularly the new realtime DELETE pass in 08-05 and the SQL counter-pass in 08-02
3. **Consider scheduling a follow-up phase or quick task** to add Playwright smoke specs covering: (a) static-item visibility 404 guards, (b) polymorphic cycler with mixed page+static items, (c) realtime DELETE propagation for static rows. Test-1 finding documented this scope.

## User Override
None. All blocking warnings either resolved (4) or deferred by explicit user choice with documentation patch (1).
