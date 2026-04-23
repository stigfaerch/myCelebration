'use client'
import * as React from 'react'
import type { GalleryConfig } from '@/lib/actions/gallery'
import type { GalleryItem } from '@/lib/actions/guest/gallery'

interface Props {
  config: GalleryConfig
  items: GalleryItem[]
}

export function GalleryVertical({ config, items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Ingen billeder i galleriet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {items.map((item) => (
        <div
          key={`${item.kind}-${item.id}`}
          className="relative aspect-square w-full overflow-hidden rounded-md bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
          {config.show_memory_text && item.kind === 'memory' && (item.title || item.description) && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3 text-white">
              {item.title && <p className="text-sm font-semibold">{item.title}</p>}
              {item.description && (
                <p className="mt-0.5 text-xs opacity-90 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
