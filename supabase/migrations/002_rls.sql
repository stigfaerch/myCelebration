-- myCelebration — Row Level Security Policies
-- Apply AFTER 001_initial_schema.sql

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

alter table guests enable row level security;
alter table fest_info enable row level security;
alter table events enable row level security;
alter table event_locations enable row level security;
alter table choice_definitions enable row level security;
alter table guest_choices enable row level security;
alter table performances enable row level security;
alter table program_items enable row level security;
alter table tasks enable row level security;
alter table task_assignments enable row level security;
alter table swap_requests enable row level security;
alter table memories enable row level security;
alter table photos enable row level security;
alter table pages enable row level security;
alter table gallery_config enable row level security;
alter table screen_state enable row level security;
alter table app_settings enable row level security;

-- =============================================================================
-- ACCESS PATTERN NOTES
-- =============================================================================
--
-- ALL server-side queries use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- RLS is a defense-in-depth measure against direct API access with anon key.
--
-- The ONLY anon key use case is Realtime subscriptions on screen_state,
-- so screens can receive live content override pushes from admin.
--
-- Default: all tables deny anon access (RLS enabled, no policies = deny all)
-- Exception: screen_state allows anon SELECT for Realtime

-- =============================================================================
-- POLICIES
-- =============================================================================

-- Allow anon key to subscribe to screen_state changes (Realtime)
create policy "screen_state_realtime_select"
  on screen_state
  for select
  using (true);

-- All other tables: no explicit policies needed.
-- RLS enabled + no policy = implicit DENY for anon role.
-- Service role bypasses RLS automatically.
