-- myCelebration — Screen Page Assignments: REPLICA IDENTITY FULL
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Why: Postgres default REPLICA IDENTITY emits only the primary key on
-- DELETE events. Supabase Realtime's server-side filter
-- `screen_guest_id=eq.<id>` then can't match DELETE payloads because that
-- column isn't included, so the cycler on the screen never receives the
-- event when an admin removes a page from a screen.
--
-- REPLICA IDENTITY FULL makes Postgres include the entire row in the WAL
-- entry on UPDATE/DELETE, so the filter works for all event types.
--
-- Trade-off: slightly larger WAL volume per change. Acceptable for a low-
-- write table that controls live screen behaviour.

alter table screen_page_assignments replica identity full;
