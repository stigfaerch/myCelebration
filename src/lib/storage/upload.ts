'use server'
import { supabaseServer } from '@/lib/supabase/server'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/heic'])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export interface UploadResult {
  storage_url: string
  path: string
}

export async function uploadImage(
  file: File,
  opts: { prefix: 'photo' | 'memory' }
): Promise<UploadResult> {
  if (!ALLOWED.has(file.type)) throw new Error('Filtype ikke understøttet')
  if (file.size > MAX_BYTES) throw new Error('Filen er for stor (maks 10 MB)')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const id = crypto.randomUUID()
  const path = `original/${opts.prefix}-${id}.${ext}`

  const { error } = await supabaseServer.storage
    .from('images')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error('Upload fejlede')

  const { data } = supabaseServer.storage.from('images').getPublicUrl(path)
  return { storage_url: data.publicUrl, path }
}

export async function deleteStorageObjectByUrl(storage_url: string): Promise<void> {
  try {
    const marker = '/object/public/images/'
    const i = storage_url.indexOf(marker)
    if (i < 0) return
    const path = storage_url.slice(i + marker.length)
    await supabaseServer.storage.from('images').remove([path])
  } catch {
    // Best-effort — DB row already deleted
  }
}
