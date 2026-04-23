'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest, assertNotScreen } from '@/lib/auth/resolveGuest'
import { uploadImage, deleteStorageObjectByUrl } from '@/lib/storage/upload'

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
