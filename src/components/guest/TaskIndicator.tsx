'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckSquare, ChevronRight } from 'lucide-react'

interface Props {
  uuid: string
  count: number
}

export function TaskIndicator({ uuid, count }: Props) {
  if (count === 0) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="text-base font-semibold mb-1">Opgaver</h2>
        <p className="text-sm text-muted-foreground">Du har ingen opgaver.</p>
      </section>
    )
  }

  const label = count === 1 ? '1 opgave' : `${count} opgaver`

  return (
    <section>
      <Link
        href={`/${uuid}/opgaver`}
        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <CheckSquare className="size-5 text-muted-foreground" />
          <div>
            <p className="text-base font-semibold">Opgaver</p>
            <p className="text-sm text-muted-foreground">Du har {label}</p>
          </div>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>
    </section>
  )
}
