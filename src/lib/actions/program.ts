'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'

export type ProgramItemType = 'break' | 'performance' | 'info' | 'ceremony'

export interface ProgramItem {
  id: string
  title: string
  start_time: string | null
  duration_minutes: number | null
  type: ProgramItemType
  performance_id: string | null
  sort_order: number
  parent_id: string | null
  notes: string | null
  created_at: string
}

export async function getProgramItems() {
  const { data, error } = await supabaseServer
    .from('program_items')
    .select('*, performances(id, title, type, duration_minutes, guests(name))')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return data
}

export async function createProgramItem(formData: {
  title: string
  type: ProgramItemType
  start_time?: string | null
  duration_minutes?: number | null
  performance_id?: string | null
  parent_id?: string | null
  notes?: string | null
}) {
  const parentId = formData.parent_id ?? null
  const { count } = await supabaseServer
    .from('program_items')
    .select('*', { count: 'exact', head: true })
    .is('parent_id', parentId)
  const sort_order = count ?? 0

  const { error } = await supabaseServer
    .from('program_items')
    .insert({ ...formData, sort_order })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/program')
}

export async function updateProgramItem(id: string, formData: {
  title: string
  type: ProgramItemType
  start_time?: string | null
  duration_minutes?: number | null
  performance_id?: string | null
  parent_id?: string | null
  notes?: string | null
}) {
  const { error } = await supabaseServer
    .from('program_items')
    .update(formData)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/program')
}

export async function deleteProgramItem(id: string) {
  // Delete children first (parent_id = id), then the item itself
  await supabaseServer.from('program_items').delete().eq('parent_id', id)
  const { error } = await supabaseServer.from('program_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/program')
}

export async function moveProgramItemUp(id: string) {
  const { data: current } = await supabaseServer
    .from('program_items')
    .select('sort_order, parent_id')
    .eq('id', id)
    .single()
  if (!current) return

  const { data: above } = await supabaseServer
    .from('program_items')
    .select('id, sort_order')
    .is('parent_id', current.parent_id)
    .lt('sort_order', current.sort_order)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!above) return

  await Promise.all([
    supabaseServer.from('program_items').update({ sort_order: above.sort_order }).eq('id', id),
    supabaseServer.from('program_items').update({ sort_order: current.sort_order }).eq('id', above.id),
  ])
  revalidatePath('/admin/program')
}

export async function moveProgramItemDown(id: string) {
  const { data: current } = await supabaseServer
    .from('program_items')
    .select('sort_order, parent_id')
    .eq('id', id)
    .single()
  if (!current) return

  const { data: below } = await supabaseServer
    .from('program_items')
    .select('id, sort_order')
    .is('parent_id', current.parent_id)
    .gt('sort_order', current.sort_order)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!below) return

  await Promise.all([
    supabaseServer.from('program_items').update({ sort_order: below.sort_order }).eq('id', id),
    supabaseServer.from('program_items').update({ sort_order: current.sort_order }).eq('id', below.id),
  ])
  revalidatePath('/admin/program')
}
