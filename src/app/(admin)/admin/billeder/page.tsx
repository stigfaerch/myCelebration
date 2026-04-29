import { getPhotos } from '@/lib/actions/photos'
import { getActiveSingleOverrides, getScreenGuests } from '@/lib/actions/screen'
import { PhotoManager } from '@/components/admin/PhotoManager'

export default async function BillederPage() {
  const [photos, overrides, screenGuests] = await Promise.all([
    getPhotos(),
    getActiveSingleOverrides(),
    getScreenGuests(),
  ])
  // Photo-kind overrides feed both the top-level "Tilbage til skærm-rotation"
  // banner and the per-row Monitor toggle (matched by `overrideRefId`).
  const activeOverrides = overrides
    .filter((o) => o.kind === 'photo')
    .map((o) => ({
      screenId: o.screenId,
      screenName: o.screenName,
      overrideRefId: o.overrideRefId,
    }))
  // The per-row toggle needs the minimum ScreenInfo shape (id, name, primary).
  const screens = screenGuests.map((g) => ({
    id: g.id,
    name: g.name,
    is_primary_screen: g.is_primary_screen,
  }))
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Billeder</h1>
        <p className="text-sm text-muted-foreground">
          Billeder uploadet af gæster. Filtrer, deaktiver, slet eller vis på skærm.
        </p>
      </div>
      <PhotoManager
        initialPhotos={photos}
        activeOverrides={activeOverrides}
        screens={screens}
      />
    </div>
  )
}
