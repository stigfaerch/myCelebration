-- myCelebration — Per-screen viewport resolution (preview-only)
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Adds screen_width and screen_height columns to guests. Only meaningful
-- when type='screen'. Drive the WYSIWYG iframe preview on /admin/sider.
-- The screen render path itself uses CSS viewport units (vh/vw, clamp())
-- and does NOT read these values.
--
-- Defaults to 1920×1080 (typical Full HD TV). Idempotent.

alter table guests
  add column if not exists screen_width integer not null default 1920,
  add column if not exists screen_height integer not null default 1080;

alter table guests
  drop constraint if exists guests_screen_width_check;
alter table guests
  add constraint guests_screen_width_check
  check (screen_width between 320 and 7680);

alter table guests
  drop constraint if exists guests_screen_height_check;
alter table guests
  add constraint guests_screen_height_check
  check (screen_height between 240 and 4320);
