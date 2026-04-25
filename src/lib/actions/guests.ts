'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'

export type GuestType = 'main_person' | 'family' | 'friend' | 'screen'
export type TaskParticipation = 'none' | 'easy' | 'all'
export type ScreenTransition = 'fade' | 'slide' | 'none'

export interface Guest {
  id: string
  name: string
  type: GuestType
  default_page: string | null
  is_primary_screen: boolean
  /** Per-screen cycle interval in seconds. Only meaningful when type='screen'. */
  screen_cycle_seconds: number
  /** Per-screen transition style. Only meaningful when type='screen'. */
  screen_transition: ScreenTransition
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

/**
 * Coerce form-data into validated cycle-settings values.
 * Returns null when fields are absent (non-screen guests). Throws on invalid input.
 */
function readCycleSettingsFromForm(formData: FormData): {
  screen_cycle_seconds: number
  screen_transition: ScreenTransition
} | null {
  const rawSeconds = formData.get('screen_cycle_seconds')
  const rawTransition = formData.get('screen_transition')
  if (rawSeconds === null && rawTransition === null) return null

  const seconds = Math.round(Number(rawSeconds ?? 8))
  if (!Number.isFinite(seconds) || seconds < 2 || seconds > 600) {
    throw new Error('screen_cycle_seconds skal være mellem 2 og 600')
  }
  const t = String(rawTransition ?? 'fade')
  if (t !== 'fade' && t !== 'slide' && t !== 'none') {
    throw new Error('screen_transition skal være fade, slide eller none')
  }
  return { screen_cycle_seconds: seconds, screen_transition: t }
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
  const cycle = type === 'screen' ? readCycleSettingsFromForm(formData) : null
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
    // Cycle settings are only persisted for screens; the guests-table defaults
    // (8 / 'fade') cover non-screen rows automatically.
    ...(cycle ?? {}),
  }
  const { error } = await supabaseServer.from('guests').insert(payload)
  if (error) throw new Error(error.message)
  redirect('/admin/deltagere')
}

export async function updateGuestAction(id: string, formData: FormData) {
  const type = formData.get('type') as GuestType
  const cycle = type === 'screen' ? readCycleSettingsFromForm(formData) : null
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
    ...(cycle ?? {}),
  }
  const { error } = await supabaseServer.from('guests').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  // Cycle-setting changes need to propagate to the live screen renderer over
  // realtime; bumping an assignment row triggers the broadcast (same trick
  // used by updateScreenCycleSettings). No-op when no assignments exist.
  if (type === 'screen' && cycle) {
    const { data: firstRow } = await supabaseServer
      .from('screen_page_assignments')
      .select('id')
      .eq('screen_guest_id', id)
      .order('sort_order')
      .limit(1)
      .maybeSingle()
    if (firstRow) {
      await supabaseServer
        .from('screen_page_assignments')
        .update({ created_at: new Date().toISOString() })
        .eq('id', (firstRow as { id: string }).id)
    }
  }
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

export async function getGuestAssignmentCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabaseServer
    .from('task_assignments')
    .select('guest_id')
  if (error) throw new Error('Failed to load assignment counts')
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as Array<{ guest_id: string }>) {
    counts[row.guest_id] = (counts[row.guest_id] ?? 0) + 1
  }
  return counts
}
