'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'

export type PerformanceType = 'speech' | 'toast' | 'music' | 'dance' | 'poem' | 'other'
export type PerformanceStatus = 'pending' | 'approved' | 'rejected' | 'scheduled'

export interface Performance {
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

export async function getPerformances() {
  const { data, error } = await supabaseServer
    .from('performances')
    .select('*, guests(name, type)')
    .order('created_at', { ascending: false })
  if (error) throw new Error('Failed to load performances')
  return data
}

export async function updatePerformanceDuration(id: string, duration_minutes: number | null) {
  await assertAdmin()
  const { error } = await supabaseServer
    .from('performances')
    .update({ duration_minutes })
    .eq('id', id)
  if (error) throw new Error('Failed to update duration')
  revalidatePath('/admin/indslag')
  revalidatePath('/admin/program')
}

export async function updatePerformanceStatus(id: string, status: PerformanceStatus) {
  await assertAdmin()
  const { error } = await supabaseServer
    .from('performances')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error('Failed to update status')
  revalidatePath('/admin/indslag')
}
