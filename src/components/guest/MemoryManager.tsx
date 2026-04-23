'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MemoryForm } from '@/components/guest/MemoryForm'
import {
  deleteMyMemory,
  type MemoryType,
  type MyMemory,
} from '@/lib/actions/guest/memories'

interface Props {
  initialMemories: MyMemory[]
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

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; id: string }

export function MemoryManager({ initialMemories }: Props) {
  const router = useRouter()
  const [memories, setMemories] = React.useState<MyMemory[]>(initialMemories)
  const [formState, setFormState] = React.useState<FormState>({ mode: 'closed' })
  const [isPending, startTransition] = React.useTransition()
  const [actionError, setActionError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setMemories(initialMemories)
  }, [initialMemories])

  const editingMemory =
    formState.mode === 'edit'
      ? memories.find((m) => m.id === formState.id) ?? null
      : null

  function handleSaved() {
    setFormState({ mode: 'closed' })
    router.refresh()
  }

  function handleDelete(memory: MyMemory) {
    if (!window.confirm(`Slet mindet "${memory.title}"? Dette kan ikke fortrydes.`)) return
    setActionError(null)
    startTransition(async () => {
      try {
        await deleteMyMemory(memory.id)
        setMemories((prev) => prev.filter((m) => m.id !== memory.id))
        router.refresh()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Kunne ikke slette minde')
      }
    })
  }

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {formState.mode === 'create' && (
        <div className="rounded-md border p-4">
          <h2 className="mb-3 text-sm font-medium">Nyt minde</h2>
          <MemoryForm
            onSave={handleSaved}
            onCancel={() => setFormState({ mode: 'closed' })}
          />
        </div>
      )}

      {formState.mode === 'closed' && (
        <Button
          type="button"
          size="sm"
          onClick={() => setFormState({ mode: 'create' })}
        >
          <Plus className="size-4" />
          Nyt minde
        </Button>
      )}

      {memories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Du har ingen minder endnu.</p>
      ) : (
        <ul className="space-y-2">
          {memories.map((memory) => {
            if (formState.mode === 'edit' && formState.id === memory.id && editingMemory) {
              return (
                <li key={memory.id} className="rounded-md border p-4">
                  <MemoryForm
                    memory={editingMemory}
                    onSave={handleSaved}
                    onCancel={() => setFormState({ mode: 'closed' })}
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
                        alt=""
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
                    {memory.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {memory.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setFormState({ mode: 'edit', id: memory.id })}
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
