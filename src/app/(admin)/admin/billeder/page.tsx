import { getPhotos } from '@/lib/actions/photos'
import { PhotoManager } from '@/components/admin/PhotoManager'

export default async function BillederPage() {
  const photos = await getPhotos()
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Billeder</h1>
        <p className="text-sm text-muted-foreground">
          Billeder uploadet af gæster. Filtrer, deaktiver, slet eller vis på skærm.
        </p>
      </div>
      <PhotoManager initialPhotos={photos} />
    </div>
  )
}
