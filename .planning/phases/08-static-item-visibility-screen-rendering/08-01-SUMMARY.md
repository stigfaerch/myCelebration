# Plan 08-01 — Static-item visibility — schema + server actions

## Status
Complete

## Files created/modified
Created:
- `/home/stigf/projects/myCelebration/supabase/migrations/010_static_item_visibility.sql`
- `/home/stigf/projects/myCelebration/src/lib/actions/staticItemVisibility.ts`

Modified: none.

## Decision A chosen
**A1 — dedicated `static_item_settings` table.**

Rationale:
- **Column-shape parity with `pages`** — `(is_active boolean, visible_from timestamptz, visible_until timestamptz)` matches the dynamic-page columns exactly, so `isPageVisibleNow` from `src/lib/guest/navItems.ts` is reused unchanged. No new predicate needed; no `->>` jsonb casts scattered through call sites.
- **Future-proof** — adding a column later (e.g. per-screen overrides v2 mentioned in 08-CONTEXT.md) is a one-line `add column if not exists` migration. With jsonb on `app_settings`, every shape evolution requires a read-modify-write codepath update.
- **Indexable & queryable** — though current row count is bounded (~8), the option to filter / index is preserved at near-zero cost.
- **Storage cost negligible** — at most one row per static menu key.
- **Free-form `text` PK** — per the plan's guidance, `static_key` is a plain text PK rather than a CHECK-constrained enum. This means changing `STATIC_NAV_KEYS` in code does NOT require a follow-up migration. Validation of known keys happens in the server-action layer via `isStaticNavKey`.

A2 (jsonb on `app_settings`) was rejected because it would force every read site to handle missing keys via jsonb operators and would make adding fields more expensive than a column-add migration.

## Action surface added
Exports from `/home/stigf/projects/myCelebration/src/lib/actions/staticItemVisibility.ts`:

- `getStaticItemVisibilityMap(): Promise<Record<string, StaticItemVisibility>>` — read-only, no admin assertion (consumed from guest paths). Returns a map keyed by `static_key`. Keys absent from the map are treated as fully visible by callers.
- `updateStaticItemVisibility(staticKey, settings): Promise<void>` — `assertAdmin()`-gated. Validates `staticKey` against `STATIC_NAV_KEYS`. Upsert pattern via Supabase `.upsert(..., { onConflict: 'static_key' })`. Calls `revalidatePath('/admin/sider')` and `revalidatePath('/[uuid]', 'layout')` on success.
- `isStaticItemVisibleNow(staticKey, map?): Promise<boolean>` — pure logic, but exposed from a `'use server'` module so it compiles as async per Next.js server-action constraints. Returns `true` when no entry exists in `map`; otherwise delegates to `isPageVisibleNow`.
- Type export: `StaticItemVisibility` — `{ static_key, is_active, visible_from, visible_until }`.

## Required user action
**Apply migration 010 in Supabase Dashboard SQL Editor before Wave 2 plans run.**

Steps:
1. Open Supabase Dashboard → SQL Editor.
2. Paste contents of `supabase/migrations/010_static_item_visibility.sql`.
3. Run. The migration is idempotent (`create table if not exists`, `enable row level security` is safe to repeat).

Without this migration applied:
- Wave 2 plan 08-03 (admin UI) will hit a "relation does not exist" error when admin toggles a static item's visibility.
- Wave 2 plan 08-04 (guest filter) will throw the same error on every guest page load.

## Verification
- `npx tsc --noEmit`: **PASS** (exit code 0, no errors).
- `git status --short` confirms only the two intended new files were created (plan 08-02's migration 011 is also present from a parallel Wave 1 agent and is not part of this plan's surface).
- Files exist at expected absolute paths.

## Risks / Follow-ups for Wave 2
- **Default behavior on first deploy**: every static key has NO row → all items fully visible. This preserves current behavior and avoids a backfill. Wave 2 plan 08-04 must treat absence-of-key as `visible = true` (use `isStaticItemVisibleNow` helper which already implements this contract).
- **Upsert semantics**: `updateStaticItemVisibility` does a full row replace via upsert. Admin UI (08-03) MUST send all three fields (`is_active`, `visible_from`, `visible_until`) on every save — no partial updates. Suggest the form pattern: read full record into local state, mutate, write back.
- **`isStaticItemVisibleNow` is async**: even though the helper is logically synchronous when `map` is provided, it MUST be `await`-ed because `'use server'` files force async export signatures. Callers using a pre-fetched map do not pay an extra DB round-trip — the `map ?? await getStaticItemVisibilityMap()` short-circuits.
- **Realtime not wired**: the `static_item_settings` table is intentionally NOT in the `supabase_realtime` publication. Live screens won't pick up visibility flips until the next refresh (per 08-CONTEXT.md "Out of Scope"). If Wave 2 plan 08-05 finds this insufficient for the screen render path, a follow-up can add it via `alter publication supabase_realtime add table static_item_settings;` in a future migration.
- **`revalidatePath('/[uuid]', 'layout')`**: this matches the pattern used in `updateNavOrder` in `settings.ts`. Confirms guest layouts that read nav/visibility data refetch on next render.
- **No anon RLS policies**: the table has RLS enabled with NO policies, meaning anon clients are denied all access. Server-side reads use the service-role client which bypasses RLS. If Wave 2 ever wants to read this from a client component, they must add an explicit `using (true)` policy (mirroring 005_realtime_rls.sql) — but this is unlikely since visibility is consumed in server components.
- **Free-form `static_key`**: the migration intentionally uses `text` PK with no CHECK constraint. Validation happens in `updateStaticItemVisibility` via `isStaticNavKey`. If a key is removed from `STATIC_NAV_KEYS` later, stale rows for that key are harmless (just unread); admins can clean up via SQL if desired.
