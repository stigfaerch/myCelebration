import { getGalleryConfig } from '@/lib/actions/gallery'
import { GalleryConfigForm } from '@/components/admin/GalleryConfigForm'

export default async function GalleriPage() {
  const config = await getGalleryConfig()
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Galleri</h1>
        <p className="text-sm text-muted-foreground">
          Konfigurer hvilke billeder og minder der vises i galleriet, og hvordan de skifter.
        </p>
      </div>
      <GalleryConfigForm config={config} />
    </div>
  )
}
