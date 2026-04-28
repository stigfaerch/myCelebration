-- myCelebration — performances.type → performance_type[] (multi-select)
-- Apply manually via: Supabase Dashboard > SQL Editor.
--
-- Convert the existing scalar enum column to an enum array. Existing rows
-- get wrapped: type='music' becomes ARRAY['music'] etc. Default becomes
-- ARRAY['other'] so newly-created rows still have a sensible single value.
--
-- IMPORTANT: This migration is NOT idempotent. Re-running it on an
-- already-converted (array) column will fail. Apply exactly once. To
-- re-run, the column must first be reverted to the scalar enum manually.

alter table performances
  alter column type drop default;

alter table performances
  alter column type type performance_type[]
  using array[type]::performance_type[];

alter table performances
  alter column type set default array['other']::performance_type[],
  alter column type set not null;
