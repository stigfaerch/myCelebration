'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  deletePage,
  getPage,
  type Page,
  type PageSummary,
} from '@/lib/actions/pages'
import { showOnPrimaryScreen } from '@/lib/actions/screen'
import { PageForm } from '@/components/admin/PageForm'
import { RichTextDisplay } from '@/components/admin/RichTextDisplay'

interface Props {
  initialPages: PageSummary[]
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('da-DK', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function PageManager({ initialPages }: Props) {
  const router = useRouter()
  const [pages, setPages] = useState<PageSummary[]>(initialPages)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [previewCache, setPreviewCache] = useState<Record<string, Record<string, unknown> | null>>({})
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setPages(initialPages)
  }, [initialPages])

  function resetForms() {
    setShowNewForm(false)
    setEditingPage(null)
    setEditingId(null)
    router.refresh()
  }

  function togglePreview(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (!(id in previewCache)) {
          startTransition(async () => {
            try {
              const page = await getPage(id)
              setPreviewCache((cache) => ({ ...cache, [id]: page?.content ?? null }))
            } catch (err) {
              setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
            }
          })
        }
      }
      return next
    })
  }

  function handleEdit(id: string) {
    setActionError(null)
    setEditingId(id)
    setShowNewForm(false)
    startTransition(async () => {
      try {
        const page = await getPage(id)
        if (!page) {
          setActionError('Siden blev ikke fundet')
          setEditingId(null)
          return
        }
        setEditingPage(page)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
        setEditingId(null)
      }
    })
  }

  function handleDelete(id: string, title: string) {
    if (!window.confirm(`Slet siden "${title}"? Dette kan ikke fortrydes.`)) return
    setActionError(null)
    startTransition(async () => {
      try {
        await deletePage(id)
        setPages((prev) => prev.filter((p) => p.id !== id))
        router.refresh()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleShowOnScreen(id: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await showOnPrimaryScreen('page', id)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {pages.length === 0 && !showNewForm ? (
        <p className="text-sm text-muted-foreground">Ingen sider endnu.</p>
      ) : (
        <ul className="space-y-2">
          {pages.map((page) => {
            const isEditing = editingId === page.id
            if (isEditing && editingPage) {
              return (
                <li key={page.id} className="rounded-md border p-4">
                  <PageForm page={editingPage} onSave={resetForms} onCancel={resetForms} />
                </li>
              )
            }

            const isExpanded = expandedIds.has(page.id)
            const previewContent = previewCache[page.id]

            return (
              <li key={page.id} className="rounded-md border">
                <div className="flex items-center justify-between gap-2 p-3">
                  <button
                    type="button"
                    className="text-muted-foreground"
                    onClick={() => togglePreview(page.id)}
                    aria-label={
                      isExpanded ? `Skjul indhold for ${page.title}` : `Vis indhold for ${page.title}`
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{page.title}</span>
                      <span className="text-xs text-muted-foreground">/{page.slug}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          page.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {page.is_active ? 'Aktiv' : 'Deaktiveret'}
                      </span>
                    </div>
                    {(page.visible_from || page.visible_until) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {page.visible_from && <>Fra {formatDate(page.visible_from)}</>}
                        {page.visible_from && page.visible_until && ' — '}
                        {page.visible_until && <>Indtil {formatDate(page.visible_until)}</>}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleShowOnScreen(page.id)}
                      aria-label={`Vis ${page.title} på skærm`}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleEdit(page.id)}
                      aria-label={`Rediger ${page.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(page.id, page.title)}
                      aria-label={`Slet ${page.title}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-3 py-2 bg-muted/30">
                    {previewContent === undefined ? (
                      <p className="text-xs text-muted-foreground">Indlæser…</p>
                    ) : previewContent === null ? (
                      <p className="text-xs text-muted-foreground italic">Intet indhold.</p>
                    ) : (
                      <RichTextDisplay content={previewContent} />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {showNewForm ? (
        <div className="rounded-md border p-4">
          <h3 className="mb-3 text-sm font-medium">Ny side</h3>
          <PageForm onSave={resetForms} onCancel={resetForms} />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowNewForm(true)
            setEditingPage(null)
            setEditingId(null)
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Ny side
        </Button>
      )}
    </div>
  )
}
