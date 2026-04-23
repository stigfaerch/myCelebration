-- accept_swap_request — atomic acceptance of a task swap request
--
-- Semantics:
--   1. Lock the swap_requests row FOR UPDATE (serializes concurrent callers).
--   2. Validate request exists, is pending, target task is in desired_task_ids,
--      accepter is assigned to that target task, and is not self-accepting.
--   3. Lock requester + accepter task_assignments rows FOR UPDATE.
--   4. Swap guest_ids between the two assignments. Preserve is_owner flags —
--      they describe the ORIGINAL assignee identity, not the current holder
--      (per Phase 3 design note).
--   5. Mark swap_requests.status = 'accepted'.
--
-- Failure modes (raised as exceptions, caught by caller and mapped to
-- user-facing Danish strings):
--   not_found         — swap_id does not exist
--   already_accepted  — swap is not in 'pending' status
--   invalid_target    — accepter_task_id is not in desired_task_ids
--   not_assigned      — accepter_guest_id is not assigned to accepter_task_id
--   self_accept       — accepter_guest_id equals requester's current guest_id

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

  -- Step 3: lock requester assignment row and capture current guest
  select guest_id
    into v_requester_guest_id
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

  -- Step 6: swap guest_ids between the two assignments.
  -- is_owner flags stay untouched — they mark the original assignee.
  -- Use a temporary sentinel guest_id swap via a two-step update to avoid
  -- violating the unique(task_id, guest_id) constraint mid-transaction.
  -- Strategy: set requester's guest_id to accepter's, then accepter's to
  -- the captured requester guest.
  update task_assignments
     set guest_id = p_accepter_guest_id
   where id = v_requester_assignment_id;

  update task_assignments
     set guest_id = v_requester_guest_id
   where id = v_accepter_assignment_id;

  -- Step 7: mark swap accepted
  update swap_requests
     set status = 'accepted'
   where id = p_swap_id;
end;
$$;

grant execute on function accept_swap_request(uuid, uuid, uuid)
  to anon, authenticated, service_role;
