'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { putR2Object } from '@/lib/storage/r2'

export interface FestInfo {
  id: string
  description: Record<string, unknown> | null
  invitation_url: string | null
  forsidebillede_photo_id: string | null
  created_at: string
  forsidebillede: { id: string; storage_url: string } | null
}

export async function getFestInfo(): Promise<FestInfo | null> {
  const { data, error } = await supabaseServer
    .from('fest_info')
    .select('*, forsidebillede:photos!fest_info_forsidebillede_photo_id_fkey(id, storage_url)')
    .single()
  if (error) throw new Error(error.message)
  // PostgREST may return the embed as an array depending on FK cardinality;
  // normalize to a single object or null so callers don't need to branch.
  const row = data as (Record<string, unknown> & { forsidebillede?: unknown }) | null
  if (!row) return null
  const raw = row.forsidebillede
  let forsidebillede: { id: string; storage_url: string } | null = null
  if (Array.isArray(raw)) {
    forsidebillede = (raw[0] as { id: string; storage_url: string } | undefined) ?? null
  } else if (raw && typeof raw === 'object') {
    forsidebillede = raw as { id: string; storage_url: string }
  }
  return {
    id: row.id as string,
    description: (row.description as Record<string, unknown> | null) ?? null,
    invitation_url: (row.invitation_url as string | null) ?? null,
    forsidebillede_photo_id: (row.forsidebillede_photo_id as string | null) ?? null,
    created_at: row.created_at as string,
    forsidebillede,
  }
}

export async function setForsidebilledePhotoId(photoId: string | null): Promise<void> {
  await assertAdmin()

  if (photoId !== null) {
    // Validate that the photo exists. The FK constraint would also catch this,
    // but checking up front lets us return a clean Danish error to the admin
    // rather than leaking a Postgres error string.
    const { data: photo, error: photoError } = await supabaseServer
      .from('photos')
      .select('id')
      .eq('id', photoId)
      .maybeSingle()
    if (photoError) throw new Error(photoError.message)
    if (!photo) throw new Error('Billedet findes ikke')
  }

  const { data: existing } = await supabaseServer.from('fest_info').select('id').single()
  if (!existing) throw new Error('fest_info not found')

  const { error } = await supabaseServer
    .from('fest_info')
    .update({ forsidebillede_photo_id: photoId })
    .eq('id', existing.id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/information')
  // Guest forsides at /{uuid} read getFestInfo — invalidate the dynamic
  // segment's layout so all guest pages refetch on next request.
  revalidatePath('/[uuid]', 'layout')
}

export async function updateFestDescription(description: Record<string, unknown>) {
  const { data: existing } = await supabaseServer.from('fest_info').select('id').single()
  if (!existing) throw new Error('fest_info not found')
  const { error } = await supabaseServer
    .from('fest_info')
    .update({ description })
    .eq('id', existing.id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/information')
}

export async function updateInvitationUrl(url: string) {
  const { data: existing } = await supabaseServer.from('fest_info').select('id').single()
  if (!existing) throw new Error('fest_info not found')
  const { error } = await supabaseServer
    .from('fest_info')
    .update({ invitation_url: url })
    .eq('id', existing.id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/information')
}

export async function getEvents() {
  const { data, error } = await supabaseServer
    .from('events')
    .select(`*, event_locations(*)`)
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('sort_order')
  if (error) throw new Error(error.message)
  return data
}

export async function createEvent(formData: {
  name: string
  description?: string
  start_time?: string
  address?: string
  google_maps_embed?: string
  map_image_url?: string
  map_image_description?: string
}) {
  const { error } = await supabaseServer.from('events').insert(formData)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/information')
}

export async function updateEvent(id: string, formData: {
  name: string
  description?: string
  start_time?: string
  address?: string
  google_maps_embed?: string
  map_image_url?: string
  map_image_description?: string
}) {
  const { error } = await supabaseServer.from('events').update(formData).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/information')
}

export async function deleteEvent(id: string) {
  const { error } = await supabaseServer.from('events').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/information')
}

export async function createEventLocation(eventId: string, formData: { title: string; description?: string }) {
  const { error } = await supabaseServer
    .from('event_locations')
    .insert({ ...formData, event_id: eventId })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/information')
}

export async function deleteEventLocation(id: string) {
  const { error } = await supabaseServer.from('event_locations').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/information')
}

// --- Admin uploads (R2) -----------------------------------------------------
//
// Admin uploads bypass the strict magic-byte verification used for guest-uploaded
// photos in `lib/storage/upload.ts`. We trust the admin and derive extension/
// content-type from the file metadata.

const INVITATION_ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
])
const INVITATION_ALLOWED_EXTS = new Set(['pdf', 'png', 'jpg', 'jpeg'])

const MAP_ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
])
const MAP_ALLOWED_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp'])

const MAX_ADMIN_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB — invitations may be larger PDFs

function extractExt(file: File): string {
  // Prefer file.name suffix; fall back to MIME mapping.
  const dot = file.name.lastIndexOf('.')
  if (dot >= 0 && dot < file.name.length - 1) {
    return file.name.slice(dot + 1).toLowerCase()
  }
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }
  return mimeToExt[file.type] ?? 'bin'
}

export async function uploadInvitation(formData: FormData): Promise<string> {
  await assertAdmin()

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Ingen fil modtaget')
  if (file.size === 0) throw new Error('Tom fil')
  if (file.size > MAX_ADMIN_UPLOAD_BYTES) throw new Error('Filen er for stor (maks 25 MB)')

  const ext = extractExt(file)
  const typeOk = INVITATION_ALLOWED_TYPES.has(file.type)
  const extOk = INVITATION_ALLOWED_EXTS.has(ext)
  if (!typeOk && !extOk) throw new Error('Filtype ikke understøttet (PDF, PNG, JPG)')

  const id = `${crypto.randomUUID()}.${ext === 'jpeg' ? 'jpg' : ext}`
  const body = Buffer.from(await file.arrayBuffer())
  const contentType = file.type || 'application/octet-stream'

  const publicUrl = await putR2Object({
    prefix: 'invitations',
    id,
    body,
    contentType,
  })

  // Persist the new URL atomically with the upload so the DB and bucket stay in sync.
  await updateInvitationUrl(publicUrl)

  return publicUrl
}

export async function uploadMapImage(formData: FormData): Promise<string> {
  await assertAdmin()

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Ingen fil modtaget')
  if (file.size === 0) throw new Error('Tom fil')
  if (file.size > MAX_ADMIN_UPLOAD_BYTES) throw new Error('Filen er for stor (maks 25 MB)')

  const ext = extractExt(file)
  const typeOk = MAP_ALLOWED_TYPES.has(file.type)
  const extOk = MAP_ALLOWED_EXTS.has(ext)
  if (!typeOk && !extOk) throw new Error('Filtype ikke understøttet (PNG, JPG, WebP)')

  const id = `${crypto.randomUUID()}.${ext === 'jpeg' ? 'jpg' : ext}`
  const body = Buffer.from(await file.arrayBuffer())
  const contentType = file.type || 'application/octet-stream'

  const publicUrl = await putR2Object({
    prefix: 'maps',
    id,
    body,
    contentType,
  })

  // Caller (EventForm) writes the URL into form state and submits via createEvent/updateEvent.
  return publicUrl
}
