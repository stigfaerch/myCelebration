-- accept_swap_request — atomic acceptance of a task swap request
--
-- Security model:
--   This function is invoked EXCLUSIVELY from the `acceptSwapRequest` server
--   action via the service-role client. It is NOT callable by anon or
--   authenticated roles. Allowing anon to execute would let any internet
--   actor with the public NEXT_PUBLIC_SUPABASE_ANON_KEY forge swaps between
--   any two guests by supplying arbitrary p_accepter_guest_id values.
--
-- Semantics:
--   1. Lock the swap_requests row FOR UPDATE (serializes concurrent callers).
--   2. Validate request exists, is pending, target task is in desired_task_ids,
--      accepter is assigned to that target task, and is not self-accepting.
--   3. Lock requester + accepter task_assignments rows FOR UPDATE.
--   4. Reject if accepter already holds an assignment on the requester's task
--      (would violate unique(task_id, guest_id) on the subsequent UPDATE).
--   5. Swap guest_ids between the two assignments. Preserve is_owner flags —
--      they describe the ORIGINAL assignee identity, not the current holder
--      (per Phase 3 design note).
--   6. Mark swap_requests.status = 'accepted'.
--
-- Failure modes (raised as exceptions, caught by caller and mapped to
-- user-facing Danish strings):
--   not_found         — swap_id does not exist
--   already_accepted  — swap is not in 'pending' status
--   invalid_target    — accepter_task_id is not in desired_task_ids
--   not_assigned      — accepter_guest_id is not assigned to accepter_task_id
--   self_accept       — accepter_guest_id equals requester's current guest_id
--   accepter_has_task — accepter already holds the task the requester would
--                       receive; swap would be a no-op and violate uniqueness

create or replace function accept_swap_request(
  p_swap_id uuid,
  p_accepter_guest_id uuid,
  p_accepter_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_assignment_id uuid;
  v_desired_task_ids uuid[];
  v_status swap_status;
  v_requester_guest_id uuid;
  v_requester_task_id uuid;
  v_accepter_assignment_id uuid;
begin
  -- Step 1: lock swap row (serializes concurrent acceptance attempts)
  select requester_assignment_id, desired_task_ids, status
    into v_requester_assignment_id, v_desired_task_ids, v_status
    from swap_requests
    where id = p_swap_id
    for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_status <> 'pending' then
    raise exception 'already_accepted';
  end if;

  -- Step 2: validate target task is in the desired list
  if v_desired_task_ids is null
     or not (p_accepter_task_id = any(v_desired_task_ids)) then
    raise exception 'invalid_target';
  end if;

  -- Step 3: lock requester assignment row and capture current guest + task
  select guest_id, task_id
    into v_requester_guest_id, v_requester_task_id
    from task_assignments
    where id = v_requester_assignment_id
    for update;

  if not found then
    raise exception 'not_found';
  end if;

  -- Step 4: guard against self-accept (same guest on both sides)
  if v_requester_guest_id = p_accepter_guest_id then
    raise exception 'self_accept';
  end if;

  -- Step 5: lock the accepter's assignment on the desired task
  select id
    into v_accepter_assignment_id
    from task_assignments
    where task_id = p_accepter_task_id
      and guest_id = p_accepter_guest_id
    for update;

  if not found then
    raise exception 'not_assigned';
  end if;

  -- Step 6: reject if accepter already holds an assignment on the requester's
  -- task — the subsequent UPDATE would violate unique(task_id, guest_id), and
  -- semantically the accepter wouldn't gain anything from the swap.
  if exists (
    select 1
      from task_assignments
      where task_id = v_requester_task_id
        and guest_id = p_accepter_guest_id
        and id <> v_accepter_assignment_id
  ) then
    raise exception 'accepter_has_task';
  end if;

  -- Step 7: swap guest_ids between the two assignments.
  -- is_owner flags stay untouched — they mark the original assignee.
  -- Order matters: update the requester's row first (task X: requester→accepter),
  -- then the accepter's row (task Y: accepter→requester). The pre-check in
  -- Step 6 guarantees no unique-constraint collision across this sequence.
  update task_assignments
     set guest_id = p_accepter_guest_id
   where id = v_requester_assignment_id;

  update task_assignments
     set guest_id = v_requester_guest_id
   where id = v_accepter_assignment_id;

  -- Step 8: mark swap accepted
  update swap_requests
     set status = 'accepted'
   where id = p_swap_id;
end;
$$;

-- Access control: revoke the default public grant and restrict to service_role
-- only. The server action at src/lib/actions/guest/tasks.ts is the sole caller
-- and uses the service-role client. Anon/authenticated must NOT be able to
-- invoke this function directly (would allow forging p_accepter_guest_id via
-- the public anon key).
revoke execute on function accept_swap_request(uuid, uuid, uuid) from public;
revoke execute on function accept_swap_request(uuid, uuid, uuid) from anon;
revoke execute on function accept_swap_request(uuid, uuid, uuid) from authenticated;
grant  execute on function accept_swap_request(uuid, uuid, uuid) to service_role;
