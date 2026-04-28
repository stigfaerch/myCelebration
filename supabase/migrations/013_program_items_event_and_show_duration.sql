-- myCelebration — Program type 'event' (Begivenhed) + show_duration flag
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Purpose:
--   1. Add a new 'event' value to the program_item_type enum. This becomes
--      the new default for program_items.type. Display label on the admin
--      form and guest-side is "Begivenhed". The /{uuid}/program guest page
--      intentionally hides the type-tag pill for event-type items so the
--      "default" type doesn't visually shout a label.
--   2. Add show_duration boolean to program_items. The guest-side program
--      page renders duration_minutes only when show_duration = true.
--      Existing rows get false so historical data doesn't suddenly start
--      showing durations on the guest page; admins opt-in per item.
--
-- Idempotent: safe to re-apply. `add value if not exists` skips on rerun;
-- `add column if not exists` skips on rerun. Setting the column default a
-- second time is a no-op.
--
-- ============================================================================
-- IMPORTANT — RUN IN TWO SEPARATE EXECUTIONS
-- ============================================================================
-- Postgres requires `alter type ... add value` to be COMMITTED before the new
-- value can be referenced. The Supabase Dashboard SQL Editor wraps multi-
-- statement input in a single transaction, so pasting all three statements
-- at once fails with:
--   ERROR 55P04: unsafe use of new value "event" of enum type program_item_type
--   HINT:  New enum values must be committed before they can be used.
--
-- Workaround: paste and run RUN 1 alone, wait for success, then paste and run
-- RUN 2 alone.
-- ============================================================================


-- ============================================================================
-- RUN 1 — Paste this block alone, click Run, wait for "Success. No rows
-- returned." Then continue to RUN 2.
-- ============================================================================

alter type program_item_type add value if not exists 'event';


-- ============================================================================
-- RUN 2 — After RUN 1 succeeds, paste this block alone and click Run.
-- ============================================================================

-- Change the default for new rows from 'info' to 'event'.
-- Existing rows are unchanged (their stored type values stay).
alter table program_items alter column type set default 'event';

-- Add show_duration. Defaults to false; existing rows backfill to false.
alter table program_items
  add column if not exists show_duration boolean not null default false;
