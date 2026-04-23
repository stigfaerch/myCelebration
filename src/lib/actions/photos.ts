'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'

export interface PhotoGuest {
  id: string
  name: string
  type: string
}

export interface Photo {
  id: string
  guest_id: string
  storage_url: string
  taken_at: string
  is_active: boolean
  created_at: string
  guests: PhotoGuest | null
}

export interface PhotoFilters {
  after?: string | null
  before?: string | null
  active?: boolean | null
}

export async function getPhotos(filters: PhotoFilters = {}): Promise<Photo[]> {
  let query = supabaseServer
    .from('photos')
    .select('*, guests(id, name, type)')
    .order('taken_at', { ascending: false })

  if (filters.after) query = query.gte('taken_at', filters.after)
  if (filters.before) query = query.lte('taken_at', filters.before)
  if (typeof filters.active === 'boolean') query = query.eq('is_active', filters.active)

  const { data, error } = await query
  if (error) throw new Error('Failed to load photos')
  return (data ?? []) as Photo[]
}

export async function togglePhotoActive(id: string, is_active: boolean): Promise<void> {
  await assertAdmin()

  const { error } = await supabaseServer
    .from('photos')
    .update({ is_active })
    .eq('id', id)
  if (error) throw new Error('Failed to update photo')

  revalidatePath('/admin/billeder')
}

export async function deletePhoto(id: string): Promise<void> {
  await assertAdmin()

  const { error } = await supabaseServer.from('photos').delete().eq('id', id)
  if (error) throw new Error('Failed to delete photo')

  revalidatePath('/admin/billeder')
}
