'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest, assertNotScreen } from '@/lib/auth/resolveGuest'
import { deleteStorageObjectByUrl } from '@/lib/storage/upload'
import { r2PublicUrl } from '@/lib/storage/r2'

export type MemoryType = 'funny' | 'solemn' | 'everyday' | 'milestone'

export interface MyMemory {
  id: string
  guest_id: string
  title: string
  type: MemoryType
  description: string | null
  when_date: string | null
  image_url: string | null
  created_at: string
}

const VALID_TYPES: ReadonlyArray<MemoryType> = [
  'funny',
  'solemn',
  'everyday',
  'milestone',
]

function parseType(raw: FormDataEntryValue | null): MemoryType {
  const v = typeof raw === 'string' ? raw : ''
  if ((VALID_TYPES as readonly string[]).includes(v)) return v as MemoryType
  throw new Error('Ugyldig mindetype')
}

function str(raw: FormDataEntryValue | null): string {
  return typeof raw === 'string' ? raw.trim() : ''
}

export async function getMyMemories(): Promise<MyMemory[]> {
  const guest = await resolveGuest()
  const { data, error } = await supabaseServer
    .from('memories')
    .select('id, guest_id, title, type, description, when_date, image_url, created_at')
    .eq('guest_id', guest.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Failed to load memories')
  return (data ?? []) as MyMemory[]
}

/**
 * Validates that an `image_url` came from our R2 bucket under the `images/`
 * prefix. We never trust an arbitrary URL from the client, since that would
 * let a malicious caller insert DB rows pointing anywhere.
 */
function assertOwnedR2ImageUrl(url: string): void {
  const expectedPrefix = `${r2PublicUrl('images', '')}`
  if (!url.startsWith(expectedPrefix)) {
    throw new Error('Ugyldig billede-URL')
  }
}

export async function createMemory(formData: FormData): Promise<void> {
  const guest = await assertNotScreen()

  const title = str(formData.get('title'))
  if (!title) throw new Error('Titel er påkrævet')
  const type = parseType(formData.get('type'))
  const description = str(formData.get('description')) || null
  const when_date = str(formData.get('when_date')) || null

  // Image URL (if any) was uploaded via presign before submitting this form.
  // The client validates the file then PUTs directly to R2; we only get the
  // resulting public URL here.
  const rawImageUrl = str(formData.get('image_url'))
  const image_url: string | null = rawImageUrl || null
  if (image_url) assertOwnedR2ImageUrl(image_url)

  const { error } = await supabaseServer.from('memories').insert({
    guest_id: guest.id,
    title,
    type,
    description,
    when_date,
    image_url,
  })
  if (error) {
    // Best-effort orphan cleanup if a presigned upload landed but the DB
    // insert failed — avoids leaving bytes in R2 with no DB row.
    if (image_url) await deleteStorageObjectByUrl(image_url)
    throw new Error('Failed to create memory')
  }

  revalidatePath(`/${guest.id}/minder`)
}

export async function updateMemory(id: string, formData: FormData): Promise<void> {
  const guest = await assertNotScreen()

  // Verify ownership + get existing image_url
  const { data: existing, error: fetchError } = await supabaseServer
    .from('memories')
    .select('id, guest_id, image_url')
    .eq('id', id)
    .eq('guest_id', guest.id)
    .maybeSingle()
  if (fetchError) throw new Error('Failed to load memory')
  if (!existing) throw new Error('Memory not found')

  const existingImageUrl = (existing as { image_url: string | null }).image_url

  const title = str(formData.get('title'))
  if (!title) throw new Error('Titel er påkrævet')
  const type = parseType(formData.get('type'))
  const description = str(formData.get('description')) || null
  const when_date = str(formData.get('when_date')) || null

  const removeImage = formData.get('removeImage') === 'true'
  // New image URL (if any) was uploaded via presign before submitting.
  const newImageUrl = str(formData.get('image_url')) || null
  if (newImageUrl) assertOwnedR2ImageUrl(newImageUrl)

  let nextImageUrl: string | null = existingImageUrl
  let urlToDelete: string | null = null

  if (newImageUrl) {
    nextImageUrl = newImageUrl
    if (existingImageUrl) urlToDelete = existingImageUrl
  } else if (removeImage && existingImageUrl) {
    nextImageUrl = null
    urlToDelete = existingImageUrl
  }

  const { error } = await supabaseServer
    .from('memories')
    .update({
      title,
      type,
      description,
      when_date,
      image_url: nextImageUrl,
    })
    .eq('id', id)
    .eq('guest_id', guest.id)
  if (error) {
    // If a fresh image was uploaded but the row update failed, the new
    // object is orphaned — best-effort delete it.
    if (newImageUrl) await deleteStorageObjectByUrl(newImageUrl)
    throw new Error('Failed to update memory')
  }

  if (urlToDelete) await deleteStorageObjectByUrl(urlToDelete)

  revalidatePath(`/${guest.id}/minder`)
}

export async function deleteMyMemory(id: string): Promise<void> {
  const guest = await assertNotScreen()

  // Verify ownership + get image_url for cleanup
  const { data: memory, error: fetchError } = await supabaseServer
    .from('memories')
    .select('id, guest_id, image_url')
    .eq('id', id)
    .eq('guest_id', guest.id)
    .maybeSingle()
  if (fetchError) throw new Error('Failed to load memory')
  if (!memory) throw new Error('Memory not found')

  // Best-effort orphan cleanup for screen_state
  try {
    await supabaseServer
      .from('screen_state')
      .update({
        current_override: null,
        override_ref_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('current_override', 'memory')
      .eq('override_ref_id', id)
  } catch {
    // best-effort
  }

  const { error } = await supabaseServer
    .from('memories')
    .delete()
    .eq('id', id)
    .eq('guest_id', guest.id)
  if (error) throw new Error('Failed to delete memory')

  const imageUrl = (memory as { image_url: string | null }).image_url
  if (imageUrl) await deleteStorageObjectByUrl(imageUrl)

  revalidatePath(`/${guest.id}/minder`)
}
