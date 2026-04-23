'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cancelSwapRequest } from '@/lib/actions/guest/tasks'
import type {
  MyAssignment,
  MySwapRequest,
  SwappableTask,
} from '@/lib/actions/guest/tasks'
import { SwapRequestForm } from './SwapRequestForm'

interface Props {
  assignments: MyAssignment[]
  swapRequests: MySwapRequest[]
  swappableTasks: SwappableTask[]
  uuid: string
}

const DESC_TRUNCATE = 100

function formatDueTime(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('da-DK')
}

export function TaskList({ assignments, swapRequests, swappableTasks }: Props) {
  const router = useRouter()
  const [openSwapForm, setOpenSwapForm] = React.useState<string | null>(null)
  const [expandedDesc, setExpandedDesc] = React.useState<Set<string>>(new Set())
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  // Build lookups
  const swapByAssignment = React.useMemo(() => {
    const map = new Map<string, MySwapRequest>()
    for (const req of swapRequests) {
      if (req.status === 'pending') {
        // Prefer the latest pending request per assignment
        map.set(req.requester_assignment_id, req)
      }
    }
    return map
  }, [swapRequests])

  const taskById = React.useMemo(() => {
    const map = new Map<string, SwappableTask>()
    for (const t of swappableTasks) map.set(t.id, t)
    return map
  }, [swappableTasks])

  function toggleDesc(id: string) {
    setExpandedDesc((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCancel(swapId: string) {
    if (!window.confirm('Annullér denne bytte-forespørgsel?')) return
    setError(null)
    startTransition(async () => {
      try {
        await cancelSwapRequest(swapId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunne ikke annullere')
      }
    })
  }

  if (assignments.length === 0) {
    return <p className="text-sm text-muted-foreground">Du har ingen opgaver.</p>
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="space-y-3">
        {assignments.map((assignment) => {
          const task = assignment.tasks
          if (!task) return null

          const due = formatDueTime(task.due_time)
          const pendingSwap = swapByAssignment.get(assignment.id)
          const isFormOpen = openSwapForm === assignment.id
          const descExpanded = expandedDesc.has(assignment.id)
          const description = task.description ?? ''
          const needsTruncate = description.length > DESC_TRUNCATE
          const shownDesc =
            needsTruncate && !descExpanded
              ? description.slice(0, DESC_TRUNCATE) + '…'
              : description

          const desiredNames = pendingSwap
            ? pendingSwap.desired_task_ids
                .map((id) => taskById.get(id)?.title ?? null)
                .filter((v): v is string => Boolean(v))
            : []

          return (
            <li key={assignment.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{task.title}</h3>
                {assignment.is_owner ? (
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                    Oprindelig
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                    Byttet til
                  </span>
                )}
              </div>

              {task.location && (
                <p className="text-sm text-muted-foreground">{task.location}</p>
              )}
              {due && <p className="text-sm text-muted-foreground">{due}</p>}

              {description && (
                <div className="text-sm">
                  <p className="whitespace-pre-line break-words">{shownDesc}</p>
                  {needsTruncate && (
                    <button
                      type="button"
                      onClick={() => toggleDesc(assignment.id)}
                      className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 mt-1"
                    >
                      {descExpanded ? (
                        <>
                          <ChevronUp className="size-3" /> Vis mindre
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3" /> Vis mere
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {task.contact_host ? (
                <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <span>Kontakt værten for denne opgave.</span>
                </p>
              ) : pendingSwap ? (
                <div className="space-y-2 rounded-md bg-muted/50 p-2">
                  <p className="text-sm font-medium">Bytte-forespørgsel afsendt</p>
                  {desiredNames.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Ønskede opgaver: {desiredNames.join(', ')}
                    </p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancel(pendingSwap.id)}
                    disabled={isPending}
                  >
                    Annullér
                  </Button>
                </div>
              ) : isFormOpen ? (
                <SwapRequestForm
                  assignmentId={assignment.id}
                  swappableTasks={swappableTasks}
                  onSuccess={() => setOpenSwapForm(null)}
                  onCancel={() => setOpenSwapForm(null)}
                />
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setError(null)
                    setOpenSwapForm(assignment.id)
                  }}
                  disabled={isPending}
                >
                  Foreslå bytte
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
