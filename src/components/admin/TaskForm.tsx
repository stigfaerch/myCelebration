'use client'
import { useState, useTransition } from 'react'
import type { Task } from '@/lib/actions/tasks'
import { createTask, updateTask } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'

interface Props {
  task?: Task
  onSave: () => void
}

export function TaskForm({ task, onSave }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Convert timestamptz to datetime-local string for input
  function toDatetimeLocal(iso: string | null | undefined): string {
    if (!iso) return ''
    // Trim seconds+tz for datetime-local format: YYYY-MM-DDTHH:MM
    return iso.slice(0, 16)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = (fd.get('title') as string).trim()
    if (!title) return

    const formData = {
      title,
      description: (fd.get('description') as string).trim() || undefined,
      location: (fd.get('location') as string).trim() || undefined,
      due_time: (fd.get('due_time') as string) || undefined,
      max_persons: fd.get('max_persons') ? Number(fd.get('max_persons')) : null,
      contact_host: fd.get('contact_host') === 'on',
      is_easy: fd.get('is_easy') === 'on',
    }

    setError(null)
    startTransition(async () => {
      try {
        if (task) {
          await updateTask(task.id, formData)
        } else {
          await createTask(formData)
        }
        onSave()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">Titel *</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={task?.title ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">Beskrivelse</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={task?.description ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="text-sm font-medium">Sted</label>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={task?.location ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="due_time" className="text-sm font-medium">Tidspunkt</label>
        <input
          id="due_time"
          name="due_time"
          type="datetime-local"
          defaultValue={toDatetimeLocal(task?.due_time)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="max_persons" className="text-sm font-medium">Maks personer</label>
        <input
          id="max_persons"
          name="max_persons"
          type="number"
          min="1"
          defaultValue={task?.max_persons ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="contact_host"
          name="contact_host"
          type="checkbox"
          defaultChecked={task?.contact_host ?? false}
          className="h-4 w-4"
        />
        <label htmlFor="contact_host" className="text-sm font-medium">Kontakt værten</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_easy"
          name="is_easy"
          type="checkbox"
          defaultChecked={task?.is_easy ?? false}
          className="h-4 w-4"
        />
        <label htmlFor="is_easy" className="text-sm font-medium">Let opgave</label>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Gemmer...' : task ? 'Opdater' : 'Opret'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onSave}>
          Annuller
        </Button>
      </div>
    </form>
  )
}
