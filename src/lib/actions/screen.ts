'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import type { ScreenTransition } from '@/lib/actions/screenAssignments'

export type ScreenOverrideType = 'page' | 'photo' | 'memory' | 'gallery' | 'program'

export interface ScreenGuest {
  id: string
  name: string
  is_primary_screen: boolean
  screen_cycle_seconds: number
  screen_transition: ScreenTransition
}

export async function getScreenGuests(): Promise<ScreenGuest[]> {
  const { data, error } = await supabaseServer
    .from('guests')
    .select('id, name, is_primary_screen, screen_cycle_seconds, screen_transition')
    .eq('type', 'screen')
    .order('name')
  if (error) throw new Error('Failed to load screen guests')

  type Row = {
    id: string
    name: string
    is_primary_screen: boolean
    screen_cycle_seconds: number | null
    screen_transition: string | null
  }

  return ((data ?? []) as Row[]).map((row) => {
    const rawTransition = row.screen_transition ?? 'fade'
    const transition: ScreenTransition =
      rawTransition === 'slide' || rawTransition === 'none' ? rawTransition : 'fade'
    return {
      id: row.id,
      name: row.name,
      is_primary_screen: row.is_primary_screen,
      screen_cycle_seconds: row.screen_cycle_seconds ?? 8,
      screen_transition: transition,
    }
  })
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

export async function clearScreenOverridesFor(
  overrideType: 'page' | 'photo' | 'memory',
  refId: string
): Promise<void> {
  await assertAdmin()
  const { error } = await supabaseServer
    .from('screen_state')
    .update({
      current_override: null,
      override_ref_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('current_override', overrideType)
    .eq('override_ref_id', refId)
  if (error) throw new Error('Failed to clear orphan screen overrides')
}

/**
 * Returns one entry per screen guest whose `current_override` is currently
 * `'photo'` or `'memory'`. Used by PhotoManager / MemoryManager to render the
 * "Tilbage til skærm-rotation" banner when a single-item override is masking
 * the screen's normal page-cycle rotation.
 *
 * Read-only; no admin gate required because the calling pages are themselves
 * admin-gated and we only return public-shape rows (screen guest id, name,
 * override kind). No `override_ref_id` is returned.
 */
export async function getActiveSingleOverrides(): Promise<
  Array<{ screenId: string; screenName: string; kind: 'photo' | 'memory' }>
> {
  const { data, error } = await supabaseServer
    .from('screen_state')
    .select('guest_id, current_override, guests!inner(id, name, type)')
    .in('current_override', ['photo', 'memory'])

  if (error) throw new Error('Failed to load active screen overrides')

  // PostgREST embeds may surface as either a single object or an array
  // depending on the relation cardinality inferred from the FK. Normalise
  // both shapes here and pick the first row defensively.
  type EmbeddedGuest = { id: string; name: string; type: string }
  type Row = {
    guest_id: string
    current_override: 'photo' | 'memory'
    guests: EmbeddedGuest | EmbeddedGuest[] | null
  }

  return ((data ?? []) as unknown as Row[])
    .map((row) => {
      const guest = Array.isArray(row.guests) ? row.guests[0] ?? null : row.guests
      return { row, guest }
    })
    .filter(({ guest }) => guest?.type === 'screen')
    .map(({ row, guest }) => ({
      screenId: row.guest_id,
      screenName: guest?.name ?? 'Skærm',
      kind: row.current_override,
    }))
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
