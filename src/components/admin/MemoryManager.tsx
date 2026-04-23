'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  updateMemory,
  deleteMemory,
  type Memory,
  type MemoryType,
  type MemoryUpdateFormData,
} from '@/lib/actions/memories'
import { showOnPrimaryScreen } from '@/lib/actions/screen'

interface Props {
  initialMemories: Memory[]
}

const TYPE_LABELS: Record<MemoryType, string> = {
  funny: 'Sjov',
  solemn: 'Højtidelig',
  everyday: 'Hverdag',
  milestone: 'Milepæl',
}

const TYPE_COLORS: Record<MemoryType, string> = {
  funny: 'bg-yellow-100 text-yellow-700',
  solemn: 'bg-purple-100 text-purple-700',
  everyday: 'bg-blue-100 text-blue-700',
  milestone: 'bg-green-100 text-green-700',
}

function truncate(value: string | null, max: number): string {
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max).trimEnd()}…`
}

interface MemoryEditFormProps {
  memory: Memory
  onSave: () => void
  onCancel: () => void
}

function MemoryEditForm({ memory, onSave, onCancel }: MemoryEditFormProps) {
  const [title, setTitle] = useState(memory.title)
  const [description, setDescription] = useState(memory.description ?? '')
  const [whenDate, setWhenDate] = useState(memory.when_date ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Titel er påkrævet')
      return
    }

    const formData: MemoryUpdateFormData = {
      title: title.trim(),
      description: description.trim() || null,
      when_date: whenDate.trim() || null,
    }

    startTransition(async () => {
      try {
        await updateMemory(memory.id, formData)
        onSave()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-1">
        <Label htmlFor={`memory-title-${memory.id}`}>Titel</Label>
        <Input
          id={`memory-title-${memory.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`memory-when-${memory.id}`}>Hvornår</Label>
        <Input
          id={`memory-when-${memory.id}`}
          value={whenDate}
          onChange={(e) => setWhenDate(e.target.value)}
          placeholder="F.eks. Sommeren 2018"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`memory-description-${memory.id}`}>Beskrivelse</Label>
        <textarea
          id={`memory-description-${memory.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Gemmer…' : 'Gem ændringer'}
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

export function MemoryManager({ initialMemories }: Props) {
  const router = useRouter()
  const [memories, setMemories] = useState<Memory[]>(initialMemories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setMemories(initialMemories)
  }, [initialMemories])

  function handleSaveEdit() {
    setEditingId(null)
    router.refresh()
  }

  function handleDelete(memory: Memory) {
    if (!window.confirm(`Slet mindet "${memory.title}"? Dette kan ikke fortrydes.`)) return
    setActionError(null)
    startTransition(async () => {
      try {
        await deleteMemory(memory.id)
        setMemories((prev) => prev.filter((m) => m.id !== memory.id))
        router.refresh()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleShowOnScreen(memory: Memory) {
    setActionError(null)
    startTransition(async () => {
      try {
        await showOnPrimaryScreen('memory', memory.id)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {memories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ingen minder endnu. Minder oprettes af gæster.
        </p>
      ) : (
        <ul className="space-y-2">
          {memories.map((memory) => {
            if (editingId === memory.id) {
              return (
                <li key={memory.id} className="rounded-md border p-4">
                  <MemoryEditForm
                    memory={memory}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              )
            }

            return (
              <li key={memory.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  {memory.image_url && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={memory.image_url}
                        alt={memory.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{memory.title}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[memory.type]}`}
                      >
                        {TYPE_LABELS[memory.type]}
                      </span>
                      {memory.when_date && (
                        <span className="text-xs text-muted-foreground">
                          {memory.when_date}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {memory.guests?.name ?? 'Ukendt gæst'}
                    </p>
                    {memory.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {truncate(memory.description, 100)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleShowOnScreen(memory)}
                      aria-label={`Vis ${memory.title} på skærm`}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setEditingId(memory.id)}
                      aria-label={`Rediger ${memory.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(memory)}
                      aria-label={`Slet ${memory.title}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
