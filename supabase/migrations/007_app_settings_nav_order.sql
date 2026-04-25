-- =============================================================================
-- 007_app_settings_nav_order.sql
--
-- Adds a configurable bottom-menu order to app_settings.
--
-- Shape of nav_order: jsonb array of items
--   { "kind": "static", "key": "<StaticNavKey>" }
--   { "kind": "page",   "id":  "<uuid>" }
--
-- StaticNavKey ∈ ('tasks', 'camera', 'photos', 'hvor',
--                  'deltagere', 'minder', 'galleri')
--
-- Validation of shape happens at the server-action layer; we deliberately
-- avoid a CHECK constraint on jsonb structure (brittle / hard to evolve).
-- =============================================================================

alter table app_settings
  add column if not exists nav_order jsonb not null default jsonb_build_array(
    jsonb_build_object('kind', 'static', 'key', 'tasks'),
    jsonb_build_object('kind', 'static', 'key', 'camera'),
    jsonb_build_object('kind', 'static', 'key', 'photos'),
    jsonb_build_object('kind', 'static', 'key', 'hvor'),
    jsonb_build_object('kind', 'static', 'key', 'deltagere'),
    jsonb_build_object('kind', 'static', 'key', 'minder'),
    jsonb_build_object('kind', 'static', 'key', 'galleri')
  );

-- Make sure the existing seed row has the default populated even if the
-- column existed already with a different value (idempotent backfill).
update app_settings
set nav_order = jsonb_build_array(
    jsonb_build_object('kind', 'static', 'key', 'tasks'),
    jsonb_build_object('kind', 'static', 'key', 'camera'),
    jsonb_build_object('kind', 'static', 'key', 'photos'),
    jsonb_build_object('kind', 'static', 'key', 'hvor'),
    jsonb_build_object('kind', 'static', 'key', 'deltagere'),
    jsonb_build_object('kind', 'static', 'key', 'minder'),
    jsonb_build_object('kind', 'static', 'key', 'galleri')
  )
where nav_order is null
   or jsonb_typeof(nav_order) <> 'array'
   or jsonb_array_length(nav_order) = 0;
