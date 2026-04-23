'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'

export type GallerySource = 'photos' | 'memories' | 'both'
export type GalleryDisplayType = 'single' | 'quad' | 'frames'

export interface GalleryConfig {
  id: string
  filter_after: string | null
  filter_before: string | null
  source: GallerySource
  interval_seconds: number
  display_type: GalleryDisplayType
  show_memory_text: boolean
}

export interface GalleryConfigFormData {
  filter_after: string | null
  filter_before: string | null
  source: GallerySource
  interval_seconds: number
  display_type: GalleryDisplayType
  show_memory_text: boolean
}

const DEFAULT_GALLERY_CONFIG = {
  source: 'both' as const,
  interval_seconds: 8,
  display_type: 'single' as const,
  show_memory_text: false,
  filter_after: null,
  filter_before: null,
}

async function ensureGalleryConfig(): Promise<GalleryConfig> {
  const { data, error } = await supabaseServer
    .from('gallery_config')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('Failed to load gallery configuration')
  if (data) return data as GalleryConfig

  const { data: inserted, error: insertError } = await supabaseServer
    .from('gallery_config')
    .insert(DEFAULT_GALLERY_CONFIG)
    .select('*')
    .single()
  if (insertError || !inserted) throw new Error('Failed to load gallery configuration')
  return inserted as GalleryConfig
}

export async function getGalleryConfig(): Promise<GalleryConfig> {
  return ensureGalleryConfig()
}

export async function updateGalleryConfig(formData: GalleryConfigFormData): Promise<void> {
  await assertAdmin()

  const existing = await ensureGalleryConfig()

  const { error } = await supabaseServer
    .from('gallery_config')
    .update({
      filter_after: formData.filter_after,
      filter_before: formData.filter_before,
      source: formData.source,
      interval_seconds: formData.interval_seconds,
      display_type: formData.display_type,
      show_memory_text: formData.show_memory_text,
    })
    .eq('id', existing.id)
  if (error) throw new Error('Failed to update gallery configuration')

  revalidatePath('/admin/galleri')
}
