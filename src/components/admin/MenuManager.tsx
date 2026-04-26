'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  EyeOff,
  FileText,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Button } from '@/components/ui/button'
import {
  deletePage,
  getPage,
  type Page,
} from '@/lib/actions/pages'
import {
  updateNavOrder,
  type ResolvedNavAdminItem,
} from '@/lib/actions/settings'
import { ICON_BY_KEY, type NavOrderItem } from '@/lib/guest/navItems'
import { PageForm } from '@/components/admin/PageForm'
import { RichTextDisplay } from '@/components/admin/RichTextDisplay'
import {
  ScreenAssignmentToggle,
  type ScreenInfo,
} from '@/components/admin/ScreenAssignmentToggle'
import {
  StaticItemVisibilityControls,
  VisibilityBadges,
} from '@/components/admin/StaticItemVisibilityControls'
import type { StaticItemVisibility } from '@/lib/actions/staticItemVisibility'

/**
 * Static keys that admins can show on screens (R25 in PROJECT.md). The other
 * static keys (`camera`, `photos`, `minder`) get visibility controls but no
 * screen-toggle — Camera depends on the camera API, Billeder is per-guest
 * private content, and Minder is out of scope per the ROADMAP wording.
 */
const SCREEN_ELIGIBLE_STATIC_KEYS = new Set([
  'galleri',
  'deltagere',
  'hvor',
  'tasks',
  'program',
])

