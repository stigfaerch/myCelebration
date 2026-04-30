-- myCelebration — Admin nav order
-- ============================================================================
-- Adds `admin_nav_order` to `app_settings` so admins can reorder the
-- left-rail / mobile-sheet nav from /admin/indstillinger.
--
-- Shape: JSON array of stable string keys, e.g.
--   ["dashboard", "guests", "information", "program", ...]
--
-- Default empty array. The application reconciles drift in-memory
-- (drops unknown keys, appends missing keys in canonical order) so the
-- nav is always usable even before the admin has saved an order.
--
-- Idempotent: safe to re-run.

alter table app_settings
  add column if not exists admin_nav_order jsonb not null default '[]'::jsonb;
