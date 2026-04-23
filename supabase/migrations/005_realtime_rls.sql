-- myCelebration — Realtime RLS Policies + Publication
-- Apply AFTER 002_rls.sql
--
-- Purpose: Allow the anon key to SELECT (and therefore subscribe to Realtime
-- change events on) the tables that drive the live swap-request flow and
-- screen overrides.
--
-- =============================================================================
-- SECURITY TRADE-OFF — read this before changing policies below
-- =============================================================================
--
-- `using (true)` means these tables are world-readable by anyone holding the
-- public NEXT_PUBLIC_SUPABASE_ANON_KEY — including via arbitrary PostgREST
-- REST queries, not just Realtime subscriptions. An anonymous internet actor
-- can execute `GET /rest/v1/swap_requests?select=*` and receive every row.
--
-- Exposed data:
--   swap_requests    — swap id, requester_assignment_id, desired_task_ids[],
--                      status, created_at
--   task_assignments — assignment id, task_id, guest_id, is_owner
--   screen_state     — guest_id, current_override, override_ref_id
--
-- None of these tables contain PII (names, emails, phones, content). They do
-- reveal the join graph: which guest is assigned to which task, and which
-- swap targets exist.
--
-- Accepted v1 threat model:
--   - myCelebration is a single-party family event — all participants share
--     a common password (GUEST_PASSWORD) and trust each other.
--   - Guest UUIDs are non-enumerable (v4, 122 bits entropy). An external
--     attacker without any guest URL cannot target a specific guest.
--   - No credentials or auth tokens are stored in the opened tables.
--   - All MUTATIONS still require the service-role client via server actions,
--     which run middleware + resolveGuest() checks. Anon cannot modify data.
--
-- Phase 7 hardening target:
--   Replace the shared-password cookie with per-guest HMAC-signed JWTs so
--   RLS can use `auth.uid()` for scoped SELECT (e.g., "a guest can only see
--   swaps targeting their tasks"). That change closes this entire surface.
--
-- =============================================================================

-- Allow anon role to subscribe to swap_requests changes
create policy "swap_requests_realtime_select"
  on swap_requests
  for select
  using (true);

-- Allow anon role to subscribe to task_assignments changes
create policy "task_assignments_realtime_select"
  on task_assignments
  for select
  using (true);

-- =============================================================================
-- REALTIME PUBLICATION
-- =============================================================================
--
-- Supabase Realtime delivers postgres_changes events only for tables that are
-- members of the supabase_realtime publication. Adding them here keeps the
-- realtime membership declarative and diffable alongside RLS. The alter
-- statements are idempotent via the DO block — safe to re-run.
--
-- Tables in this publication:
--   swap_requests     — drives IncomingSwapList live updates
--   task_assignments  — drives post-accept re-assignment broadcast
--   screen_state      — drives ScreenRouter override re-render

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'swap_requests'
  ) then
    alter publication supabase_realtime add table swap_requests;
  end if;
  if not exists (
    select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_assignments'
  ) then
    alter publication supabase_realtime add table task_assignments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'screen_state'
  ) then
    alter publication supabase_realtime add table screen_state;
  end if;
end $$;
