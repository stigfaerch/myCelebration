import {
  getMyAssignments,
  getMySwapRequests,
  getSwappableTasks,
  getIncomingSwapRequests,
} from '@/lib/actions/guest/tasks'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { TaskList } from '@/components/guest/TaskList'
import { IncomingSwapList } from '@/components/guest/IncomingSwapList'

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

  const [assignments, swapRequests, swappable, incoming] = await Promise.all([
    getMyAssignments(),
    getMySwapRequests(),
    getSwappableTasks(),
    getIncomingSwapRequests(),
  ])

  // task_id → task title lookup for the incoming list (server-resolved,
  // read client-side so we don't re-query).
  const taskTitleMap: Record<string, string> = {}
  for (const a of assignments) {
    if (a.tasks) taskTitleMap[a.tasks.id] = a.tasks.title
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Mine opgaver</h1>
      <IncomingSwapList initialIncoming={incoming} taskTitleMap={taskTitleMap} />
      <TaskList
        assignments={assignments}
        swapRequests={swapRequests}
        swappableTasks={swappable}
        uuid={uuid}
      />
    </div>
  )
}
