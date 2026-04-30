-- myCelebration — Rich text font sizes
-- ============================================================================
-- Adds three integer columns to `app_settings` so admins can tune the
-- font size used inside rich-text content (`<p>` / `<li>`, `<h1>`, `<h2>`)
-- from /admin/indstillinger. The values are pixel sizes applied via
-- a global `<style>` block emitted from the root layout.
--
-- Defaults match the @tailwindcss/typography `prose-sm` baseline so
-- existing pages render unchanged until an admin tweaks the settings.
--
-- Idempotent: safe to re-run.

alter table app_settings
  add column if not exists font_size_p int not null default 16,
  add column if not exists font_size_h1 int not null default 32,
  add column if not exists font_size_h2 int not null default 24;
