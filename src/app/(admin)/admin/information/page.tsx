import { getFestInfo, getEvents } from '@/lib/actions/information'
import { getPhotos } from '@/lib/actions/photos'
import { FestDescriptionEditor } from '@/components/admin/FestDescriptionEditor'
import { InvitationUpload } from '@/components/admin/InvitationUpload'
import { EventsManager } from '@/components/admin/EventsManager'
import { ForsidebilledePicker } from '@/components/admin/ForsidebilledePicker'

export default async function InformationPage() {
  const [festInfo, events, photos] = await Promise.all([
    getFestInfo(),
    getEvents(),
    getPhotos(),
  ])

  const forsidebillede =
    (festInfo as { forsidebillede?: { id: string; storage_url: string } | null } | null)
      ?.forsidebillede ?? null

  const pickerPhotos = (photos ?? []).map((p) => ({
    id: p.id,
    storage_url: p.storage_url,
    taken_at: p.taken_at,
  }))

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Information</h1>
        <p className="text-sm text-muted-foreground">Rediger festbeskrivelse, invitation og begivenheder.</p>
      </div>

      {/* Sektion 1 — Festbeskrivelse */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Festbeskrivelse</h2>
          <p className="text-sm text-muted-foreground">Vises på forsiden for deltagerne.</p>
        </div>
        <FestDescriptionEditor
          initialDescription={
            (festInfo?.description as Record<string, unknown> | null) ?? null
          }
        />
      </section>

      {/* Sektion 2 — Forsidebillede */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Forsidebillede</h2>
          <p className="text-sm text-muted-foreground">
            Vises over festbeskrivelsen på gæsternes forside.
          </p>
        </div>
        <ForsidebilledePicker current={forsidebillede} allPhotos={pickerPhotos} />
      </section>

      {/* Sektion 3 — Invitation */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Invitation</h2>
          <p className="text-sm text-muted-foreground">Upload invitation som PDF, PNG eller JPG.</p>
        </div>
        <InvitationUpload currentUrl={(festInfo?.invitation_url as string | null) ?? null} />
      </section>

      {/* Sektion 4 — Begivenheder */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Begivenheder</h2>
          <p className="text-sm text-muted-foreground">Opret og rediger begivenheder med lokationer.</p>
        </div>
        <EventsManager events={events ?? []} />
      </section>
    </div>
  )
}
