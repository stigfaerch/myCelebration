'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'

export type ProgramItemType = 'break' | 'performance' | 'info' | 'ceremony' | 'event'

export interface ProgramItem {
  id: string
  title: string
  start_time: string | null
  duration_minutes: number | null
  show_duration: boolean
  type: ProgramItemType
  type_icon: string | null
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
  if (error) throw new Error('Failed to load program items')
  return data
}

async function validateNesting(parentId: string | null | undefined) {
  if (!parentId) return
  const { data: parent } = await supabaseServer
    .from('program_items')
    .select('parent_id')
    .eq('id', parentId)
    .single()
  if (parent?.parent_id) {
    throw new Error('Only one level of nesting is allowed')
  }
}

export async function createProgramItem(formData: {
  title: string
  type: ProgramItemType
  type_icon?: string | null
  start_time?: string | null
  duration_minutes?: number | null
  show_duration?: boolean
  performance_id?: string | null
  parent_id?: string | null
  notes?: string | null
}) {
  await assertAdmin()
  await validateNesting(formData.parent_id)

  const parentId = formData.parent_id ?? null
  const { count } = await supabaseServer
    .from('program_items')
    .select('*', { count: 'exact', head: true })
    .is('parent_id', parentId)
  const sort_order = count ?? 0

  const { error } = await supabaseServer
    .from('program_items')
    .insert({ ...formData, sort_order })
  if (error) throw new Error('Failed to create program item')
  revalidatePath('/admin/program')
}

export async function updateProgramItem(id: string, formData: {
  title: string
  type: ProgramItemType
  type_icon?: string | null
  start_time?: string | null
  duration_minutes?: number | null
  show_duration?: boolean
  performance_id?: string | null
  parent_id?: string | null
  notes?: string | null
}) {
  await assertAdmin()
  await validateNesting(formData.parent_id)

  const { error } = await supabaseServer
    .from('program_items')
    .update(formData)
    .eq('id', id)
  if (error) throw new Error('Failed to update program item')
  revalidatePath('/admin/program')
}

export async function deleteProgramItem(id: string) {
  await assertAdmin()
  const { error } = await supabaseServer.from('program_items').delete().eq('id', id)
  if (error) throw new Error('Failed to delete program item')
  revalidatePath('/admin/program')
}

export async function moveProgramItemUp(id: string) {
  await assertAdmin()
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

  const { error } = await supabaseServer.rpc('swap_program_items', {
    a_id: id,
    b_id: above.id,
  })
  if (error) throw new Error('Failed to reorder items')
  revalidatePath('/admin/program')
}

export async function moveProgramItemDown(id: string) {
  await assertAdmin()
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

  const { error } = await supabaseServer.rpc('swap_program_items', {
    a_id: id,
    b_id: below.id,
  })
  if (error) throw new Error('Failed to reorder items')
  revalidatePath('/admin/program')
}
