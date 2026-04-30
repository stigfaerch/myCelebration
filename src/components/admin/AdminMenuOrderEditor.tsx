'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { GripVertical } from 'lucide-react'
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
import { ADMIN_NAV_META, type AdminNavKey } from '@/lib/admin/nav'
import { updateAdminNavOrder } from '@/lib/actions/settings'

interface Props {
  initialOrder: AdminNavKey[]
}

export function AdminMenuOrderEditor({ initialOrder }: Props) {
  const t = useTranslations('admin.nav')
  const router = useRouter()
  const [order, setOrder] = React.useState<AdminNavKey[]>(initialOrder)
  const [savedOrder, setSavedOrder] = React.useState<AdminNavKey[]>(initialOrder)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const dirty =
    order.length !== savedOrder.length ||
    order.some((k, i) => k !== savedOrder[i])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder((prev) => {
      const from = prev.indexOf(active.id as AdminNavKey)
      const to = prev.indexOf(over.id as AdminNavKey)
      if (from === -1 || to === -1) return prev
      return arrayMove(prev, from, to)
    })
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        await updateAdminNavOrder(order)
        setSavedOrder(order)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleReset() {
    setError(null)
    setOrder(savedOrder)
  }

  return (
    <div className="space-y-3">
      <DndContext
        id="admin-menu-order-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {order.map((key) => (
              <SortableRow key={key} navKey={key} label={t(key)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || isPending}>
          Gem rækkefølge
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!dirty || isPending}
        >
          Nulstil
        </Button>
      </div>
    </div>
  )
}

interface RowProps {
  navKey: AdminNavKey
  label: string
}

function SortableRow({ navKey, label }: RowProps) {
  const Icon = ADMIN_NAV_META[navKey].icon
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: navKey })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5"
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label="Træk for at flytte"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </li>
  )
}
