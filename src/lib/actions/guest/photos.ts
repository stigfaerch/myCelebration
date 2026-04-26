'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest, assertNotScreen } from '@/lib/auth/resolveGuest'
import { uploadImage, deleteStorageObjectByUrl } from '@/lib/storage/upload'
import { r2PublicUrl } from '@/lib/storage/r2'

export interface Photo {
  id: string
  guest_id: string
  storage_url: string
  taken_at: string
  is_active: boolean
  created_at: string
}

export async function getMyPhotos(): Promise<Photo[]> {
  const guest = await resolveGuest()
  const { data, error } = await supabaseServer
    .from('photos')
    .select('*')
    .eq('guest_id', guest.id)
    .order('taken_at', { ascending: false })
  if (error) throw new Error('Failed to load photos')
  return (data ?? []) as Photo[]
}

export async function createPhotoFromFile(formData: FormData): Promise<void> {
  const guest = await assertNotScreen()
  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Intet billede modtaget')

  const { storage_url } = await uploadImage(file, { prefix: 'photo' })

  const { error } = await supabaseServer.from('photos').insert({
    guest_id: guest.id,
    storage_url,
    taken_at: new Date().toISOString(),
    is_active: true,
  })
  if (error) throw new Error('Failed to save photo')

  revalidatePath(`/${guest.id}/billeder`)
}

/**
 * Confirms a presigned-URL upload that has already landed in R2 by inserting
 * the corresponding `photos` row. Called by the camera client after the
 * direct browser→R2 PUT succeeds.
 *
 * The `publicUrl` passed in is validated to belong to our R2 bucket under
 * the `images/` prefix — we do NOT trust an arbitrary URL from the client,
 * since that would let a malicious caller insert DB rows pointing at any URL.
 *
 * On DB-insert failure, we best-effort delete the R2 object to avoid orphans.
 */
export async function confirmPhotoUpload(args: {
  publicUrl: string
}): Promise<void> {
  const guest = await assertNotScreen()
  const { publicUrl } = args

  // Validate publicUrl is one we issued: must start with the configured R2
  // public base + `/images/` prefix.
  const expectedPrefix = `${r2PublicUrl('images', '')}`
  if (!publicUrl.startsWith(expectedPrefix)) {
    throw new Error('Ugyldig upload-URL')
  }

  const { error } = await supabaseServer.from('photos').insert({
    guest_id: guest.id,
    storage_url: publicUrl,
    taken_at: new Date().toISOString(),
    is_active: true,
  })
  if (error) {
    // Best-effort orphan cleanup so we don't leave bytes in R2 with no DB row.
    await deleteStorageObjectByUrl(publicUrl)
    throw new Error('Failed to save photo')
  }

  revalidatePath(`/${guest.id}/billeder`)
}

export async function deleteMyPhoto(id: string): Promise<void> {
  const guest = await assertNotScreen()

  // Verify ownership + get storage_url for cleanup
  const { data: photo, error: fetchError } = await supabaseServer
    .from('photos')
    .select('id, guest_id, storage_url')
    .eq('id', id)
    .eq('guest_id', guest.id)
    .maybeSingle()
  if (fetchError) throw new Error('Failed to load photo')
  if (!photo) throw new Error('Photo not found')

  // Best-effort orphan cleanup for screen_state (inline — cannot call admin-guarded clearScreenOverridesFor)
  try {
    await supabaseServer
      .from('screen_state')
      .update({
        current_override: null,
        override_ref_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('current_override', 'photo')
      .eq('override_ref_id', id)
  } catch {
    // best-effort
  }

  const { error } = await supabaseServer
    .from('photos')
    .delete()
    .eq('id', id)
    .eq('guest_id', guest.id)
  if (error) throw new Error('Failed to delete photo')

  const storageUrl = (photo as { storage_url: string }).storage_url
  await deleteStorageObjectByUrl(storageUrl)

  revalidatePath(`/${guest.id}/billeder`)
}