interface Props {
  initialItems: ResolvedNavAdminItem[]
  /** All screen-type guests, used to populate the per-page toggle menu. */
  screens: ScreenInfo[]
  /** page_id → assigned screen_guest_ids[]. Plumbed from the server. */
  assignmentsByPageId: Record<string, string[]>
  /** static_key → current visibility record (absent key == fully visible). */
  staticVisibilityMap: Record<string, StaticItemVisibility>
  /** static_key → assigned screen_guest_ids[]. */
  staticAssignmentsByKey: Record<string, string[]>
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('da-DK', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function toNavOrderItem(item: ResolvedNavAdminItem): NavOrderItem {
  if (item.kind === 'static' && item.staticKey) {
    return { kind: 'static', key: item.staticKey }
  }
  if (item.kind === 'page' && item.pageId) {
    return { kind: 'page', id: item.pageId }
  }
  // Should be impossible given how getResolvedNavForAdmin builds these.
  throw new Error('Ugyldigt element i listen')
}

export function MenuManager({
  initialItems,
  screens,
  assignmentsByPageId,
  staticVisibilityMap,
  staticAssignmentsByKey,
}: Props) {
  const router = useRouter()
  const t = useTranslations('guest.nav')

  const [items, setItems] = React.useState<ResolvedNavAdminItem[]>(initialItems)
  // Adopt updated initial order on prop change (after router.refresh).
  // Using the "reset state with key change" pattern via a sentinel ref to
  // avoid an effect cascade.
  const [lastInitial, setLastInitial] = React.useState(initialItems)
  if (initialItems !== lastInitial) {
    setLastInitial(initialItems)
    setItems(initialItems)
  }

  const [showNewForm, setShowNewForm] = React.useState(false)
  const [editingPage, setEditingPage] = React.useState<Page | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())
  const [previewCache, setPreviewCache] = React.useState<
    Record<string, Record<string, unknown> | null>
  >({})
  const [isPending, startTransition] = React.useTransition()
  const [isSaving, startSaveTransition] = React.useTransition()
  const [actionError, setActionError] = React.useState<string | null>(null)

  // dnd-kit sensors:
  // PointerSensor handles mouse + touch via pointer events. The 5px distance
  // activation constraint means a tap on action buttons (Monitor / Pencil /
  // Trash2) does not accidentally start a drag — the user must move ~5px
  // before drag begins. KeyboardSensor preserves a11y (arrow keys to reorder).
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
        return next
      }
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
        // deletePage triggers revalidate; new initialItems will arrive via the
        // server. We also drop the row from local state immediately so the UI
        // is consistent without a flash.
        setItems((prev) => prev.filter((i) => !(i.kind === 'page' && i.pageId === id)))
        router.refresh()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.key === active.id)
    const newIndex = items.findIndex((i) => i.key === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const previous = items
    const next = arrayMove(items, oldIndex, newIndex)

    // Optimistic update — apply locally immediately.
    setItems(next)
    setActionError(null)

    startSaveTransition(async () => {
      try {
        const payload = next.map(toNavOrderItem)
        await updateNavOrder(payload)
        // Sync any server-side metadata changes (e.g. visibility flags).
        router.refresh()
      } catch (err) {
        // Rollback on error.
        setItems(previous)
        setActionError(
          err instanceof Error ? err.message : 'Kunne ikke gemme rækkefølge'
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Slot 1 (Hjem) og menu-knappen er faste. De første to elementer i listen
        vises som slot 2 og 3 i bundmenuen. Resten ligger i Menu-sheet&apos;en.
        Træk og slip for at ændre rækkefølgen — ændringen gemmes automatisk.
      </p>

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.key)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1" aria-busy={isSaving || undefined}>
            {items.map((item, index) => {
              const isEditingThis =
                item.kind === 'page' && item.pageId === editingId
              if (isEditingThis && editingPage) {
                return (
                  <li
                    key={item.key}
                    className="rounded-md border p-4 bg-background"
                  >
                    <PageForm
                      page={editingPage}
                      onSave={resetForms}
                      onCancel={resetForms}
                    />
                  </li>
                )
              }

              const staticKey =
                item.kind === 'static' ? item.staticKey : undefined
              const staticVisibility =
                staticKey !== undefined
                  ? staticVisibilityMap[staticKey]
                  : undefined
              const staticAssignedIds =
                staticKey !== undefined
                  ? staticAssignmentsByKey[staticKey] ?? []
                  : []
              const screenEligibleStatic =
                staticKey !== undefined &&
                SCREEN_ELIGIBLE_STATIC_KEYS.has(staticKey)

              return (
                <React.Fragment key={item.key}>
                  <SectionLabel index={index} />
                  <SortableRow
                    item={item}
                    index={index}
                    staticLabel={
                      item.kind === 'static' && item.labelKey
                        ? t(item.labelKey)
                        : undefined
                    }
                    isExpanded={
                      item.kind === 'page' &&
                      item.pageId !== undefined &&
                      expandedIds.has(item.pageId)
                    }
                    previewContent={
                      item.kind === 'page' && item.pageId
                        ? previewCache[item.pageId]
                        : undefined
                    }
                    isPending={isPending}
                    hiddenInactiveTooltip={t('hiddenInactive')}
                    hiddenWindowTooltip={t('hiddenWindow')}
                    onToggle={togglePreview}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onError={setActionError}
                    screens={screens}
                    assignedScreenIds={
                      item.kind === 'page' && item.pageId
                        ? assignmentsByPageId[item.pageId] ?? []
                        : staticAssignedIds
                    }
                    staticVisibility={staticVisibility}
                    screenEligibleStatic={screenEligibleStatic}
                  />
                </React.Fragment>
              )
            })}
          </ul>
        </SortableContext>
      </DndContext>

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

// =============================================================================
// Section labels (visual dividers above index 0, 1, 2)
// =============================================================================

function SectionLabel({ index }: { index: number }) {
  let label: string | null = null
  if (index === 0) label = 'Slot 2 — primær'
  else if (index === 1) label = 'Slot 3 — primær'
  else if (index === 2) label = 'Sekundær menu'
  if (!label) return null

  // Captions are read by AT thanks to role="presentation" being absent — this
  // is a real heading-like label for the following group. We mark it as a list
  // item so the parent <ul> stays valid HTML.
  return (
    <li
      aria-hidden="true"
      className="px-2 pt-3 pb-1 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground"
    >
      {label}
    </li>
  )
}

// =============================================================================
// Sortable row
// =============================================================================

interface SortableRowProps {
  item: ResolvedNavAdminItem
  index: number
  staticLabel?: string
  isExpanded: boolean
  previewContent: Record<string, unknown> | null | undefined
  isPending: boolean
  hiddenInactiveTooltip: string
  hiddenWindowTooltip: string
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string, title: string) => void
  onError: (message: string) => void
  screens: ScreenInfo[]
  assignedScreenIds: string[]
  /** Static-only: current visibility record (or undefined when never set). */
  staticVisibility?: StaticItemVisibility
  /** Static-only: whether this key is eligible for screen-toggle. */
  screenEligibleStatic?: boolean
}

function SortableRow({
  item,
  index,
  staticLabel,
  isExpanded,
  previewContent,
  isPending,
  hiddenInactiveTooltip,
  hiddenWindowTooltip,
  onToggle,
  onEdit,
  onDelete,
  onError,
  screens,
  assignedScreenIds,
  staticVisibility,
  screenEligibleStatic,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  }

  const isPage = item.kind === 'page'
  const label = isPage ? item.pageTitle ?? '(uden titel)' : staticLabel ?? ''
  const dragLabel = `Træk for at flytte ${label}`

  // Static-row visibility flags. When no record exists yet, treat as fully
  // visible — matches the server-side `isStaticItemVisibleNow` default.
  const staticIsActive = staticVisibility ? staticVisibility.is_active : true
  const staticVisibleFrom = staticVisibility?.visible_from ?? null
  const staticVisibleUntil = staticVisibility?.visible_until ?? null
  const staticHasMeta = Boolean(staticVisibility)

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-md border bg-background"
    >
      <div className="flex items-center gap-2 px-2 py-2">
        {/* Drag handle: only this element initiates drag. Listeners + attributes
            attached here means action buttons elsewhere in the row remain
            tappable on touch devices without accidentally starting a drag. */}
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={dragLabel}
          className="flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {isPage ? (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground"
            onClick={() => item.pageId && onToggle(item.pageId)}
            aria-label={
              isExpanded
                ? `Skjul indhold for ${label}`
                : `Vis indhold for ${label}`
            }
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          // Spacer to align with page rows that have a chevron column.
          <span aria-hidden="true" className="inline-block h-7 w-7 shrink-0" />
        )}

        <RowIcon item={item} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                'text-sm font-medium ' +
                ((isPage && item.pageIsActive === false) ||
                (!isPage && !staticIsActive)
                  ? 'text-muted-foreground line-through'
                  : '')
              }
            >
              {label}
            </span>

            {isPage && item.pageId && (
              <>
                {item.pageSlug && (
                  <span className="text-xs text-muted-foreground">
                    /{item.pageSlug}
                  </span>
                )}
                <PageBadges item={item} />
              </>
            )}

            {/*
              "Indbygget" badge: keep it ONLY when the static row has no
              custom visibility record. Once an admin has configured the
              window, the EyeOff/Clock badges (and the Synlig fra/indtil
              line) carry the signal and the static-vs-dynamic distinction
              is no longer interesting at a glance.
            */}
            {!isPage && !staticHasMeta && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Indbygget
              </span>
            )}

            {index === 0 && <SlotBadge>Slot 2</SlotBadge>}
            {index === 1 && <SlotBadge>Slot 3</SlotBadge>}

            {isPage && item.pageIsActive === false && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title={hiddenInactiveTooltip}
                aria-label={hiddenInactiveTooltip}
              >
                <EyeOff className="h-3.5 w-3.5" />
              </span>
            )}
            {isPage && item.pageOutsideWindow && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title={hiddenWindowTooltip}
                aria-label={hiddenWindowTooltip}
              >
                <Clock className="h-3.5 w-3.5" />
              </span>
            )}
            {!isPage && (
              <VisibilityBadges
                is_active={staticIsActive}
                visible_from={staticVisibleFrom}
                visible_until={staticVisibleUntil}
                hiddenInactiveTooltip={hiddenInactiveTooltip}
                hiddenWindowTooltip={hiddenWindowTooltip}
              />
            )}
          </div>

          {isPage && (item.pageVisibleFrom || item.pageVisibleUntil) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {item.pageVisibleFrom && <>Fra {formatDate(item.pageVisibleFrom)}</>}
              {item.pageVisibleFrom && item.pageVisibleUntil && ' — '}
              {item.pageVisibleUntil && (
                <>Indtil {formatDate(item.pageVisibleUntil)}</>
              )}
            </p>
          )}

          {!isPage && (staticVisibleFrom || staticVisibleUntil) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {staticVisibleFrom && <>Fra {formatDate(staticVisibleFrom)}</>}
              {staticVisibleFrom && staticVisibleUntil && ' — '}
              {staticVisibleUntil && (
                <>Indtil {formatDate(staticVisibleUntil)}</>
              )}
            </p>
          )}

          {!isPage && item.staticKey && (
            <div className="mt-2">
              <StaticItemVisibilityControls
                staticKey={item.staticKey}
                initial={{
                  is_active: staticIsActive,
                  visible_from: staticVisibleFrom,
                  visible_until: staticVisibleUntil,
                }}
                onError={onError}
              />
            </div>
          )}
        </div>

        {isPage && item.pageId && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => onEdit(item.pageId!)}
              aria-label={`Rediger ${label}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => onDelete(item.pageId!, label)}
              aria-label={`Slet ${label}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <ScreenAssignmentToggle
              subject={{
                kind: 'page',
                pageId: item.pageId,
                pageLabel: label,
              }}
              screens={screens}
              assignedScreenIds={assignedScreenIds}
              onError={onError}
              disabled={isPending}
            />
          </div>
        )}

        {!isPage && item.staticKey && screenEligibleStatic && (
          <div className="flex items-center gap-1 shrink-0">
            <ScreenAssignmentToggle
              subject={{
                kind: 'static',
                staticKey: item.staticKey,
                staticLabel: label,
              }}
              screens={screens}
              assignedScreenIds={assignedScreenIds}
              onError={onError}
              disabled={isPending}
            />
          </div>
        )}
      </div>

      {isPage && isExpanded && (
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
}

function RowIcon({ item }: { item: ResolvedNavAdminItem }) {
  if (item.kind === 'static' && item.staticKey) {
    const Icon = ICON_BY_KEY[`static-${item.staticKey}`]
    return <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  }
  return <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
}

function PageBadges({ item }: { item: ResolvedNavAdminItem }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        item.pageIsActive
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      {item.pageIsActive ? 'Aktiv' : 'Deaktiveret'}
    </span>
  )
}

function SlotBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      {children}
    </span>
  )
}
