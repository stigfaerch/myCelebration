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

function normalizeTask(raw: unknown): TaskSummary | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as TaskSummary) ?? null
  return raw as TaskSummary
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

export async function createSwapRequest(
  assignmentId: string,
  desiredTaskIds: string[]
): Promise<void> {
  const guest = await assertNotScreen()

  if (!Array.isArray(desiredTaskIds) || desiredTaskIds.length === 0) {
    throw new Error('Ugyldige bytte-mål')
  }

  // Verify assignment ownership
  const { data: assignment, error: assignmentErr } = await supabaseServer
    .from('task_assignments')
    .select('id, guest_id')
    .eq('id', assignmentId)
    .maybeSingle()
  if (assignmentErr) throw new Error('Failed to verify assignment')
  if (!assignment) throw new Error('Not found')
  if ((assignment as { guest_id: string }).guest_id !== guest.id) {
    throw new Error('Forbidden')
  }

  // Verify none of the desired tasks have contact_host=true
  const { data: targets, error: targetsErr } = await supabaseServer
    .from('tasks')
    .select('id, contact_host')
    .in('id', desiredTaskIds)
  if (targetsErr) throw new Error('Failed to verify targets')
  const targetRows = (targets ?? []) as Array<{ id: string; contact_host: boolean }>
  if (targetRows.length !== desiredTaskIds.length) {
    throw new Error('Ugyldige bytte-mål')
  }
  if (targetRows.some((t) => t.contact_host)) {
    throw new Error('Ugyldige bytte-mål')
  }

  const { error } = await supabaseServer.from('swap_requests').insert({
    requester_assignment_id: assignmentId,
    desired_task_ids: desiredTaskIds,
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
