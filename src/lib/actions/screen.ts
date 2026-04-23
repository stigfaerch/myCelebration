'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'

export type ScreenOverrideType = 'page' | 'photo' | 'memory' | 'gallery' | 'program'

export interface ScreenGuest {
  id: string
  name: string
  is_primary_screen: boolean
}

export async function getScreenGuests(): Promise<ScreenGuest[]> {
  const { data, error } = await supabaseServer
    .from('guests')
    .select('id, name, is_primary_screen')
    .eq('type', 'screen')
    .order('name')
  if (error) throw new Error('Failed to load screen guests')
  return (data ?? []) as ScreenGuest[]
}

export async function showOnPrimaryScreen(
  overrideType: ScreenOverrideType,
  refId: string
): Promise<void> {
  await assertAdmin()

  const { data: primary, error: primaryError } = await supabaseServer
    .from('guests')
    .select('id')
    .eq('type', 'screen')
    .eq('is_primary_screen', true)
    .maybeSingle()

  if (primaryError) throw new Error('Failed to resolve primary screen')
  if (!primary) throw new Error('No primary screen configured')

  const { error } = await supabaseServer
    .from('screen_state')
    .upsert(
      {
        guest_id: primary.id,
        current_override: overrideType,
        override_ref_id: refId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'guest_id' }
    )
  if (error) throw new Error('Failed to set screen override')

  revalidatePath('/admin/sider')
  revalidatePath('/admin/billeder')
  revalidatePath('/admin/minder')
  revalidatePath('/admin/galleri')
}

export async function setScreenOverride(
  screenGuestId: string,
  overrideType: ScreenOverrideType,
  refId: string
): Promise<void> {
  await assertAdmin()

  const { error } = await supabaseServer
    .from('screen_state')
    .upsert(
      {
        guest_id: screenGuestId,
        current_override: overrideType,
        override_ref_id: refId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'guest_id' }
    )
  if (error) throw new Error('Failed to set screen override')

  revalidatePath('/admin/sider')
  revalidatePath('/admin/billeder')
  revalidatePath('/admin/minder')
  revalidatePath('/admin/galleri')
}

export async function clearScreenOverride(screenGuestId: string): Promise<void> {
  await assertAdmin()

  const { error } = await supabaseServer
    .from('screen_state')
    .update({
      current_override: null,
      override_ref_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('guest_id', screenGuestId)
  if (error) throw new Error('Failed to clear screen override')

  revalidatePath('/admin/sider')
  revalidatePath('/admin/billeder')
  revalidatePath('/admin/minder')
  revalidatePath('/admin/galleri')
}
