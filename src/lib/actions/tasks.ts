'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'

export interface Task {
  id: string
  title: string
  description: string | null
  location: string | null
  due_time: string | null
  max_persons: number | null
  contact_host: boolean
  sort_order: number
  created_at: string
}

export async function getTasks() {
  const { data, error } = await supabaseServer
    .from('tasks')
    .select('*, task_assignments(id, guest_id, is_owner, guests(id, name, type))')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return data
}

export async function createTask(formData: {
  title: string
  description?: string
  location?: string
  due_time?: string
  max_persons?: number | null
  contact_host: boolean
}) {
  const { error } = await supabaseServer.from('tasks').insert(formData)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/opgaver')
}

export async function updateTask(id: string, formData: {
  title: string
  description?: string
  location?: string
  due_time?: string
  max_persons?: number | null
  contact_host: boolean
}) {
  const { error } = await supabaseServer.from('tasks').update(formData).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/opgaver')
}

export async function deleteTask(id: string) {
  const { error } = await supabaseServer.from('tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/opgaver')
}

export async function toggleContactHost(id: string, contact_host: boolean) {
  const { error } = await supabaseServer
    .from('tasks')
    .update({ contact_host })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/opgaver')
}

export async function assignGuestToTask(taskId: string, guestId: string) {
  const { data: existing } = await supabaseServer
    .from('task_assignments')
    .select('id')
    .eq('task_id', taskId)
    .eq('guest_id', guestId)
    .maybeSingle()
  if (existing) return

  const { error } = await supabaseServer
    .from('task_assignments')
    .insert({ task_id: taskId, guest_id: guestId, is_owner: false })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/opgaver')
}

export async function removeGuestFromTask(assignmentId: string) {
  const { error } = await supabaseServer
    .from('task_assignments')
    .delete()
    .eq('id', assignmentId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/opgaver')
}

export async function moveGuestToTask(assignmentId: string, newTaskId: string) {
  const { error } = await supabaseServer
    .from('task_assignments')
    .update({ task_id: newTaskId })
    .eq('id', assignmentId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/opgaver')
}
