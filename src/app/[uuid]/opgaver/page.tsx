import {
  getMyAssignments,
  getMySwapRequests,
  getSwappableTasks,
} from '@/lib/actions/guest/tasks'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { TaskList } from '@/components/guest/TaskList'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function OpgaverPage({ params }: Props) {
  const { uuid } = await params
  const guest = await resolveGuest()

  // Screen-type guests should not see this page
  if (guest.type === 'screen') {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Ikke tilgængelig for skærme.</p>
      </div>
    )
  }

  const [assignments, swapRequests, swappable] = await Promise.all([
    getMyAssignments(),
    getMySwapRequests(),
    getSwappableTasks(),
  ])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Mine opgaver</h1>
      <TaskList
        assignments={assignments}
        swapRequests={swapRequests}
        swappableTasks={swappable}
        uuid={uuid}
      />
    </div>
  )
}
