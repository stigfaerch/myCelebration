---
plan: 03-02
status: Complete
agent: engineering-senior-developer
wave: 2
---

# Plan 03-02 Summary: /admin/program

## Status
Complete

## Files Created/Modified
- `src/lib/actions/program.ts`: Server actions for full program CRUD — getProgramItems, createProgramItem, updateProgramItem, deleteProgramItem, moveProgramItemUp, moveProgramItemDown. Includes sort_order swap logic and cascade delete of children before parent.
- `src/app/(admin)/admin/program/page.tsx`: Server Component page that fetches program items and performances in parallel, renders ProgramManager.
- `src/components/admin/ProgramManager.tsx`: Client Component. Renders two-level tree (top-level + children). Supports expand/collapse, move up/down with useTransition, inline edit and inline child-creation forms, delete with confirmation. Plus button only shown on top-level items to enforce single-level nesting.
- `src/components/admin/ProgramItemForm.tsx`: Client Component form for create and update. Controlled type selector drives conditional rendering of performance select. Parent select shown only when creating or editing a child item. Approved/scheduled performances only. useTransition for pending state.

## Verification
| Command | Result | Pass? |
|---------|--------|-------|
| `npx tsc --noEmit` | No output (zero errors) | Yes |
| `git commit` | 4 files, 661 insertions | Yes |

## Decisions Made
- Duplicate lucide-react import alias `ChevronDown as ChevronExpand` was eliminated — single `ChevronDown` import used for the expand chevron, resolving a TypeScript/linting issue without behavioral change.
- `getGuestName` helper in `ProgramItemForm.tsx` handles both array and single-object join shapes from Supabase, which varies based on relationship cardinality, avoiding a runtime type error under strict mode.
- `ProgramManager` renders a `renderItemRow` function (not a separate component) to avoid prop-drilling complexity given the shallow two-level tree. If nesting requirements grow, extract to a proper component.
- Performance name in `ProgramManager` is derived via a local inline cast typed as `Items[number] & { performances?: ... }` rather than widening the Supabase-inferred return type, keeping the action return type clean.
- The parent_id select is hidden when editing a top-level item that has children — this prevents accidentally moving a parent under another item while it still has children attached.

## Issues / Risks
- The `supabaseServer` client is untyped (no generated Supabase types), so all `.from()` queries return `any`. The TypeScript check passes but type safety at the data layer depends on runtime shape matching the interface. This is a pre-existing project-wide condition, not introduced here.
- `moveProgramItemUp`/`Down` do not handle duplicate `sort_order` values. If items are inserted with colliding sort_orders, the swap may not produce the expected result. Sort order is assigned as `count` at insert time which is safe under sequential creates but not under concurrent inserts.

## Handoff Notes
- `/admin/program` route is live. Navigation link may need to be added to the admin sidebar (not in scope for this plan).
- `getPerformances` is imported from `@/lib/actions/performances` as established by Plan 03-01 — that dependency is stable.
- The `program_items` table must exist in Supabase with the schema described in the plan (id, title, start_time, duration_minutes, type, performance_id, sort_order, parent_id, notes, created_at) for the page to function at runtime.
