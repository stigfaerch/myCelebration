'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { clearScreenOverridesFor } from '@/lib/actions/screen'

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
  is_favorite: boolean
  created_at: string
  guests: PhotoGuest | null
}

export interface PhotoFilters {
  after?: string | null
  before?: string | null
  active?: boolean | null
  is_favorite?: boolean | null
}

function normalizeGuest(raw: unknown): PhotoGuest | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as PhotoGuest) ?? null
  return raw as PhotoGuest
}

export async function getPhotos(filters: PhotoFilters = {}): Promise<Photo[]> {
  let query = supabaseServer
    .from('photos')
    .select('*, guests(id, name, type)')
    .order('taken_at', { ascending: false })

  if (filters.after) query = query.gte('taken_at', filters.after)
  if (filters.before) query = query.lte('taken_at', filters.before)
  if (typeof filters.active === 'boolean') query = query.eq('is_active', filters.active)
  if (typeof filters.is_favorite === 'boolean')
    query = query.eq('is_favorite', filters.is_favorite)

  const { data, error } = await query
  if (error) throw new Error('Failed to load photos')
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as Photo),
    guests: normalizeGuest(row.guests),
  })) as Photo[]
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

export async function togglePhotoFavorite(
  id: string,
  is_favorite: boolean
): Promise<void> {
  await assertAdmin()

  const { error } = await supabaseServer
    .from('photos')
    .update({ is_favorite })
    .eq('id', id)
  if (error) throw new Error('Failed to update photo')

  revalidatePath('/admin/billeder')
}

export async function deletePhoto(id: string): Promise<void> {
  await assertAdmin()

  await clearScreenOverridesFor('photo', id)

  const { error } = await supabaseServer.from('photos').delete().eq('id', id)
  if (error) throw new Error('Failed to delete photo')

  revalidatePath('/admin/billeder')
}
