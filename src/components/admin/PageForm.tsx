'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { createPage, updatePage, type Page, type PageFormData } from '@/lib/actions/pages'

interface Props {
  page?: Page | null
  onSave: () => void
  onCancel: () => void
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'oe')
    .replace(/[å]/g, 'aa')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function PageForm({ page, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(page?.title ?? '')
  const [slug, setSlug] = useState(page?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(page?.slug))
  const [content, setContent] = useState<Record<string, unknown> | null>(page?.content ?? null)
  const [isActive, setIsActive] = useState(page?.is_active ?? false)
  const [visibleFrom, setVisibleFrom] = useState(toDatetimeLocal(page?.visible_from ?? null))
  const [visibleUntil, setVisibleUntil] = useState(toDatetimeLocal(page?.visible_until ?? null))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) {
      setSlug(slugify(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlug(slugify(value))
    setSlugTouched(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Titel er påkrævet')
      return
    }
    const finalSlug = slug.trim() || slugify(title)
    if (!finalSlug) {
      setError('Slug er påkrævet')
      return
    }

    const formData: PageFormData = {
      slug: finalSlug,
      title: title.trim(),
      content,
      is_active: isActive,
      visible_from: fromDatetimeLocal(visibleFrom),
      visible_until: fromDatetimeLocal(visibleUntil),
    }

    startTransition(async () => {
      try {
        if (page) {
          await updatePage(page.id, formData)
        } else {
          await createPage(formData)
        }
        onSave()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-2">
        <Label htmlFor="page-title">Titel</Label>
        <Input
          id="page-title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="F.eks. Velkommen"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="page-slug">Slug</Label>
        <Input
          id="page-slug"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="velkommen"
          required
        />
        <p className="text-xs text-muted-foreground">
          Bruges i URL&apos;en. Kun små bogstaver, tal og bindestreger.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Indhold</Label>
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="page-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="page-active" className="cursor-pointer">
          Aktiv (synlig for gæster)
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="page-visible-from">Synlig fra</Label>
          <Input
            id="page-visible-from"
            type="datetime-local"
            value={visibleFrom}
            onChange={(e) => setVisibleFrom(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="page-visible-until">Synlig indtil</Label>
          <Input
            id="page-visible-until"
            type="datetime-local"
            value={visibleUntil}
            onChange={(e) => setVisibleUntil(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Gemmer…' : page ? 'Gem ændringer' : 'Opret side'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Annullér
        </Button>
      </div>
    </form>
  )
}
