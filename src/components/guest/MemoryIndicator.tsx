'use client'

import * as React from 'react'
import Link from 'next/link'
import { BookHeart, ChevronRight } from 'lucide-react'

interface Props {
  uuid: string
  count: number
}

export function MemoryIndicator({ uuid, count }: Props) {
  const label =
    count === 0
      ? 'Opret dit første minde'
      : count === 1
      ? 'Du har oprettet 1 minde'
      : `Du har oprettet ${count} minder`

  return (
    <section>
      <Link
        href={`/${uuid}/minder`}
        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookHeart className="size-5 text-muted-foreground" />
          <div>
            <p className="text-base font-semibold">Mine minder</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>
    </section>
  )
}
