import { GalleryHorizontal } from '@/components/guest/GalleryHorizontal'
import type { GalleryConfig } from '@/lib/actions/gallery'
import type { GalleryItem } from '@/lib/actions/guest/gallery'

interface Props {
  config: GalleryConfig
  items: GalleryItem[]
}

/**
 * Default screen content: fullscreen gallery. Used whenever there is
 * no active override (override null, 'gallery', or unknown).
 */
export function ScreenDefault({ config, items }: Props) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <GalleryHorizontal config={config} items={items} />
    </div>
  )
}
