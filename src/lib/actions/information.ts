'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'

export async function getFestInfo() {
  const { data, error } = await supabaseServer
    .from('fest_info')
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
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
