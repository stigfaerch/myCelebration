'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest, assertNotScreen } from '@/lib/auth/resolveGuest'

export type PerformanceType = 'speech' | 'toast' | 'music' | 'dance' | 'poem' | 'other'
export type PerformanceStatus = 'pending' | 'approved' | 'rejected' | 'scheduled'

const PERFORMANCE_TYPE_VALUES: readonly PerformanceType[] = [
  'speech',
  'toast',
  'music',
  'dance',
  'poem',
  'other',
] as const

export interface MyPerformance {
  id: string
  guest_id: string
  type: PerformanceType[]
  title: string
  description: string | null
  duration_minutes: number | null
  sort_order: number
  status: PerformanceStatus
  created_at: string
}

export interface PerformanceInput {
  type: PerformanceType[]
  title: string
  description?: string | null
  duration_minutes?: number | null
}

function validateTypes(types: PerformanceType[]): PerformanceType[] {
  if (!Array.isArray(types) || types.length === 0) {
    throw new Error('Vælg mindst én type')
  }
  // Dedupe + allowlist guard. Any unknown value is rejected outright so a
  // malicious client can't smuggle arbitrary strings into an enum array.
  const seen = new Set<PerformanceType>()
  for (const t of types) {
    if (!PERFORMANCE_TYPE_VALUES.includes(t)) {
      throw new Error('Ugyldig type')
    }
    seen.add(t)
  }
  return Array.from(seen)
}

export async function getMyPerformances(): Promise<MyPerformance[]> {
  const guest = await resolveGuest()
  const { data, error } = await supabaseServer
    .from('performances')
    .select('*')
    .eq('guest_id', guest.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Failed to load performances')
  return (data ?? []) as MyPerformance[]
}

export async function createPerformance(input: PerformanceInput): Promise<void> {
  const guest = await assertNotScreen()
  const title = input.title?.trim()
  if (!title) throw new Error('Title required')
  const types = validateTypes(input.type)

  const payload = {
    guest_id: guest.id,
    type: types,
    title,
    description: input.description?.trim() || null,
    duration_minutes:
      typeof input.duration_minutes === 'number' && Number.isFinite(input.duration_minutes)
        ? input.duration_minutes
        : null,
    status: 'pending' as PerformanceStatus,
  }

  const { error } = await supabaseServer.from('performances').insert(payload)
  if (error) throw new Error('Failed to create performance')
  revalidatePath('/' + guest.id)
}

export async function updatePerformance(id: string, input: PerformanceInput): Promise<void> {
  const guest = await assertNotScreen()
  const title = input.title?.trim()
  if (!title) throw new Error('Title required')
  const types = validateTypes(input.type)

  // Ownership enforced by combined WHERE (id + guest_id)
  const payload = {
    type: types,
    title,
    description: input.description?.trim() || null,
    duration_minutes:
      typeof input.duration_minutes === 'number' && Number.isFinite(input.duration_minutes)
        ? input.duration_minutes
        : null,
    // NOTE: status and sort_order are admin-only — never set here
  }

  const { error } = await supabaseServer
    .from('performances')
    .update(payload)
    .eq('id', id)
    .eq('guest_id', guest.id)
  if (error) throw new Error('Failed to update performance')
  revalidatePath('/' + guest.id)
}

export async function deletePerformance(id: string): Promise<void> {
  const guest = await assertNotScreen()
  const { error } = await supabaseServer
    .from('performances')
    .delete()
    .eq('id', id)
    .eq('guest_id', guest.id)
  if (error) throw new Error('Failed to delete performance')
  revalidatePath('/' + guest.id)
}
