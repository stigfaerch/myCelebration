-- Atomic sort_order swap for program_items
-- Locks both rows before swapping to prevent race conditions

create or replace function swap_program_items(a_id uuid, b_id uuid)
returns void
language plpgsql
as $$
declare
  a_sort integer;
  b_sort integer;
begin
  select sort_order into a_sort from program_items where id = a_id for update;
  select sort_order into b_sort from program_items where id = b_id for update;

  if a_sort is null or b_sort is null then
    raise exception 'One or both program items not found';
  end if;

  update program_items set sort_order = b_sort where id = a_id;
  update program_items set sort_order = a_sort where id = b_id;
end;
$$;
