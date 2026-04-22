'use client'
import { useState, useTransition } from 'react'
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

interface Props {
  tasks: TaskWithAssignments[]
  guests: Array<{ id: string; name: string; type: string }>
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
}: {
  task: TaskWithAssignments
  allGuests: Array<{ id: string; name: string; type: string }>
  allTasks: Array<{ id: string; title: string }>
}) {
  const [expanded, setExpanded] = useState(false)
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
      </li>
    )
  }

  return (
    <li className="rounded-md border">
      <div className="flex items-center justify-between p-3">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
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
        </button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleDelete}
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
          />
        </div>
      )}
    </li>
  )
}

export function OpgaverManager({ tasks, guests }: Props) {
  const [creating, setCreating] = useState(false)

  const allTasksSimple = tasks.map((t) => ({ id: t.id, title: t.title }))

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
