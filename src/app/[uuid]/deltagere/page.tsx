import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { GuestList } from '@/components/guest/GuestList'

export default async function DeltagerePage() {
  await resolveGuest()
  const { data, error } = await supabaseServer
    .from('guests')
    .select('id, name, type, relation')
    .neq('type', 'screen')
    .order('name')

  if (error) {
    return (
      <p className="p-4 text-sm text-destructive">
        Kunne ikke indlæse deltagere.
      </p>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Deltagere</h1>
      <GuestList guests={data ?? []} />
    </div>
  )
}
