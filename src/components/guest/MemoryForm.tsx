'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createMemory,
  updateMemory,
  type MemoryType,
  type MyMemory,
} from '@/lib/actions/guest/memories'

interface Props {
  memory?: MyMemory | null
  onSave: () => void
  onCancel: () => void
}

const DESCRIPTION_MAX = 500

const TYPE_OPTIONS: { value: MemoryType; label: string }[] = [
  { value: 'funny', label: 'Sjov' },
  { value: 'solemn', label: 'Højtidelig' },
  { value: 'everyday', label: 'Hverdag' },
  { value: 'milestone', label: 'Milepæl' },
]

export function MemoryForm({ memory, onSave, onCancel }: Props) {
  const [title, setTitle] = React.useState(memory?.title ?? '')
  const [type, setType] = React.useState<MemoryType>(memory?.type ?? 'everyday')
  const [description, setDescription] = React.useState(memory?.description ?? '')
  const [whenDate, setWhenDate] = React.useState(memory?.when_date ?? '')
  const [file, setFile] = React.useState<File | null>(null)
  const [removeImage, setRemoveImage] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const existingImageUrl = memory?.image_url ?? null

  const newImagePreview = React.useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  React.useEffect(() => {
    return () => {
      if (newImagePreview) URL.revokeObjectURL(newImagePreview)
    }
  }, [newImagePreview])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Titel er påkrævet')
      return
    }

    const formData = new FormData()
    formData.append('title', trimmedTitle)
    formData.append('type', type)
    formData.append('description', description.trim())
    formData.append('when_date', whenDate.trim())
    if (file) formData.append('file', file)
    if (memory && removeImage) formData.append('removeImage', 'true')

    startTransition(async () => {
      try {
        if (memory) {
          await updateMemory(memory.id, formData)
        } else {
          await createMemory(formData)
        }
        onSave()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunne ikke gemme minde')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-1">
        <Label htmlFor="memory-title">Titel</Label>
        <Input
          id="memory-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-1">
        <Label htmlFor="memory-type">Type</Label>
        <select
          id="memory-type"
          value={type}
          onChange={(e) => setType(e.target.value as MemoryType)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="memory-when">Hvornår</Label>
        <Input
          id="memory-when"
          value={whenDate}
          onChange={(e) => setWhenDate(e.target.value)}
          placeholder="F.eks. Sommeren 2018"
        />
      </div>

      <div className="grid gap-1">
        <Label htmlFor="memory-description">Beskrivelse</Label>
        <textarea
          id="memory-description"
          value={description}
          onChange={(e) =>
            setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
          }
          rows={4}
          maxLength={DESCRIPTION_MAX}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {description.length}/{DESCRIPTION_MAX}
        </p>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="memory-file">Billede</Label>
        {existingImageUrl && !removeImage && !file && (
          <div className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existingImageUrl}
              alt=""
              className="h-32 w-32 rounded object-cover"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={removeImage}
                onChange={(e) => setRemoveImage(e.target.checked)}
              />
              Fjern billede
            </label>
          </div>
        )}
        {newImagePreview && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={newImagePreview}
            alt=""
            className="h-32 w-32 rounded object-cover"
          />
        )}
        <input
          id="memory-file"
          type="file"
          accept="image/jpeg,image/png,image/heic"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            setFile(f)
            if (f) setRemoveImage(false)
          }}
          className="text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Gemmer…' : memory ? 'Gem ændringer' : 'Opret minde'}
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
