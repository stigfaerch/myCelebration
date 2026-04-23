'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createSwapRequest } from '@/lib/actions/guest/tasks'
import type { SwappableTask } from '@/lib/actions/guest/tasks'

interface Props {
  assignmentId: string
  swappableTasks: SwappableTask[]
  onSuccess: () => void
  onCancel: () => void
}

function formatDueTime(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('da-DK')
}

export function SwapRequestForm({ assignmentId, swappableTasks, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function toggle(taskId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ids = Array.from(selected)
    if (ids.length === 0) {
      setError('Vælg mindst én opgave')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await createSwapRequest(assignmentId, ids)
        onSuccess()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunne ikke sende bytte-forespørgsel')
      }
    })
  }

  if (swappableTasks.length === 0) {
    return (
      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-sm text-muted-foreground">
          Der er ingen opgaver at bytte med lige nu.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Luk
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-3 space-y-3">
      <p className="text-sm font-medium">Vælg en eller flere opgaver, du gerne vil bytte til:</p>

      <ul className="space-y-1">
        {swappableTasks.map((task) => {
          const due = formatDueTime(task.due_time)
          const checked = selected.has(task.id)
          return (
            <li key={task.id}>
              <Label className="items-start gap-2 font-normal">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(task.id)}
                  disabled={isPending}
                  className="mt-0.5 size-4 rounded border-input"
                />
                <span className="min-w-0">
                  <span className="font-medium">{task.title}</span>
                  {task.location && (
                    <span className="text-muted-foreground"> — {task.location}</span>
                  )}
                  {due && <span className="block text-xs text-muted-foreground">{due}</span>}
                </span>
              </Label>
            </li>
          )
        })}
      </ul>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Sender…' : 'Send forespørgsel'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Annullér
        </Button>
      </div>
    </form>
  )
}
