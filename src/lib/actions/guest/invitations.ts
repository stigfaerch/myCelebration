'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest, assertNotScreen } from '@/lib/auth/resolveGuest'

export interface MyInvitation {
  /**
   * Whether this guest has accepted the invitation.
   * Sourced from `guests.invitation_accepted` (there is no separate `invitations` table).
   */
  accepted: boolean
  /**
   * Shared invitation file URL (from fest_info.invitation_url) — the same file
   * is served to all guests.
   */
  invitation_url: string | null
  accepted_by: 'guest' | 'admin' | null
}

export async function getMyInvitation(): Promise<MyInvitation | null> {
  const guest = await resolveGuest()

  const [guestResult, festResult] = await Promise.all([
    supabaseServer
      .from('guests')
      .select('invitation_accepted, invitation_accepted_by')
      .eq('id', guest.id)
      .maybeSingle(),
    supabaseServer.from('fest_info').select('invitation_url').maybeSingle(),
  ])

  if (guestResult.error) throw new Error('Failed to load invitation')
  if (!guestResult.data) return null

  const row = guestResult.data as {
    invitation_accepted: boolean | null
    invitation_accepted_by: 'guest' | 'admin' | null
  }
  const festRow = (festResult.data as { invitation_url: string | null } | null) ?? null

  return {
    accepted: row.invitation_accepted === true,
    accepted_by: row.invitation_accepted_by ?? null,
    invitation_url: festRow?.invitation_url ?? null,
  }
}

export async function acceptInvitation(): Promise<void> {
  const guest = await assertNotScreen()

  const { error } = await supabaseServer
    .from('guests')
    .update({ invitation_accepted: true, invitation_accepted_by: 'guest' })
    .eq('id', guest.id)
  if (error) throw new Error('Failed to accept invitation')

  revalidatePath('/' + guest.id)
}
