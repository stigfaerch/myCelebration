'use client'
import { useState, useTransition } from 'react'
import { ChevronUp, ChevronDown, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProgramItems, moveProgramItemUp, moveProgramItemDown, deleteProgramItem } from '@/lib/actions/program'
import { getPerformances } from '@/lib/actions/performances'
import { ProgramItemForm } from '@/components/admin/ProgramItemForm'

type Items = Awaited<ReturnType<typeof getProgramItems>>
type Performances = Awaited<ReturnType<typeof getPerformances>>

interface Props {
  items: Items
  performances: Performances
}

const TYPE_LABELS: Record<string, string> = {
  break: 'Pause',
  performance: 'Indslag',
  info: 'Information',
  ceremony: 'Ceremoni',
}

const TYPE_COLORS: Record<string, string> = {
  break: 'bg-gray-100 text-gray-700',
  performance: 'bg-blue-100 text-blue-700',
  info: 'bg-yellow-100 text-yellow-700',
  ceremony: 'bg-purple-100 text-purple-700',
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function ProgramManager({ items, performances }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Items[number] | null>(null)
  const [newItemParentId, setNewItemParentId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  const topItems = items
    .filter((i) => i.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  function childrenOf(parentId: string) {
    return items
      .filter((i) => i.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleMoveUp(id: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await moveProgramItemUp(id)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleMoveDown(id: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await moveProgramItemDown(id)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleDelete(id: string, title: string) {
    if (!window.confirm(`Slet programpunktet "${title}"? Underordnede punkter slettes også. Dette kan ikke fortrydes.`)) return
    setActionError(null)
    startTransition(async () => {
      try {
        await deleteProgramItem(id)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function resetForms() {
    setShowNewForm(false)
    setEditingItem(null)
    setNewItemParentId(null)
  }

  function getPerformanceName(item: Items[number]): string | null {
    if (!item.performance_id) return null
    const perf = item as Items[number] & { performances?: { title: string; guests?: { name: string } | null } | null }
    if (!perf.performances) return null
    const guestName = perf.performances.guests?.name
    return guestName ? `${guestName} — ${perf.performances.title}` : perf.performances.title
  }

  const topLevelItems = items.filter((i) => i.parent_id === null)

  function renderItemRow(item: Items[number], isChild: boolean) {
    const isEditing = editingItem?.id === item.id
    const isAddingChild = newItemParentId === item.id
    const children = childrenOf(item.id)
    const isExpanded = expandedIds.has(item.id)
    const perfName = getPerformanceName(item)

    if (isEditing) {
      return (
        <li key={item.id} className="rounded-md border p-4">
          <ProgramItemForm
            item={item}
            performances={performances}
            topLevelItems={topLevelItems}
            onSave={resetForms}
            onCancel={resetForms}
          />
        </li>
      )
    }

    return (
      <li key={item.id} className={isChild ? 'rounded-md border border-dashed' : 'rounded-md border'}>
        <div className="flex items-center justify-between p-3 gap-2">
          {/* Expand toggle — only for top-level items with children */}
          {!isChild && children.length > 0 ? (
            <button
              type="button"
              className="text-muted-foreground"
              onClick={() => toggleExpand(item.id)}
            >
              {isExpanded
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* Type badge */}
          <span className={`rounded px-2 py-0.5 text-xs font-medium shrink-0 ${TYPE_COLORS[item.type] ?? 'bg-gray-100 text-gray-700'}`}>
            {TYPE_LABELS[item.type] ?? item.type}
          </span>

          {/* Title + time + performance */}
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm">{item.title}</span>
            {item.start_time && (
              <span className="ml-2 text-xs text-muted-foreground">{formatTime(item.start_time)}</span>
            )}
            {item.duration_minutes != null && (
              <span className="ml-1 text-xs text-muted-foreground">({item.duration_minutes} min)</span>
            )}
            {perfName && (
              <span className="ml-2 text-xs italic text-muted-foreground">{perfName}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => handleMoveUp(item.id)}
              title="Flyt op"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => handleMoveDown(item.id)}
              title="Flyt ned"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingItem(item)}
              title="Rediger"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(item.id, item.title)}
              title="Slet"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            {/* Plus only for top-level items — one level of nesting */}
            {!isChild && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setNewItemParentId(item.id); setShowNewForm(false); setEditingItem(null) }}
                title="Tilføj underpunkt"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Inline child-creation form */}
        {isAddingChild && (
          <div className="border-t px-4 pb-4 pt-3">
            <h3 className="mb-3 text-sm font-medium">Nyt underpunkt</h3>
            <ProgramItemForm
              performances={performances}
              topLevelItems={topLevelItems}
              defaultParentId={item.id}
              onSave={resetForms}
              onCancel={resetForms}
            />
          </div>
        )}

        {/* Children */}
        {!isChild && isExpanded && children.length > 0 && (
          <div className="border-t px-3 pb-3 pt-2">
            <ul className="space-y-2 pl-4">
              {children.map((child) => renderItemRow(child, true))}
            </ul>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <p className="text-sm text-destructive">{actionError}</p>
      )}

      {topItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen programpunkter endnu.</p>
      ) : (
        <ul className="space-y-2">
          {topItems.map((item) => renderItemRow(item, false))}
        </ul>
      )}

      {showNewForm ? (
        <div className="rounded-md border p-4">
          <h3 className="mb-3 text-sm font-medium">Nyt programpunkt</h3>
          <ProgramItemForm
            performances={performances}
            topLevelItems={topLevelItems}
            onSave={resetForms}
            onCancel={resetForms}
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setShowNewForm(true); setEditingItem(null); setNewItemParentId(null) }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Nyt programpunkt
        </Button>
      )}
    </div>
  )
}
