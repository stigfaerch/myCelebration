import { headers } from 'next/headers'

export type GuestType = 'person' | 'couple' | 'family' | 'screen'

export interface ResolvedGuest {
  id: string
  type: GuestType
}

export async function resolveGuest(): Promise<ResolvedGuest> {
  const h = await headers()
  const id = h.get('x-guest-id')
  const type = h.get('x-guest-type') as GuestType | null
  if (!id || !type) throw new Error('Unauthorized')
  return { id, type }
}

export async function assertGuest(guestId: string): Promise<ResolvedGuest> {
  const guest = await resolveGuest()
  if (guest.id !== guestId) throw new Error('Forbidden')
  return guest
}

export async function assertNotScreen(): Promise<ResolvedGuest> {
  const guest = await resolveGuest()
  if (guest.type === 'screen') throw new Error('Not available for screens')
  return guest
}
