'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { MyAssignment } from '@/lib/actions/guest/tasks'

interface Props {
  uuid: string
  assignments: MyAssignment[]
}

function formatDueTime(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('da-DK')
}

export function TaskIndicator({ uuid, assignments }: Props) {
  const items = assignments.filter((a) => a.tasks !== null)

  if (items.length === 0) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="text-base font-semibold mb-1">Opgaver</h2>
        <p className="text-sm text-muted-foreground">Du har ingen opgaver.</p>
      </section>
    )
  }

  return (
    <section>
      <Link
        href={`/${uuid}/opgaver`}
        className="flex items-start justify-between gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold mb-2">Opgaver</p>
          <ul className="space-y-2">
            {items.map((assignment) => {
              const task = assignment.tasks
              if (!task) return null
              const due = formatDueTime(task.due_time)
              const meta = [task.location, due].filter(Boolean).join(' · ')
              return (
                <li key={assignment.id}>
                  <p className="text-sm font-medium">{task.title}</p>
                  {meta && (
                    <p className="text-xs text-muted-foreground">{meta}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <ChevronRight className="size-5 text-muted-foreground shrink-0 mt-0.5" />
      </Link>
    </section>
  )
}
