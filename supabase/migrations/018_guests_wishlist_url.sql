-- myCelebration — Guest wishlist URL (hovedperson only)
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Adds wishlist_url to guests. Only meaningful when type='main_person';
-- the admin form gates the field by type so other types never write to
-- this column. Idempotent.

alter table guests
  add column if not exists wishlist_url text;
