-- myCelebration — Screen Page Cycling
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Purpose: Add multi-page cycling for screen-type guests.
--
--   * Per-screen cycle settings live on `guests` (cycle_seconds, transition).
--   * Many-to-many assignments live in `screen_page_assignments`.
--   * Realtime is wired through `screen_page_assignments` only — `guests` is
--     deliberately NOT added to the publication because it contains PII
--     (email, phone). Updates to cycle settings are broadcast by also
--     touching an assignment row's `created_at`; see
--     `updateScreenCycleSettings` in src/lib/actions/screenAssignments.ts.

-- =============================================================================
-- Per-screen cycle settings
-- =============================================================================

alter table guests
  add column if not exists screen_cycle_seconds integer not null default 8,
  add column if not exists screen_transition text not null default 'fade';

-- Constrain transition to known values; 'none' means instant swap.
alter table guests
  drop constraint if exists guests_screen_transition_check;
alter table guests
  add constraint guests_screen_transition_check
  check (screen_transition in ('fade', 'slide', 'none'));

-- Constrain cycle_seconds to a sane positive range (2s..10min).
alter table guests
  drop constraint if exists guests_screen_cycle_seconds_check;
alter table guests
  add constraint guests_screen_cycle_seconds_check
  check (screen_cycle_seconds between 2 and 600);

-- =============================================================================
-- Many-to-many: pages assigned to screens for cycling
-- =============================================================================

create table if not exists screen_page_assignments (
  id uuid primary key default gen_random_uuid(),
  screen_guest_id uuid not null references guests(id) on delete cascade,
  page_id uuid not null references pages(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (screen_guest_id, page_id)
);

create index if not exists idx_spa_screen_sort
  on screen_page_assignments(screen_guest_id, sort_order);

-- =============================================================================
-- RLS — anon SELECT for realtime subscriptions
-- =============================================================================
-- Mirrors the trade-off documented in 005_realtime_rls.sql. The exposed
-- columns are only the join graph (screen_guest_id, page_id, sort_order).
-- No PII; no content.

alter table screen_page_assignments enable row level security;

drop policy if exists "screen_page_assignments_realtime_select" on screen_page_assignments;
create policy "screen_page_assignments_realtime_select"
  on screen_page_assignments
  for select
  using (true);

-- =============================================================================
-- Realtime publication membership (idempotent)
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'screen_page_assignments'
  ) then
    alter publication supabase_realtime add table screen_page_assignments;
  end if;
end $$;
