-- myCelebration — Polymorphic screen assignments
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Purpose: Extend `screen_page_assignments` to also reference static menu
-- items (Galleri, Deltagere, Hvor, Opgaver, Program, ...) via a `static_key`
-- column, so a single screen's cycle can interleave dynamic admin-defined
-- pages and built-in static views in one ordered list.
--
-- Decision B1: extend the existing table rather than fork a separate
-- `screen_static_assignments` table. Rationale:
--   * Cycler (Plan 08-05) reads ONE ordered list of mixed items via a
--     single query — sort_order is a single space across both kinds, so
--     admins can naturally interleave (e.g. Page → Galleri → Page → Hvor).
--   * Realtime: the screen's existing subscription on
--     `screen_page_assignments` captures static-row events for free; no
--     second topic to manage.
--   * Trade-off: schema is less normalized — `page_id` and `static_key`
--     are mutually exclusive. We enforce that with a CHECK constraint
--     plus partial-unique indexes per kind.
--
-- Compatibility: all rows pre-existing this migration default to
-- `kind='page'` and retain their `page_id`. Existing exports in
-- `src/lib/actions/screenAssignments.ts` are audited to filter on
-- `kind='page'` so static rows do not pollute page-id maps.
--
-- Realtime: REPLICA IDENTITY FULL was set in migration 009 and remains in
-- effect (table-level property). The table is already in the
-- `supabase_realtime` publication. No changes required there.
--
-- Idempotent: safe to re-apply. Uses `add column if not exists`,
-- `drop constraint if exists`, `create unique index if not exists` etc.

-- =============================================================================
-- 1. Discriminator + static_key column
-- =============================================================================

alter table screen_page_assignments
  add column if not exists kind text not null default 'page';

alter table screen_page_assignments
  add column if not exists static_key text;

-- Allowed kinds: 'page' (existing dynamic-page assignment) or 'static'
-- (built-in menu item by static_key, e.g. 'galleri', 'deltagere', 'hvor',
-- 'tasks', 'program').
alter table screen_page_assignments
  drop constraint if exists spa_kind_check;
alter table screen_page_assignments
  add constraint spa_kind_check
  check (kind in ('page', 'static'));

-- =============================================================================
-- 2. Make page_id nullable (was NOT NULL in migration 008)
-- =============================================================================

alter table screen_page_assignments
  alter column page_id drop not null;

-- =============================================================================
-- 3. Mutual-exclusion check on (page_id, static_key)
-- =============================================================================
-- Exactly one of (page_id, static_key) must be non-null, matching `kind`.

alter table screen_page_assignments
  drop constraint if exists spa_target_xor;
alter table screen_page_assignments
  add constraint spa_target_xor
  check (
    (kind = 'page' and page_id is not null and static_key is null) or
    (kind = 'static' and static_key is not null and page_id is null)
  );

-- =============================================================================
-- 4. Replace the legacy unique(screen_guest_id, page_id) with
--    partial-unique indexes per kind so a screen can't have the same
--    page twice OR the same static-key twice, but the two kinds are
--    independent.
-- =============================================================================

-- Drop legacy unique constraint from migration 008 (named by Postgres'
-- default convention: <table>_<col1>_<col2>_key).
alter table screen_page_assignments
  drop constraint if exists screen_page_assignments_screen_guest_id_page_id_key;

create unique index if not exists spa_unique_screen_page
  on screen_page_assignments(screen_guest_id, page_id)
  where kind = 'page';

create unique index if not exists spa_unique_screen_static
  on screen_page_assignments(screen_guest_id, static_key)
  where kind = 'static';

-- =============================================================================
-- 5. Helper index for kind-filtered admin queries (e.g. listing all
--    static-key assignments to render screen-toggle state in /admin/sider).
-- =============================================================================

create index if not exists idx_spa_kind_static_key
  on screen_page_assignments(static_key)
  where kind = 'static';

-- =============================================================================
-- Notes
-- =============================================================================
-- * RLS: existing policy from migration 008 (`screen_page_assignments_realtime_select`,
--   `using (true)`) covers both kinds — anon SELECT continues to work for
--   the realtime client filter on screens.
-- * REPLICA IDENTITY FULL (migration 009) is a table-level property and
--   carries through column additions; DELETE events for static rows will
--   include the full row payload just like page-row deletes.
-- * Publication membership: `screen_page_assignments` is already in
--   `supabase_realtime` (migration 008); no change needed.
