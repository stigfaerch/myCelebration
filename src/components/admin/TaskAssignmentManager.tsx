'use client'
import { useState, useTransition } from 'react'
import { assignGuestToTask, removeGuestFromTask, moveGuestToTask, toggleContactHost } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'

interface Assignment {
  id: string
  guest_id: string
  is_owner: boolean
  guests: { id: string; name: string; type: string } | null
}

interface Props {
  taskId: string
  assignments: Assignment[]
  allGuests: Array<{ id: string; name: string; type: string }>
  allTasks: Array<{ id: string; title: string }>
  contactHost: boolean
}

export function TaskAssignmentManager({ taskId, assignments, allGuests, allTasks, contactHost }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedGuestId, setSelectedGuestId] = useState<string>('')

  const assignedGuestIds = new Set(assignments.map((a) => a.guest_id))

  // Filter: no screen-type guests, no already-assigned guests
  const availableGuests = allGuests.filter(
    (g) => g.type !== 'screen' && !assignedGuestIds.has(g.id)
  )

  // Other tasks for "move to" dropdown
  const otherTasks = allTasks.filter((t) => t.id !== taskId)

  function handleAddGuest() {
    if (!selectedGuestId) return
    startTransition(async () => {
      try {
        await assignGuestToTask(taskId, selectedGuestId)
        setSelectedGuestId('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fejl ved tilføjelse')
      }
    })
  }

  function handleRemove(assignmentId: string) {
    startTransition(async () => {
      try {
        await removeGuestFromTask(assignmentId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fejl ved fjernelse')
      }
    })
  }

  function handleMove(assignmentId: string, newTaskId: string) {
    if (!newTaskId) return
    startTransition(async () => {
      try {
        await moveGuestToTask(assignmentId, newTaskId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fejl ved flytning')
      }
    })
  }

  function handleContactHostToggle(e: React.ChangeEvent<HTMLInputElement>) {
    startTransition(async () => {
      try {
        await toggleContactHost(taskId, e.target.checked)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fejl ved opdatering')
      }
    })
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Contact host toggle */}
      <div className="flex items-center gap-2">
        <input
          id={`contact-host-${taskId}`}
          type="checkbox"
          defaultChecked={contactHost}
          onChange={handleContactHostToggle}
          disabled={isPending}
          className="h-4 w-4"
        />
        <label htmlFor={`contact-host-${taskId}`} className="text-sm font-medium">
          Kontakt værten
        </label>
        {contactHost && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Bytte-flow blokeret
          </span>
        )}
      </div>

      {/* Assignments list */}
      {assignments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ingen deltagere tildelt.</p>
      ) : (
        <ul className="space-y-1">
          {assignments.map((assignment) => (
            <li key={assignment.id} className="flex flex-wrap items-center gap-2 rounded border px-2 py-1">
              <span className="text-sm flex-1">
                {assignment.guests?.name ?? 'Ukendt gæst'}
              </span>

              {/* Move to another task */}
              {otherTasks.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => handleMove(assignment.id, e.target.value)}
                  disabled={isPending}
                  className="rounded border border-input bg-background px-2 py-0.5 text-xs disabled:opacity-50"
                >
                  <option value="" disabled>Flyt til...</option>
                  {otherTasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(assignment.id)}
                disabled={isPending}
                aria-label={`Fjern ${assignment.guests?.name ?? 'gæst'}`}
                className="rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add guest */}
      {availableGuests.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedGuestId}
            onChange={(e) => setSelectedGuestId(e.target.value)}
            disabled={isPending}
            className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
          >
            <option value="">Tilføj deltager...</option>
            {availableGuests.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            onClick={handleAddGuest}
            disabled={isPending || !selectedGuestId}
          >
            Tilføj
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
