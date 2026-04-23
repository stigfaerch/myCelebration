'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest, assertNotScreen } from '@/lib/auth/resolveGuest'

export type ChoiceType = 'binary' | 'multichoice' | 'text'

export interface ChoiceDefinition {
  id: string
  title: string
  type: ChoiceType
  options: string[] | null
  sort_order: number
}

export interface GuestChoiceAnswer {
  id: string
  guest_id: string
  choice_definition_id: string
  value: string | null
}

export async function getChoiceDefinitions(): Promise<ChoiceDefinition[]> {
  // Require an authenticated guest (any type) to read choice definitions
  await resolveGuest()
  const { data, error } = await supabaseServer
    .from('choice_definitions')
    .select('id, title, type, options, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw new Error('Failed to load choices')
  return (data ?? []) as ChoiceDefinition[]
}

export async function getMyChoiceAnswers(): Promise<GuestChoiceAnswer[]> {
  const guest = await resolveGuest()
  const { data, error } = await supabaseServer
    .from('guest_choices')
    .select('id, guest_id, choice_definition_id, value')
    .eq('guest_id', guest.id)
  if (error) throw new Error('Failed to load answers')
  return (data ?? []) as GuestChoiceAnswer[]
}

export async function upsertChoiceAnswer(
  choiceDefinitionId: string,
  value: string | null
): Promise<void> {
  const guest = await assertNotScreen()

  const trimmed = typeof value === 'string' ? value.trim() : value
  if (trimmed === null || trimmed === '') {
    // Clear the answer
    const { error } = await supabaseServer
      .from('guest_choices')
      .delete()
      .eq('guest_id', guest.id)
      .eq('choice_definition_id', choiceDefinitionId)
    if (error) throw new Error('Failed to clear answer')
    revalidatePath('/' + guest.id)
    return
  }

  // Cap text answers to protect against abuse
  const safeValue = trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed

  const { error } = await supabaseServer
    .from('guest_choices')
    .upsert(
      {
        guest_id: guest.id,
        choice_definition_id: choiceDefinitionId,
        value: safeValue,
      },
      { onConflict: 'guest_id,choice_definition_id' }
    )
  if (error) throw new Error('Failed to save answer')
  revalidatePath('/' + guest.id)
}
