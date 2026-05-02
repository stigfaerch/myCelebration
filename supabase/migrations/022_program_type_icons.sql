-- myCelebration — Program type icons
-- ============================================================================
-- Adds a per-item `type_icon` column on `program_items` (nullable; null means
-- "no icon"). Admin picks from a curated list specific to each program type;
-- the registry lives in src/lib/program/typeIcons.ts and is the source of
-- truth for valid keys.
--
-- Adds a global `show_program_type_icons` toggle on `app_settings` to hide
-- ALL program type icons across guest-facing surfaces (program page, screen
-- view) without losing per-item picks. Default: true (icons visible).
--
-- No backfill — existing rows stay null until edited.
--
-- Idempotent: safe to re-run.

alter table program_items
  add column if not exists type_icon text;

alter table app_settings
  add column if not exists show_program_type_icons boolean not null default true;
