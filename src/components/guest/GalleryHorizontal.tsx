'use client'
import * as React from 'react'
import type { GalleryConfig } from '@/lib/actions/gallery'
import type { GalleryItem } from '@/lib/actions/guest/gallery'

interface Props {
  config: GalleryConfig
  items: GalleryItem[]
}

function MemoryOverlay({ item }: { item: GalleryItem }) {
  if (item.kind !== 'memory') return null
  if (!item.title && !item.description) return null
  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-6 text-white">
      {item.title && <p className="text-lg font-semibold">{item.title}</p>}
      {item.description && (
        <p className="mt-1 text-sm opacity-90 line-clamp-3">{item.description}</p>
      )}
    </div>
  )
}

function SingleView({
  items,
  index,
  showMemoryText,
}: {
  items: GalleryItem[]
  index: number
  showMemoryText: boolean
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: i === index ? 1 : 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt=""
            className="h-full w-full object-contain"
          />
          {showMemoryText && <MemoryOverlay item={item} />}
        </div>
      ))}
    </div>
  )
}

function QuadView({
  items,
  index,
  showMemoryText,
}: {
  items: GalleryItem[]
  index: number
  showMemoryText: boolean
}) {
  const count = items.length
  const visible = Array.from({ length: Math.min(4, count) }, (_, i) => items[(index + i) % count])
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1 bg-black">
      {visible.map((item, i) => (
        <div key={`${item.id}-${i}`} className="relative overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
          {showMemoryText && <MemoryOverlay item={item} />}
        </div>
      ))}
    </div>
  )
}

function FramesView({
  items,
  index,
  showMemoryText,
}: {
  items: GalleryItem[]
  index: number
  showMemoryText: boolean
}) {
  const count = items.length
  const left = items[index % count]
  const center = items[(index + 1) % count]
  const right = items[(index + 2) % count]

  function Frame({ item, size }: { item: GalleryItem; size: 'small' | 'large' }) {
    return (
      <div
        className={
          size === 'large'
            ? 'relative h-full flex-[2] overflow-hidden bg-black'
            : 'relative h-full flex-1 overflow-hidden bg-black opacity-70'
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt=""
          className="h-full w-full object-cover"
        />
        {showMemoryText && <MemoryOverlay item={item} />}
      </div>
    )
  }

  return (
    <div className="flex h-full w-full gap-1 bg-black">
      <Frame item={left} size="small" />
      <Frame item={center} size="large" />
      <Frame item={right} size="small" />
    </div>
  )
}

export function GalleryHorizontal({ config, items }: Props) {
  const [index, setIndex] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const intervalMs = Math.max(1, config.interval_seconds) * 1000

  React.useEffect(() => {
    if (items.length <= 1) return
    if (paused) return
    const handle = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length)
    }, intervalMs)
    return () => window.clearInterval(handle)
  }, [items.length, paused, intervalMs])

  if (items.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white">
        <p className="text-base">Ingen billeder i galleriet</p>
      </div>
    )
  }

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {config.display_type === 'single' && (
        <SingleView
          items={items}
          index={index % items.length}
          showMemoryText={config.show_memory_text}
        />
      )}
      {config.display_type === 'quad' && (
        <QuadView
          items={items}
          index={index % items.length}
          showMemoryText={config.show_memory_text}
        />
      )}
      {config.display_type === 'frames' && (
        <FramesView
          items={items}
          index={index % items.length}
          showMemoryText={config.show_memory_text}
        />
      )}
    </div>
  )
}
