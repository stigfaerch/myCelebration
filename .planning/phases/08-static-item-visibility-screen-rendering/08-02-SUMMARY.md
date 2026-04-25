# Plan 08-02 — Polymorphic screen assignments — schema + server actions

## Status
Complete

## Files modified/created
- Created: `/home/stigf/projects/myCelebration/supabase/migrations/011_polymorphic_screen_assignments.sql`
- Modified: `/home/stigf/projects/myCelebration/src/lib/actions/screenAssignments.ts`

## Decision B chosen
**B1 — polymorphic single table** (extend `screen_page_assignments` with `kind` discriminator + nullable `static_key`).

Rationale:
- **Single ordered cycle.** sort_order lives in one space across both kinds, so admins can naturally interleave (e.g. Page A → Galleri → Page B → Hvor) without merge-sort logic in the cycler. B2 (separate table) would have given two independent sort_order spaces and forced the cycler to pick a merge strategy.
- **One realtime topic.** Plan 08-05's screen render path already subscribes to `screen_page_assignments` via the existing `ScreenPageCycle` channel; the new static-row INSERT/DELETE/UPDATE events ride that same channel for free. B2 would have required a second subscription and synchronization between the two streams.
- **Simpler join graph.** Admin queries that need "all assignments for this screen" stay one query. With B2 the admin UI would need two parallel fetches.
- **Trade-off accepted.** Schema feels less normalized — `page_id` and `static_key` are mutually exclusive — but the CHECK constraint `spa_target_xor` plus partial-unique indexes per kind enforce the invariant cleanly. Discriminator-table patterns are well-established in Postgres.

## Existing-export audit (for screenAssignments.ts)
Every existing query against `screen_page_assignments` was audited for `kind='page'` filter coverage. After migration 011, static rows live on the same table, so any page-only consumer must filter explicitly. Each change is annotated inline in the source with an `Audit (migration 011 / Plan 08-02)` comment.

| Export | Change | Why |
|---|---|---|
| `getScreenAssignmentsAll` | Added `.eq('kind', 'page')` | Admin caller expects page-only assignment list. Without filter, static rows would appear with `pages = null` and silently get dropped by `rowToAssignment`, but transmitting them is wasteful and confuses future maintainers. |
| `getAssignmentsMapByPage` | Added `.eq('kind', 'page')` | **Required for correctness.** Static rows have `page_id IS NULL`. Without filter, `out[null].push(...)` would corrupt the map with a "null" bucket. |
| `getRotationCountsForScreen` | Added `.eq('kind', 'page')` | UI ("I rotation: N sider") is page-rotation copy. Mixed counter belongs to a future Wave 2 helper if the UI is generalised. |
| `hasAnyScreenAssignments` | **No filter** (intentional) | Plan explicitly directs to count BOTH kinds. Otherwise a screen with only static assignments would fall through to gallery default instead of entering cycle mode. |
| `getVisibleScreenAssignments` | Added `.eq('kind', 'page')` | Existing callers (`ScreenPageCycle` realtime refetch + the single-page render fallback) typed against `ScreenAssignment` (page-shape only). Static visibility delivered via the new `getVisibleScreenAssignmentsMixed`. |
| `addPageToScreen` | Explicit `kind: 'page'` on insert | Defensive — column default is `'page'`, but explicit intent survives any future default change. sort_order computation already takes max over the screen's full row set, so static + page sort orders interleave correctly. |
| `removePageFromScreen` | Added `.eq('kind', 'page')` | Defensive (NULL `page_id` would never match a non-null `pageId` anyway, but the explicit filter prevents accidental deletion of a future row design). |
| `reorderScreenAssignments` | Added `.eq('kind', 'page')` to the existence read AND the per-row update | Required: the existence check counts rows by `page_id`; without filter, static rows (NULL `page_id`) would short-circuit set membership in unintuitive ways. |
| `getScreenCycleSettings` | No change | Reads from `guests` table — unaffected by migration 011. |
| `updateScreenCycleSettings` | No change | Reads from `guests`, then bumps the lowest-sort_order assignment row by id to trigger realtime. Bumping a static row triggers realtime just as well as bumping a page row — semantics preserved. |

`RawAssignmentRow.page_id` was retyped from `string` to `string | null` to match the post-migration column nullability; `rowToAssignment` short-circuits when `page_id` is null (defense-in-depth, since the `kind='page'` filter should already have eliminated such rows).

## New action surface
All declared inside `'use server'` so they are server actions automatically:

