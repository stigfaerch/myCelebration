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

export async function getGalleryConfig(): Promise<GalleryConfig> {
  const { data, error } = await supabaseServer
    .from('gallery_config')
    .select('*')
    .single()
  if (error) throw new Error('Failed to load gallery configuration')
  return data as GalleryConfig
}

export async function updateGalleryConfig(formData: GalleryConfigFormData): Promise<void> {
  await assertAdmin()

  const { data: existing, error: existingError } = await supabaseServer
    .from('gallery_config')
    .select('id')
    .single()
  if (existingError || !existing) throw new Error('Failed to update gallery configuration')

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
