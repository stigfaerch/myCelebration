import { getTasks } from '@/lib/actions/tasks'
import { getGuests } from '@/lib/actions/guests'
import { OpgaverManager } from '@/components/admin/OpgaverManager'

export default async function OpgaverPage() {
  const [tasks, guests] = await Promise.all([getTasks(), getGuests()])
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Opgaver</h1>
      <OpgaverManager tasks={tasks ?? []} guests={guests} />
    </div>
  )
}
