-- myCelebration — admin "favorite" curation flag for photos and memories
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Purpose: lets admins mark individual photos / memories as favorites so they
-- can quickly filter the management views (/admin/billeder, /admin/minder)
-- down to a curated subset. Admin-only metadata — has no effect on guest
-- views, gallery rotation, or screen activation.
--
-- Partial indexes are placed only on the `true` rows: favorites are typically
-- a small subset of the table, so a partial index is cheap to maintain and
-- still serves the "filter by favorite = true" query efficiently.
--
-- Idempotent: safe to re-apply.

alter table photos
  add column if not exists is_favorite boolean not null default false;

alter table memories
  add column if not exists is_favorite boolean not null default false;

create index if not exists idx_photos_is_favorite
  on photos(is_favorite)
  where is_favorite = true;

create index if not exists idx_memories_is_favorite
  on memories(is_favorite)
  where is_favorite = true;
