-- myCelebration — Tasks: is_easy flag
-- Apply manually via: Supabase Dashboard SQL Editor
-- (per .planning/STATE.md — migrations are NOT applied programmatically)
--
-- Adds an "easy task" flag to tasks. Combined with guests.task_participation
-- ('none' | 'easy' | 'all'), this restricts who can be assigned to which task:
--   - 'none'  → never eligible for any task
--   - 'easy'  → eligible only for tasks where is_easy = true
--   - 'all'   → eligible for any task
--
-- Enforcement is client-side only (admin assignment UI). No server-side guard
-- is added in assignGuestToTask — admin remains free to override if needed.

alter table tasks
  add column if not exists is_easy boolean not null default false;
