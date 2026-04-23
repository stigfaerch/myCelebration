'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { clearScreenOverridesFor } from '@/lib/actions/screen'

export type MemoryType = 'funny' | 'solemn' | 'everyday' | 'milestone'

export interface MemoryGuest {
  id: string
  name: string
  type: string
}

export interface Memory {
  id: string
  guest_id: string
  title: string
  type: MemoryType
  description: string | null
  when_date: string | null
  image_url: string | null
  created_at: string
  guests: MemoryGuest | null
}

export interface MemoryUpdateFormData {
  title: string
  description: string | null
  when_date: string | null
}

function normalizeGuest(raw: unknown): MemoryGuest | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as MemoryGuest) ?? null
  return raw as MemoryGuest
}

export async function getMemories(): Promise<Memory[]> {
  const { data, error } = await supabaseServer
    .from('memories')
    .select('*, guests(id, name, type)')
    .order('created_at', { ascending: false })
  if (error) throw new Error('Failed to load memories')
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as Memory),
    guests: normalizeGuest(row.guests),
  })) as Memory[]
}

export async function updateMemory(
  id: string,
  formData: MemoryUpdateFormData
): Promise<void> {
  await assertAdmin()

  const { error } = await supabaseServer
    .from('memories')
    .update({
      title: formData.title,
      description: formData.description,
      when_date: formData.when_date,
    })
    .eq('id', id)
  if (error) throw new Error('Failed to update memory')

  revalidatePath('/admin/minder')
}

export async function deleteMemory(id: string): Promise<void> {
  await assertAdmin()

  await clearScreenOverridesFor('memory', id)

  const { error } = await supabaseServer.from('memories').delete().eq('id', id)
  if (error) throw new Error('Failed to delete memory')

  revalidatePath('/admin/minder')
}
