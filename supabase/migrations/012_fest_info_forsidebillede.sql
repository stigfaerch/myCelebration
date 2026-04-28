-- myCelebration — fest_info forsidebillede picker
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Purpose: Allow the admin to pick one of the already-uploaded photos as the
-- forsidebillede ("hero image"), rendered above the festbeskrivelse on
-- /{uuid} for non-screen guests. Screen guests are unaffected.
--
-- Storage: a foreign-key column on `fest_info` referencing `photos(id)`.
-- `on delete set null` so deleting the underlying photo simply clears the
-- forsidebillede — no orphans, no cascade errors on the singleton row.
--
-- Idempotent: safe to re-apply. NULL is the valid initial state meaning
-- "no forsidebillede selected" — no backfill needed.

alter table fest_info
  add column if not exists forsidebillede_photo_id uuid
    references photos(id)
    on delete set null;
