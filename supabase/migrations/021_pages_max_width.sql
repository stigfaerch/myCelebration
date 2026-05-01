-- myCelebration — Per-page max-width
-- ============================================================================
-- Adds a `max_width` column on `pages` so each admin-defined static page can
-- pick its own reading-column width when rendered for guests at
-- /{uuid}/p/{slug}. Stored as a short Tailwind size suffix
-- ('2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full') — the renderer maps
-- the value to the matching Tailwind class.
--
-- Default '2xl' matches the admin-facing /admin/sider + /admin/indstillinger
-- baseline.
--
-- Idempotent: safe to re-run.

alter table pages
  add column if not exists max_width text not null default '2xl';
