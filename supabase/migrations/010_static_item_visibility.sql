-- myCelebration — Static item visibility settings
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Purpose: per-static-menu-item visibility metadata that mirrors the shape
-- of the `pages` table (`is_active`, `visible_from`, `visible_until`) so the
-- existing `isPageVisibleNow` predicate (src/lib/guest/navItems.ts) can be
-- reused unchanged.
--
-- One row per static menu key (e.g. 'tasks', 'galleri', 'hvor', ...).
-- Absence of a row means "fully visible" — this preserves the current
-- behavior on first deploy without requiring a backfill of all 8 keys.
--
-- The `static_key` column is a free-form text PK (NOT a check constraint
-- bound to a fixed list) so the admin doesn't need a follow-up migration
-- whenever STATIC_NAV_KEYS changes in code. Validation of known keys
-- happens at the server-action layer via the STATIC_NAV_KEYS const.
--
-- RLS: anon DENY (no policies). Visibility metadata is consumed
-- server-side only — `getResolvedNavForGuest` and the per-route guards
-- read it via the service-role client which bypasses RLS. Admin writes
-- go through `assertAdmin()`-gated server actions.
--
-- This table is NOT added to `supabase_realtime` publication — visibility
-- changes propagate on the next normal refresh tick (acceptable v1 per
-- 08-CONTEXT.md "Out of Scope").

-- =============================================================================
-- Table
-- =============================================================================

create table if not exists static_item_settings (
  static_key text primary key,
  is_active boolean not null default true,
  visible_from timestamptz,
  visible_until timestamptz,
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- RLS — anon DENY by default (no policies declared)
-- =============================================================================

alter table static_item_settings enable row level security;

-- Intentionally NO policies. Server-side service-role client bypasses RLS;
-- anon clients have no SELECT/INSERT/UPDATE/DELETE access.
