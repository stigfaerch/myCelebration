import { getGalleryItems } from '@/lib/actions/guest/gallery'
import { GalleryHorizontal } from '@/components/guest/GalleryHorizontal'
import { GalleryVertical } from '@/components/guest/GalleryVertical'

export default async function GalleriPage() {
  const { config, items } = await getGalleryItems()
  return (
    <div className="w-full">
      <div className="hidden landscape:block w-full h-[calc(100vh-4rem)]">
        <GalleryHorizontal config={config} items={items} />
      </div>
      <div className="block landscape:hidden">
        <GalleryVertical config={config} items={items} />
      </div>
    </div>
  )
}
