-- myCelebration — Realtime RLS Policies
-- Apply AFTER 002_rls.sql
--
-- Purpose: Allow the anon key to SELECT (and therefore subscribe to Realtime
-- change events on) the two tables that drive the live swap-request flow in
-- the guest UI. All other tables remain closed to anon — server-side code
-- uses the service role key which bypasses RLS entirely.
--
-- Tables opened here (anon SELECT = true):
--   swap_requests     — guests see pending/accepted state transitions
--   task_assignments  — guests see re-assignment after a swap is accepted
--
-- Tables that stay CLOSED to anon (no policies, RLS enabled = deny-all):
--   guests, fest_info, events, event_locations, choice_definitions,
--   guest_choices, performances, program_items, tasks, memories, photos,
--   pages, gallery_config, app_settings
--
-- screen_state already has its own anon SELECT policy from 002_rls.sql
-- (screen_state_realtime_select).
--
-- Note: Supabase Realtime requires the tables to be included in the
-- supabase_realtime publication (Dashboard → Database → Replication) in
-- addition to these SELECT policies. RLS alone is not sufficient.

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
