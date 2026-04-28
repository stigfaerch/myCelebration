import { getPhotos } from '@/lib/actions/photos'
import { getActiveSingleOverrides } from '@/lib/actions/screen'
import { PhotoManager } from '@/components/admin/PhotoManager'

export default async function BillederPage() {
  const [photos, overrides] = await Promise.all([
    getPhotos(),
    getActiveSingleOverrides(),
  ])
  const activeOverrides = overrides
    .filter((o) => o.kind === 'photo')
    .map((o) => ({ screenId: o.screenId, screenName: o.screenName }))
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Billeder</h1>
        <p className="text-sm text-muted-foreground">
          Billeder uploadet af gæster. Filtrer, deaktiver, slet eller vis på skærm.
        </p>
      </div>
      <PhotoManager initialPhotos={photos} activeOverrides={activeOverrides} />
    </div>
  )
}
