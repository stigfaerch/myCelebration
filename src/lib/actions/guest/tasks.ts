'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest, assertNotScreen } from '@/lib/auth/resolveGuest'

export interface TaskSummary {
  id: string
  title: string
  description: string | null
  location: string | null
  due_time: string | null
  max_persons: number | null
  contact_host: boolean
}

export interface MyAssignment {
  id: string
  task_id: string
  guest_id: string
  is_owner: boolean
  tasks: TaskSummary | null
}

export interface SwappableTask {
  id: string
  title: string
  location: string | null
  due_time: string | null
  max_persons: number | null
}

export type SwapStatus = 'pending' | 'accepted' | 'cancelled'

export interface MySwapRequest {
  id: string
  requester_assignment_id: string
  desired_task_ids: string[]
  status: SwapStatus
  created_at: string
}

export interface IncomingSwapRequest {
  id: string
  created_at: string
  requester_guest_id: string
  requester_guest_name: string
  requester_task_id: string
  requester_task_title: string
  desired_task_ids: string[]
  my_matching_task_ids: string[]
}

function normalizeTask(raw: unknown): TaskSummary | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as TaskSummary) ?? null
  return raw as TaskSummary
}

function normalizeFirst<T>(raw: unknown): T | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as T) ?? null
  return raw as T
}

export async function getMyAssignments(): Promise<MyAssignment[]> {
  const guest = await resolveGuest()
  const { data, error } = await supabaseServer
    .from('task_assignments')
    .select(
      'id, task_id, guest_id, is_owner, tasks(id, title, description, location, due_time, max_persons, contact_host)'
    )
    .eq('guest_id', guest.id)
  if (error) throw new Error('Failed to load assignments')
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    task_id: row.task_id as string,
    guest_id: row.guest_id as string,
    is_owner: row.is_owner as boolean,
    tasks: normalizeTask(row.tasks),
  }))
}

