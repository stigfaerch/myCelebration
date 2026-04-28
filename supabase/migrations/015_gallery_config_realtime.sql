-- myCelebration — Realtime for gallery_config
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Purpose: when admin saves changes on /admin/galleri (interval, filter
-- dates, source, display type, etc.), live screens currently in the
-- gallery default render path should pick up the new config without a
-- manual reload.
--
-- Pattern mirrors the existing realtime members (screen_state, swap_requests,
-- task_assignments, screen_page_assignments — see migrations 002, 005, 008, 009):
--   1. Anon SELECT policy so the realtime layer can read the row for subscribers
--   2. REPLICA IDENTITY FULL so DELETE events carry full row data (defensive —
--      gallery_config is a singleton so DELETE shouldn't happen, but keeps the
--      pattern uniform)
--   3. Idempotent add to the supabase_realtime publication
--
-- Idempotent: safe to re-apply.

alter table gallery_config enable row level security;

drop policy if exists "gallery_config_realtime_select" on gallery_config;
create policy "gallery_config_realtime_select"
  on gallery_config
  for select
  using (true);

alter table gallery_config replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gallery_config'
  ) then
    alter publication supabase_realtime add table gallery_config;
  end if;
end $$;
