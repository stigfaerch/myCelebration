'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Pencil, Trash2, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getMemories,
  updateMemory,
  deleteMemory,
  toggleMemoryFavorite,
  type Memory,
  type MemoryType,
  type MemoryUpdateFormData,
} from '@/lib/actions/memories'
import { showOnPrimaryScreen, clearScreenOverride } from '@/lib/actions/screen'

export interface ActiveMemoryOverride {
  screenId: string
  screenName: string
}

interface Props {
  initialMemories: Memory[]
  activeOverrides?: ActiveMemoryOverride[]
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

export function MemoryManager({ initialMemories, activeOverrides = [] }: Props) {
  const router = useRouter()
  const [memories, setMemories] = useState<Memory[]>(initialMemories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    // Server-side props refresh: re-apply current favorites filter on top of
    // the freshly delivered list so the visible state stays consistent after
    // router.refresh() (e.g. after delete/show-on-screen).
    if (favoritesOnly) {
      setMemories(initialMemories.filter((m) => m.is_favorite))
    } else {
      setMemories(initialMemories)
    }
  }, [initialMemories, favoritesOnly])

  function handleSaveEdit() {
    setEditingId(null)
    router.refresh()
  }

  function handleToggleFavoritesFilter(next: boolean) {
    setFavoritesOnly(next)
    setActionError(null)
    startTransition(async () => {
      try {
        const filtered = await getMemories({ is_favorite: next ? true : null })
        setMemories(filtered)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleToggleFavorite(memory: Memory) {
    setActionError(null)
    const nextFavorite = !memory.is_favorite
    setMemories((prev) => {
      const updated = prev.map((m) =>
        m.id === memory.id ? { ...m, is_favorite: nextFavorite } : m
      )
      if (favoritesOnly && !nextFavorite) {
        return updated.filter((m) => m.id !== memory.id)
      }
      return updated
    })
    startTransition(async () => {
      try {
        await toggleMemoryFavorite(memory.id, nextFavorite)
      } catch (err) {
        setMemories((prev) => {
          const exists = prev.some((m) => m.id === memory.id)
          if (!exists) {
            return [...prev, { ...memory, is_favorite: memory.is_favorite }].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
          }
          return prev.map((m) =>
            m.id === memory.id ? { ...m, is_favorite: memory.is_favorite } : m
          )
        })
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
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
        router.refresh()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleClearOverride(screenId: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await clearScreenOverride(screenId)
        router.refresh()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {activeOverrides.length > 0 && (
        <div className="space-y-2">
          {activeOverrides.map((override) => (
            <div
              key={override.screenId}
              className="rounded-md border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3"
            >
              <p className="text-sm text-amber-900">
                Skærm <strong>{override.screenName}</strong> viser et minde —
                skærm-rotationen er sat på pause.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleClearOverride(override.screenId)}
                disabled={isPending}
              >
                Tilbage til skærm-rotation
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => handleToggleFavoritesFilter(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-input"
          />
          Kun favoritter
        </label>
      </div>

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
                      onClick={() => handleToggleFavorite(memory)}
                      aria-label={memory.is_favorite ? 'Fjern favorit' : 'Favorit'}
                      title={memory.is_favorite ? 'Fjern favorit' : 'Favorit'}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          memory.is_favorite
                            ? 'text-rose-500'
                            : 'text-muted-foreground'
                        }`}
                        fill={memory.is_favorite ? 'currentColor' : 'none'}
                      />
                    </Button>
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
