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
  allGuests: Array<{
    id: string
    name: string
    type: string
    task_participation: 'none' | 'easy' | 'all'
  }>
  allTasks: Array<{ id: string; title: string; is_easy: boolean }>
  contactHost: boolean
  isEasy: boolean
}

export function TaskAssignmentManager({ taskId, assignments, allGuests, allTasks, contactHost, isEasy }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedGuestId, setSelectedGuestId] = useState<string>('')
  const [localContactHost, setLocalContactHost] = useState(contactHost)
  const [moveResetKey, setMoveResetKey] = useState(0)

  const assignedGuestIds = new Set(assignments.map((a) => a.guest_id))

  // Filter eligible guests:
  //   - exclude screen-type guests
  //   - exclude already-assigned guests
  //   - exclude guests with task_participation = 'none'
  //   - exclude guests with task_participation = 'easy' unless this task is_easy
  const availableGuests = allGuests.filter((g) => {
    if (g.type === 'screen') return false
    if (assignedGuestIds.has(g.id)) return false
    if (g.task_participation === 'none') return false
    if (g.task_participation === 'easy' && !isEasy) return false
    return true
  })

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

    // Warn before moving an "easy-only" guest to a non-easy task.
    const assignment = assignments.find((a) => a.id === assignmentId)
    const guest = assignment ? allGuests.find((g) => g.id === assignment.guest_id) : null
    const target = allTasks.find((t) => t.id === newTaskId)
    if (guest && target && guest.task_participation === 'easy' && !target.is_easy) {
      const guestName = guest.name
      const targetTitle = target.title
      const ok = confirm(
        `${guestName} er kun markeret med "Lette opgaver". ${targetTitle} er ikke markeret som "Let opgave". Flyt alligevel?`,
      )
      if (!ok) {
        // Reset the dropdown back to its placeholder option.
        setMoveResetKey((k) => k + 1)
        return
      }
    }

    startTransition(async () => {
      try {
        await moveGuestToTask(assignmentId, newTaskId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fejl ved flytning')
      } finally {
        // Reset the dropdown back to its placeholder option after the move
        // completes (success or error) so the select doesn't stay stuck on
        // the chosen target.
        setMoveResetKey((k) => k + 1)
      }
    })
  }

  function handleContactHostToggle() {
    const newValue = !localContactHost
    setLocalContactHost(newValue)
    startTransition(async () => {
      try {
        await toggleContactHost(taskId, newValue)
      } catch (err) {
        setLocalContactHost(!newValue)
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
          checked={localContactHost}
          onChange={handleContactHostToggle}
          disabled={isPending}
          className="h-4 w-4"
        />
        <label htmlFor={`contact-host-${taskId}`} className="text-sm font-medium">
          Kontakt værten
        </label>
        {localContactHost && (
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
                  key={`move-${assignment.id}-${moveResetKey}`}
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
