'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'

export type GuestType = 'main_person' | 'family' | 'friend' | 'screen'
export type TaskParticipation = 'none' | 'easy' | 'all'

export interface Guest {
  id: string
  name: string
  type: GuestType
  default_page: string | null
  is_primary_screen: boolean
  relation: string | null
  age: number | null
  gender: string | null
  email: string | null
  phone: string | null
  invitation_accepted: boolean
  invitation_accepted_by: 'guest' | 'admin' | null
  task_participation: TaskParticipation
  created_at: string
}

export async function getGuests(): Promise<Guest[]> {
  const { data, error } = await supabaseServer
    .from('guests')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data as Guest[]
}

export async function getGuest(id: string): Promise<Guest> {
  const { data, error } = await supabaseServer
    .from('guests')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as Guest
}

export async function createGuestAction(formData: FormData) {
  const type = formData.get('type') as GuestType
  const payload = {
    name: formData.get('name') as string,
    type,
    relation: (formData.get('relation') as string) || null,
    age: formData.get('age') ? Number(formData.get('age')) : null,
    gender: (formData.get('gender') as string) || null,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    task_participation: (formData.get('task_participation') as TaskParticipation) || 'none',
    default_page: type === 'screen' ? ((formData.get('default_page') as string) || null) : null,
    is_primary_screen: type === 'screen' ? formData.get('is_primary_screen') === 'on' : false,
  }
  const { error } = await supabaseServer.from('guests').insert(payload)
  if (error) throw new Error(error.message)
  redirect('/admin/deltagere')
}

export async function updateGuestAction(id: string, formData: FormData) {
  const type = formData.get('type') as GuestType
  const payload = {
    name: formData.get('name') as string,
    type,
    relation: (formData.get('relation') as string) || null,
    age: formData.get('age') ? Number(formData.get('age')) : null,
    gender: (formData.get('gender') as string) || null,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    task_participation: (formData.get('task_participation') as TaskParticipation) || 'none',
    default_page: type === 'screen' ? ((formData.get('default_page') as string) || null) : null,
    is_primary_screen: type === 'screen' ? formData.get('is_primary_screen') === 'on' : false,
  }
  const { error } = await supabaseServer.from('guests').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/admin/deltagere')
}

export async function deleteGuestAction(id: string) {
  const { error } = await supabaseServer.from('guests').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/deltagere')
}

export async function acceptInvitationAction(id: string) {
  const { error } = await supabaseServer
    .from('guests')
    .update({ invitation_accepted: true, invitation_accepted_by: 'admin' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/deltagere')
}

export async function getSmsTemplate(): Promise<string> {
  const { data } = await supabaseServer.from('app_settings').select('sms_template').single()
  return data?.sms_template ?? 'Hej {navn}! Her er dit link til konfirmationsfesten: {url}'
}

export function getGuestUrl(uuid: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base}/${uuid}`
}
