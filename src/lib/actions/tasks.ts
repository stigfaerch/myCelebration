'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'

export interface Task {
  id: string
  title: string
  description: string | null
  location: string | null
  due_time: string | null
  max_persons: number | null
  contact_host: boolean
  is_easy: boolean
  sort_order: number
  created_at: string
}

export async function getTasks() {
  const { data, error } = await supabaseServer
    .from('tasks')
    .select('*, task_assignments(id, guest_id, is_owner, guests(id, name, type))')
    .order('sort_order')
  if (error) throw new Error('Failed to load tasks')
  return data
}

export async function createTask(formData: {
  title: string
  description?: string
  location?: string
  due_time?: string
  max_persons?: number | null
  contact_host: boolean
  is_easy: boolean
}) {
  await assertAdmin()
  const { error } = await supabaseServer.from('tasks').insert(formData)
  if (error) throw new Error('Failed to create task')
  revalidatePath('/admin/opgaver')
}

export async function updateTask(id: string, formData: {
  title: string
  description?: string
  location?: string
  due_time?: string
  max_persons?: number | null
  contact_host: boolean
  is_easy: boolean
}) {
  await assertAdmin()
  const { error } = await supabaseServer.from('tasks').update(formData).eq('id', id)
  if (error) throw new Error('Failed to update task')
  revalidatePath('/admin/opgaver')
}

export async function deleteTask(id: string) {
  await assertAdmin()
  const { error } = await supabaseServer.from('tasks').delete().eq('id', id)
  if (error) throw new Error('Failed to delete task')
  revalidatePath('/admin/opgaver')
}

export async function toggleContactHost(id: string, contact_host: boolean) {
  await assertAdmin()
  const { error } = await supabaseServer
    .from('tasks')
    .update({ contact_host })
    .eq('id', id)
  if (error) throw new Error('Failed to update contact host setting')
  revalidatePath('/admin/opgaver')
}

export async function assignGuestToTask(taskId: string, guestId: string) {
  await assertAdmin()
  const { error } = await supabaseServer
    .from('task_assignments')
    .upsert(
      { task_id: taskId, guest_id: guestId, is_owner: false },
      { onConflict: 'task_id,guest_id' }
    )
  if (error) throw new Error('Failed to assign guest')
  revalidatePath('/admin/opgaver')
}

export async function removeGuestFromTask(assignmentId: string) {
  await assertAdmin()
  const { error } = await supabaseServer
    .from('task_assignments')
    .delete()
    .eq('id', assignmentId)
  if (error) throw new Error('Failed to remove assignment')
  revalidatePath('/admin/opgaver')
}

// contact_host enforcement is handled in the guest-facing swap flow (Phase 6)
export async function moveGuestToTask(assignmentId: string, newTaskId: string) {
  await assertAdmin()
  const { error } = await supabaseServer
    .from('task_assignments')
    .update({ task_id: newTaskId })
    .eq('id', assignmentId)
  if (error) throw new Error('Failed to move assignment')
  revalidatePath('/admin/opgaver')
}
