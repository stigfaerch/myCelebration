import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import {
  getStaticItemVisibilityMap,
  isStaticItemVisibleNow,
} from '@/lib/actions/staticItemVisibility'
import { GuestList } from '@/components/guest/GuestList'

export default async function DeltagerePage() {
  await resolveGuest()
  const visibilityMap = await getStaticItemVisibilityMap()
  if (!(await isStaticItemVisibleNow('deltagere', visibilityMap))) notFound()

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
