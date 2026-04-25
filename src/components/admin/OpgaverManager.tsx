'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import type { Task } from '@/lib/actions/tasks'
import { deleteTask } from '@/lib/actions/tasks'
import { TaskForm } from '@/components/admin/TaskForm'
import { TaskAssignmentManager } from '@/components/admin/TaskAssignmentManager'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from 'lucide-react'

type Assignment = {
  id: string
  guest_id: string
  is_owner: boolean
  guests: { id: string; name: string; type: string } | null
}

type TaskWithAssignments = Task & {
  task_assignments: Assignment[]
}

type GuestForAssignment = {
  id: string
  name: string
  type: string
  task_participation: 'none' | 'easy' | 'all'
}

interface Props {
  tasks: TaskWithAssignments[]
  guests: GuestForAssignment[]
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('da-DK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function TaskRow({
  task,
  allGuests,
  allTasks,
  defaultExpanded = false,
}: {
  task: TaskWithAssignments
  allGuests: GuestForAssignment[]
  allTasks: Array<{ id: string; title: string; is_easy: boolean }>
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete() {
    if (!confirm(`Slet opgaven "${task.title}"? Dette kan ikke fortrydes.`)) return
    setDeleteError(null)
    startTransition(async () => {
      try {
        await deleteTask(task.id)
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  if (editing) {
    return (
      <li className="rounded-md border p-4">
        <TaskForm task={task} onSave={() => setEditing(false)} />
        <div className="mt-4 border-t pt-4">
          <h4 className="mb-2 text-sm font-medium">Deltagere</h4>
          <TaskAssignmentManager
            taskId={task.id}
            assignments={task.task_assignments}
            allGuests={allGuests}
            allTasks={allTasks}
            contactHost={task.contact_host}
            isEasy={task.is_easy}
          />
        </div>
      </li>
    )
  }

  const assignedGuests = task.task_assignments
    .map((a) => a.guests)
    .filter((g): g is { id: string; name: string; type: string } => g !== null)

  return (
    <li className="rounded-md border">
      <div className="flex items-start justify-between p-3">
        <button
          type="button"
          className="flex flex-1 flex-col gap-1.5 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex flex-wrap items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium">{task.title}</span>
            {task.location && (
              <span className="text-xs text-muted-foreground">{task.location}</span>
            )}
            {task.due_time && (
              <span className="text-xs text-muted-foreground">{formatDateTime(task.due_time)}</span>
            )}
            {task.max_persons != null && (
              <span className="text-xs text-muted-foreground">Maks {task.max_persons}</span>
            )}
            {task.contact_host && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                Kontaktværten
              </span>
            )}
            {task.is_easy && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Let
              </span>
            )}
          </div>
          {assignedGuests.length > 0 ? (
            <div className="flex flex-wrap gap-1 pl-6">
              {assignedGuests.map((guest) => (
                <span
                  key={guest.id}
                  className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {guest.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="pl-6 text-xs italic text-muted-foreground">
              Ingen deltagere
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            aria-label={`Rediger ${task.title}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleDelete}
            aria-label={`Slet ${task.title}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {deleteError && (
        <p className="px-3 pb-2 text-xs text-destructive">{deleteError}</p>
      )}

      {expanded && (
        <div className="border-t px-3 pb-3 pt-2">
          {task.description && (
            <p className="mb-3 text-sm text-muted-foreground">{task.description}</p>
          )}
          <h4 className="mb-2 text-sm font-medium">Deltagere</h4>
          <TaskAssignmentManager
            taskId={task.id}
            assignments={task.task_assignments}
            allGuests={allGuests}
            allTasks={allTasks}
            contactHost={task.contact_host}
            isEasy={task.is_easy}
          />
        </div>
      )}
    </li>
  )
}

export function OpgaverManager({ tasks, guests }: Props) {
  const [creating, setCreating] = useState(false)

  const allTasksSimple = tasks.map((t) => ({ id: t.id, title: t.title, is_easy: t.is_easy }))

  // Auto-expand newly created tasks. Track the highest `created_at` we've
  // already seen across renders; on the next render any task with a strictly
  // greater `created_at` is treated as newly created and rendered expanded.
  // On first mount we record the current max but auto-expand nothing — we
  // don't want every existing task to spring open when the page loads.
  const previousMaxCreatedAtRef = useRef<string | null>(null)
  const hasMountedRef = useRef(false)

  const currentMaxCreatedAt = tasks.reduce<string | null>(
    (max, t) => (max === null || t.created_at > max ? t.created_at : max),
    null,
  )

  let autoExpandId: string | null = null
  if (hasMountedRef.current && previousMaxCreatedAtRef.current !== null) {
    const previousMax = previousMaxCreatedAtRef.current
    const newest = tasks
      .filter((t) => t.created_at > previousMax)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
    if (newest) autoExpandId = newest.id
  }

  useEffect(() => {
    hasMountedRef.current = true
    previousMaxCreatedAtRef.current = currentMaxCreatedAt
  }, [currentMaxCreatedAt])

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen opgaver endnu.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              allGuests={guests}
              allTasks={allTasksSimple}
              defaultExpanded={task.id === autoExpandId}
            />
          ))}
        </ul>
      )}

      {creating ? (
        <div className="rounded-md border p-4">
          <h3 className="mb-3 text-sm font-medium">Ny opgave</h3>
          <TaskForm onSave={() => setCreating(false)} />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCreating(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Ny opgave
        </Button>
      )}
    </div>
  )
}