export async function getAssignmentCount(): Promise<number> {
  const guest = await resolveGuest()
  const { count, error } = await supabaseServer
    .from('task_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('guest_id', guest.id)
  if (error) throw new Error('Failed to load assignment count')
  return count ?? 0
}

export async function getSwappableTasks(): Promise<SwappableTask[]> {
  const guest = await resolveGuest()

  const [tasksResult, mineResult] = await Promise.all([
    supabaseServer
      .from('tasks')
      .select('id, title, location, due_time, max_persons, contact_host')
      .eq('contact_host', false)
      .order('sort_order', { ascending: true }),
    supabaseServer
      .from('task_assignments')
      .select('task_id')
      .eq('guest_id', guest.id),
  ])

  if (tasksResult.error) throw new Error('Failed to load swappable tasks')
  if (mineResult.error) throw new Error('Failed to load assignments')

  const myTaskIds = new Set(
    ((mineResult.data ?? []) as Array<{ task_id: string }>).map((r) => r.task_id)
  )

  const rows = (tasksResult.data ?? []) as Array<
    TaskSummary & { contact_host: boolean }
  >
  return rows
    .filter((t) => !myTaskIds.has(t.id))
    .map(({ id, title, location, due_time, max_persons }) => ({
      id,
      title,
      location,
      due_time,
      max_persons,
    }))
}

export async function getMySwapRequests(): Promise<MySwapRequest[]> {
  const guest = await resolveGuest()

  // First fetch all of my assignment IDs, then swap_requests in those IDs.
  // This avoids relying on PostgREST embedded-filter quirks with the untyped client.
  const { data: mine, error: mineErr } = await supabaseServer
    .from('task_assignments')
    .select('id')
    .eq('guest_id', guest.id)
  if (mineErr) throw new Error('Failed to load assignments')

  const assignmentIds = ((mine ?? []) as Array<{ id: string }>).map((r) => r.id)
  if (assignmentIds.length === 0) return []

  const { data, error } = await supabaseServer
    .from('swap_requests')
    .select('id, requester_assignment_id, desired_task_ids, status, created_at')
    .in('requester_assignment_id', assignmentIds)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Failed to load swap requests')
  return (data ?? []) as MySwapRequest[]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function createSwapRequest(
  assignmentId: string,
  desiredTaskIds: string[]
): Promise<void> {
  const guest = await assertNotScreen()

  if (!UUID_RE.test(assignmentId)) throw new Error('Ugyldige bytte-mål')
  if (!Array.isArray(desiredTaskIds) || desiredTaskIds.length === 0) {
    throw new Error('Ugyldige bytte-mål')
  }
  if (!desiredTaskIds.every((id) => typeof id === 'string' && UUID_RE.test(id))) {
    throw new Error('Ugyldige bytte-mål')
  }

  const uniqueDesired = Array.from(new Set(desiredTaskIds))
  if (uniqueDesired.length !== desiredTaskIds.length) {
    throw new Error('Ugyldige bytte-mål')
  }

  // Verify assignment ownership + capture own task_id to exclude it as a target
  const { data: assignment, error: assignmentErr } = await supabaseServer
    .from('task_assignments')
    .select('id, guest_id, task_id')
    .eq('id', assignmentId)
    .maybeSingle()
  if (assignmentErr) throw new Error('Failed to verify assignment')
  if (!assignment) throw new Error('Not found')
  const ownAssignment = assignment as { guest_id: string; task_id: string }
  if (ownAssignment.guest_id !== guest.id) throw new Error('Forbidden')

  // Reject if any desired target is the assignment's own task
  if (uniqueDesired.includes(ownAssignment.task_id)) {
    throw new Error('Ugyldige bytte-mål')
  }

  // Reject if any desired target is a task the requester is already assigned to
  const { data: mineRows, error: mineErr } = await supabaseServer
    .from('task_assignments')
    .select('task_id')
    .eq('guest_id', guest.id)
  if (mineErr) throw new Error('Failed to verify assignments')
  const myTaskIds = new Set(((mineRows ?? []) as Array<{ task_id: string }>).map((r) => r.task_id))
  if (uniqueDesired.some((id) => myTaskIds.has(id))) {
    throw new Error('Ugyldige bytte-mål')
  }

  // Reject if a pending swap request already exists for this assignment
  const { data: existing, error: existingErr } = await supabaseServer
    .from('swap_requests')
    .select('id')
    .eq('requester_assignment_id', assignmentId)
    .eq('status', 'pending')
    .limit(1)
  if (existingErr) throw new Error('Failed to check existing swap requests')
  if (existing && existing.length > 0) {
    throw new Error('Der er allerede en aktiv bytte-forespørgsel for denne opgave')
  }

  // Verify all desired tasks exist and none have contact_host=true
  const { data: targets, error: targetsErr } = await supabaseServer
    .from('tasks')
    .select('id, contact_host')
    .in('id', uniqueDesired)
  if (targetsErr) throw new Error('Failed to verify targets')
  const targetRows = (targets ?? []) as Array<{ id: string; contact_host: boolean }>
  if (targetRows.length !== uniqueDesired.length) {
    throw new Error('Ugyldige bytte-mål')
  }
  if (targetRows.some((t) => t.contact_host)) {
    throw new Error('Ugyldige bytte-mål')
  }

  const { error } = await supabaseServer.from('swap_requests').insert({
    requester_assignment_id: assignmentId,
    desired_task_ids: uniqueDesired,
    status: 'pending',
  })
  if (error) throw new Error('Failed to create swap request')

  revalidatePath('/' + guest.id + '/opgaver')
}

export async function cancelSwapRequest(swapId: string): Promise<void> {
  const guest = await assertNotScreen()

  const { data: swap, error: swapErr } = await supabaseServer
    .from('swap_requests')
    .select('id, requester_assignment_id')
    .eq('id', swapId)
    .maybeSingle()
  if (swapErr) throw new Error('Failed to verify swap request')
  if (!swap) throw new Error('Not found')

  const requesterAssignmentId = (swap as { requester_assignment_id: string })
    .requester_assignment_id

  const { data: assignment, error: assignmentErr } = await supabaseServer
    .from('task_assignments')
    .select('guest_id')
    .eq('id', requesterAssignmentId)
    .maybeSingle()
  if (assignmentErr) throw new Error('Failed to verify assignment')
  if (!assignment || (assignment as { guest_id: string }).guest_id !== guest.id) {
    throw new Error('Forbidden')
  }

  const { error } = await supabaseServer
    .from('swap_requests')
    .update({ status: 'cancelled' })
    .eq('id', swapId)
  if (error) throw new Error('Failed to cancel swap request')

  revalidatePath('/' + guest.id + '/opgaver')
}

export async function getIncomingSwapRequests(): Promise<IncomingSwapRequest[]> {
  const guest = await resolveGuest()

  // 1. Caller's assignments (id + task_id) to compute overlap and filter later.
  const { data: mineRows, error: mineErr } = await supabaseServer
    .from('task_assignments')
    .select('id, task_id')
    .eq('guest_id', guest.id)
  if (mineErr) throw new Error('Failed to load assignments')

  const myAssignments = (mineRows ?? []) as Array<{ id: string; task_id: string }>
  const myTaskIds = myAssignments.map((r) => r.task_id)
  if (myTaskIds.length === 0) return []

  // 2. Pending swaps that target any of my tasks via desired_task_ids overlap.
  const { data: swapRows, error: swapErr } = await supabaseServer
    .from('swap_requests')
    .select('id, created_at, requester_assignment_id, desired_task_ids, status')
    .eq('status', 'pending')
    .overlaps('desired_task_ids', myTaskIds)
    .order('created_at', { ascending: false })
  if (swapErr) throw new Error('Failed to load incoming swap requests')

  const swaps = (swapRows ?? []) as Array<{
    id: string
    created_at: string
    requester_assignment_id: string
    desired_task_ids: string[]
  }>
  if (swaps.length === 0) return []

  // 3. Resolve requester assignment → guest name + task title.
  const requesterAssignmentIds = Array.from(
    new Set(swaps.map((s) => s.requester_assignment_id))
  )
  const { data: reqRows, error: reqErr } = await supabaseServer
    .from('task_assignments')
    .select('id, guest_id, task_id, tasks(id, title), guests(id, name)')
    .in('id', requesterAssignmentIds)
  if (reqErr) throw new Error('Failed to resolve requester assignments')

  const reqMap = new Map<
    string,
    { guest_id: string; guest_name: string; task_id: string; task_title: string }
  >()
  for (const row of (reqRows ?? []) as Array<Record<string, unknown>>) {
    const task = normalizeFirst<{ id: string; title: string }>(row.tasks)
    const guestRec = normalizeFirst<{ id: string; name: string }>(row.guests)
    if (!task || !guestRec) continue
    reqMap.set(row.id as string, {
      guest_id: row.guest_id as string,
      guest_name: guestRec.name,
      task_id: row.task_id as string,
      task_title: task.title,
    })
  }

  const myTaskIdSet = new Set(myTaskIds)

  const results: IncomingSwapRequest[] = []
  for (const swap of swaps) {
    const requester = reqMap.get(swap.requester_assignment_id)
    if (!requester) continue
    // Exclude self-originated swaps.
    if (requester.guest_id === guest.id) continue
    const matching = swap.desired_task_ids.filter((id) => myTaskIdSet.has(id))
    if (matching.length === 0) continue
    results.push({
      id: swap.id,
      created_at: swap.created_at,
      requester_guest_id: requester.guest_id,
      requester_guest_name: requester.guest_name,
      requester_task_id: requester.task_id,
      requester_task_title: requester.task_title,
      desired_task_ids: swap.desired_task_ids,
      my_matching_task_ids: matching,
    })
  }

  return results
}

export async function acceptSwapRequest(
  swapId: string,
  accepterTaskId: string
): Promise<void> {
  const guest = await assertNotScreen()

  if (!UUID_RE.test(swapId)) throw new Error('Ugyldigt valg')
  if (!UUID_RE.test(accepterTaskId)) throw new Error('Ugyldigt valg')

  const { error } = await supabaseServer.rpc('accept_swap_request', {
    p_swap_id: swapId,
    p_accepter_guest_id: guest.id,
    p_accepter_task_id: accepterTaskId,
  })

  if (error) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('not_found')) {
      throw new Error('Bytte-forespørgsel ikke fundet')
    }
    if (msg.includes('already_accepted')) {
      throw new Error('Denne bytte-forespørgsel er allerede accepteret')
    }
    if (msg.includes('invalid_target')) {
      throw new Error('Ugyldigt valg')
    }
    if (msg.includes('not_assigned')) {
      throw new Error('Du har ikke den valgte opgave')
    }
    if (msg.includes('self_accept')) {
      throw new Error('Du kan ikke acceptere din egen forespørgsel')
    }
    if (msg.includes('accepter_has_task')) {
      throw new Error('Du har allerede den opgave, som forespørgeren vil bytte væk')
    }
    throw new Error('Kunne ikke acceptere bytte')
  }

  revalidatePath('/' + guest.id + '/opgaver')
}
