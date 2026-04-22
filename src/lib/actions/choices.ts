'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'

export type ChoiceType = 'binary' | 'multichoice' | 'text'

export interface ChoiceDefinition {
  id: string
  title: string
  type: ChoiceType
  options: string[] | null
  sort_order: number
  created_at: string
  response_count?: number
}

export async function getChoiceDefinitions(): Promise<ChoiceDefinition[]> {
  const { data, error } = await supabaseServer
    .from('choice_definitions')
    .select('*, guest_choices(count)')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as ChoiceDefinition),
    response_count: Array.isArray(row.guest_choices)
      ? (row.guest_choices[0] as { count: number } | undefined)?.count ?? 0
      : 0,
  }))
}

export async function createChoiceDefinition(formData: FormData) {
  const type = formData.get('type') as ChoiceType
  const optionsRaw = formData.get('options') as string | null
  const options = type === 'multichoice' && optionsRaw
    ? optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean)
    : null

  const { error } = await supabaseServer.from('choice_definitions').insert({
    title: formData.get('title') as string,
    type,
    options,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/deltagere/valg')
}

export async function updateChoiceDefinition(id: string, formData: FormData) {
  const type = formData.get('type') as ChoiceType
  const optionsRaw = formData.get('options') as string | null
  const options = type === 'multichoice' && optionsRaw
    ? optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean)
    : null

  const { error } = await supabaseServer
    .from('choice_definitions')
    .update({ title: formData.get('title') as string, type, options })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/deltagere/valg')
}

export async function deleteChoiceDefinition(id: string) {
  const { count } = await supabaseServer
    .from('guest_choices')
    .select('*', { count: 'exact', head: true })
    .eq('choice_definition_id', id)

  if ((count ?? 0) > 0) {
    const confirmed = true // Server-side: deletion always allowed, confirm on client
    if (!confirmed) return
  }

  const { error } = await supabaseServer.from('choice_definitions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/deltagere/valg')
}
