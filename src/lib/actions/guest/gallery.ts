'use server'
import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { getGalleryConfig, type GalleryConfig } from '@/lib/actions/gallery'

export interface GalleryItem {
  kind: 'photo' | 'memory'
  id: string
  image_url: string
  title: string | null
  description: string | null
  timestamp: string
}

export async function getGalleryItems(): Promise<{
  config: GalleryConfig
  items: GalleryItem[]
}> {
  await resolveGuest()
  const config = await getGalleryConfig()

  const items: GalleryItem[] = []

  if (config.source === 'photos' || config.source === 'both') {
    let q = supabaseServer
      .from('photos')
      .select('id, storage_url, taken_at')
      .eq('is_active', true)
    if (config.filter_after) q = q.gte('taken_at', config.filter_after)
    if (config.filter_before) q = q.lte('taken_at', config.filter_before)
    const { data } = await q
    for (const row of (data ?? []) as Array<{
      id: string
      storage_url: string
      taken_at: string
    }>) {
      items.push({
        kind: 'photo',
        id: row.id,
        image_url: row.storage_url,
        title: null,
        description: null,
        timestamp: row.taken_at,
      })
    }
  }

  if (config.source === 'memories' || config.source === 'both') {
    let q = supabaseServer
      .from('memories')
      .select('id, title, description, image_url, created_at')
      .not('image_url', 'is', null)
    if (config.filter_after) q = q.gte('created_at', config.filter_after)
    if (config.filter_before) q = q.lte('created_at', config.filter_before)
    const { data } = await q
    for (const row of (data ?? []) as Array<{
      id: string
      title: string | null
      description: string | null
      image_url: string
      created_at: string
    }>) {
      items.push({
        kind: 'memory',
        id: row.id,
        image_url: row.image_url,
        title: row.title ?? null,
        description: row.description ?? null,
        timestamp: row.created_at,
      })
    }
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return { config, items }
}