- `addStaticItemToScreen(screenGuestId: string, staticKey: string): Promise<void>` — admin-gated. Validates `staticKey` against `STATIC_NAV_KEYS` via `isStaticNavKey`. Inserts with `kind='static'`, `static_key=<key>`, `page_id=null`, `sort_order = max+1`. Idempotent against `spa_unique_screen_static`.
- `removeStaticItemFromScreen(screenGuestId: string, staticKey: string): Promise<void>` — admin-gated. Validates static key. Deletes by `(screen_guest_id, kind='static', static_key)`. Idempotent.
- `getScreenAssignmentsMixed(screenGuestId: string): Promise<MixedAssignment[]>` — admin-gated. Returns ordered list including inactive/windowed-out items.
- `getVisibleScreenAssignmentsMixed(screenGuestId: string): Promise<MixedAssignment[]>` — public (matches `getVisibleScreenAssignments` posture). Filters by `isPageVisibleNow` for `kind='page'` rows AND by the static-item visibility map (Plan 08-01) for `kind='static'` rows. Static keys with no visibility record are treated as visible (preserves "absence == visible" semantics).
- `getStaticAssignmentsMapByKey(): Promise<Record<string, string[]>>` — admin-gated. Mirrors `getAssignmentsMapByPage` for static rows. Returns `{ static_key: [screen_guest_id, ...] }` for the `/admin/sider` per-row screen-toggle state.

Type also exported (Wave 2 consumes):
- `MixedAssignment` — discriminated union `{ kind: 'page' | 'static', ... }`.

## Required user action
Apply migration 011 in Supabase Dashboard SQL Editor before Wave 2 plans run:

```
supabase/migrations/011_polymorphic_screen_assignments.sql
```

The migration is idempotent (`add column if not exists`, `drop constraint if exists`, `create unique index if not exists` patterns), so re-applying is safe.

## Realtime notes
**No realtime change required for Plan 08-02.** The polymorphic single-table design (Decision B1) means:

- `screen_page_assignments` is already in `supabase_realtime` publication (migration 008) — static rows on the same table flow through the existing channel automatically.
- REPLICA IDENTITY FULL (set in migration 009) is a table-level property; column additions don't reset it, so DELETE events for static rows include the full row payload just like page-row deletes. The existing client filter `screen_guest_id=eq.<id>` works for both kinds.
- RLS policy `screen_page_assignments_realtime_select` (migration 008) uses `using (true)` and applies to both kinds — anon SELECT continues to work for the realtime client filter.

**Hand-off for Plan 08-05 (cycler refactor):**
- The existing `ScreenPageCycle` realtime subscription remains valid. After Plan 08-05 generalises the cycler, the refetch callback should call `getVisibleScreenAssignmentsMixed` (new) instead of `getVisibleScreenAssignments`, and the page-row mapping (`a.page.id`, `a.page.title`, `a.page.content`) becomes a kind-discriminated mapping on `MixedAssignment`.
- Per 08-CONTEXT.md "Out of Scope": realtime updates for STATIC-ITEM VISIBILITY changes (admin toggling `is_active` on the `static_item_settings` table) are explicitly deferred to v2. If a future plan wants live propagation of visibility toggles to running screens, it needs a separate subscription on the `static_item_settings` table (which would require adding it to `supabase_realtime` publication AND setting `replica identity full` AND adding an anon-SELECT RLS policy — currently NONE of those are in place by design).

## Verification
- `npx tsc --noEmit`: **PASS** (exit 0, no output).
- Migration 011 syntactically valid: idempotent statements (`if not exists` / `if exists`), no destructive operations on existing rows, all-default `kind='page'` for legacy rows preserves behavior.
- Existing exports preserved in signature: `git diff` shows only inline `kind` filters and inline audit comments inside function bodies; export names and parameter/return types are unchanged.
- New exports present and verified by tsc:
  - `addStaticItemToScreen`
  - `removeStaticItemFromScreen`
  - `getScreenAssignmentsMixed`
  - `getVisibleScreenAssignmentsMixed`
  - `getStaticAssignmentsMapByKey`
  - `MixedAssignment` (type)

## Risks / Follow-ups
- **Wave 2 dependency.** Until migration 011 is applied in production, `addStaticItemToScreen` will fail at the `kind` column reference. Wave 2 plan 08-03 (admin UI) and 08-05 (cycler) MUST sequence after migration application.
- **Reorder asymmetry.** `reorderScreenAssignments` is page-only. If Wave 2 admin UI exposes per-kind reordering, it will work fine across kinds because sort_order is a single space; but a "reorder mixed" action is not yet implemented. The Wave 2 admin UI plan (08-03) should decide whether to add `reorderMixedAssignments` or to keep page-only reorder + append-static semantics.
- **Static-visibility realtime.** As noted above, toggling a static item's `is_active` in admin will not push to live screens until the screen's next normal refetch trigger (e.g., a page or static assignment change). This is an explicit v1 acceptance per 08-CONTEXT.md. Plan 08-05 may surface this in user-visible help text if the gap is surprising.
- **`hasAnyScreenAssignments` semantic shift.** Pre-migration: counts page assignments. Post-migration: counts page OR static assignments. Existing callers that branch on this (e.g., `src/app/[uuid]/page.tsx`'s screen-mode decision) will now ALSO enter cycle mode for screens with only static assignments — this is the intended Phase 8 behavior, but worth flagging because it's an observable behavior change for screens that have static-only assignments after 08-05 ships.
