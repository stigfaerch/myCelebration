import { RichTextDisplay } from '@/components/admin/RichTextDisplay'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { getFestInfo } from '@/lib/actions/information'
import { getMyInvitation } from '@/lib/actions/guest/invitations'
import { getChoiceDefinitions, getMyChoiceAnswers } from '@/lib/actions/guest/choices'
import { getMyPerformances } from '@/lib/actions/guest/performances'
import { getMyAssignments } from '@/lib/actions/guest/tasks'
import { getMyMemories } from '@/lib/actions/guest/memories'
import { getGalleryItems } from '@/lib/actions/guest/gallery'
import { supabaseServer } from '@/lib/supabase/server'
import { InvitationAccept } from '@/components/guest/InvitationAccept'
import { PerformanceManager } from '@/components/guest/PerformanceManager'
import { ChoiceAnswers } from '@/components/guest/ChoiceAnswers'
import { TaskIndicator } from '@/components/guest/TaskIndicator'
import { MemoryIndicator } from '@/components/guest/MemoryIndicator'
import { ScreenRouter } from '@/components/screen/ScreenRouter'
import { ScreenDefault } from '@/components/screen/ScreenDefault'
import { ScreenPage } from '@/components/screen/ScreenPage'
import { ScreenPhoto } from '@/components/screen/ScreenPhoto'
import { ScreenMemory } from '@/components/screen/ScreenMemory'
import { ScreenPageCycle } from '@/components/screen/ScreenPageCycle'
import {
  hasAnyScreenAssignments,
  getHydratedMixedScreenItems,
  getScreenCycleSettings,
} from '@/lib/actions/screenAssignments'

interface Props {
  params: Promise<{ uuid: string }>
}

type MemoryType = 'funny' | 'solemn' | 'everyday' | 'milestone'

export default async function ForsidePage({ params }: Props) {
  const { uuid } = await params
  const guest = await resolveGuest()
  const festInfo = await getFestInfo()

  // Screen-type guests render based on screen_state override; fall back to gallery.
  if (guest.type === 'screen') {
    // Render priority (Group F):
    //   1. If `current_override IN ('photo', 'memory')` → render single override
    //      (this PAUSES the cycler — explicit admin signal from
    //      PhotoManager / MemoryManager "Vis på skærm").
    //   2. Else if any screen_page_assignments exist → cycler (Phase 8).
    //   3. Else if `current_override` is a legacy single-render kind
    //      (page / gallery / program) → render that single override.
    //   4. Else → gallery default.
    const { data: stateRow } = await supabaseServer
      .from('screen_state')
      .select('current_override, override_ref_id')
      .eq('guest_id', guest.id)
      .maybeSingle()

    const override = stateRow as
      | { current_override: string | null; override_ref_id: string | null }
      | null

    const isPhotoOrMemoryOverride =
      (override?.current_override === 'photo' ||
        override?.current_override === 'memory') &&
      !!override.override_ref_id

    // Priority 1: photo / memory single override beats the cycler.
    if (isPhotoOrMemoryOverride && override) {
      let content: React.ReactNode = null
      if (override.current_override === 'photo' && override.override_ref_id) {
        const { data: photoRow } = await supabaseServer
          .from('photos')
          .select('storage_url')
          .eq('id', override.override_ref_id)
          .maybeSingle()
        if (photoRow) {
          content = <ScreenPhoto photo={photoRow as { storage_url: string }} />
        }
      } else if (
        override.current_override === 'memory' &&
        override.override_ref_id
      ) {
        const { data: memoryRow } = await supabaseServer
          .from('memories')
          .select('title, description, when_date, image_url, type')
          .eq('id', override.override_ref_id)
          .maybeSingle()
        if (memoryRow) {
          content = (
            <ScreenMemory
              memory={
                memoryRow as {
                  title: string
                  description: string | null
                  when_date: string | null
                  image_url: string | null
                  type: MemoryType
                }
              }
            />
          )
        }
      }

      if (content) {
        return <ScreenRouter guestId={guest.id}>{content}</ScreenRouter>
      }
      // Fall through if the referenced row is gone (e.g. photo deleted).
    }

    // Priority 2: Pages-mode (multi-page cycling). If ANY assignments exist
    // for this screen, we are in pages-mode — even if zero are currently
    // visible (the cycler renders blank-black until the schedule rolls back
    // into a visible window). This is intentional: assigning pages is an
    // explicit operator signal that should not silently fall through to
    // gallery.
    if (await hasAnyScreenAssignments(guest.id)) {
      // Polymorphic cycle list (Plan 08-05): fetch visible assignments AND
      // hydrate the per-static-key data payload server-side in one call so
      // the client cycler stays a thin presentational wrapper. Static-item
      // data (gallery items, events, tasks, program rows, guest list) is
      // fetched in parallel inside `getHydratedMixedScreenItems`. Cycle
      // settings come from the guests row.
      const [initialItems, cycleSettings] = await Promise.all([
        getHydratedMixedScreenItems(guest.id),
        getScreenCycleSettings(guest.id),
      ])
      return (
        <ScreenRouter guestId={guest.id}>
          <ScreenPageCycle
            screenGuestId={guest.id}
            initialItems={initialItems}
            initialCycleSeconds={cycleSettings.cycle_seconds}
            initialTransition={cycleSettings.transition}
          />
        </ScreenRouter>
      )
    }

    // Priority 3: legacy single-render override types (page / gallery / program).
    let content: React.ReactNode = null

    if (override?.current_override === 'page' && override.override_ref_id) {
      const { data: pageRow } = await supabaseServer
        .from('pages')
        .select('title, content, max_width')
        .eq('id', override.override_ref_id)
        .maybeSingle()
      if (pageRow) {
        content = (
          <ScreenPage
            page={
              pageRow as {
                title: string
                content: Record<string, unknown> | null
                max_width?: string | null
              }
            }
          />
        )
      }
    }

    // Priority 4: Default gallery (for override null, 'gallery', 'program',
    // or a reference whose target row has been deleted).
    if (!content) {
      const { config, items } = await getGalleryItems()
      content = <ScreenDefault config={config} items={items} />
    }

    return <ScreenRouter guestId={guest.id}>{content}</ScreenRouter>
  }

  const [invitation, definitions, answers, performances, assignments, memories, wishlistsRow] =
    await Promise.all([
      getMyInvitation(),
      getChoiceDefinitions(),
      getMyChoiceAnswers(),
      getMyPerformances(),
      getMyAssignments(),
      getMyMemories(),
      supabaseServer
        .from('guests')
        .select('id, name, wishlist_url')
        .eq('type', 'main_person')
        .not('wishlist_url', 'is', null)
        .order('name'),
    ])

  const wishlists =
    (wishlistsRow.data as Array<{
      id: string
      name: string
      wishlist_url: string | null
    }> | null) ?? []

  const answersMap: Record<string, string> = Object.fromEntries(
    answers
      .filter((a) => a.value !== null)
      .map((a) => [a.choice_definition_id, a.value as string])
  )

  const description = (festInfo as { description?: Record<string, unknown> | null } | null)
    ?.description

  const forsidebillede =
    (festInfo as { forsidebillede?: { storage_url: string } | null } | null)
      ?.forsidebillede ?? null

  const invitationAccepted = invitation?.accepted === true

  return (
    <div className="p-4 space-y-6">
      {forsidebillede && (
        <section className="-mx-4 -mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={forsidebillede.storage_url}
            alt=""
            className="w-full aspect-video object-cover"
          />
        </section>
      )}
      {description && (
        <section>
          <RichTextDisplay content={description} />
        </section>
      )}
      {!invitationAccepted && <InvitationAccept initial={invitation} />}
      <TaskIndicator uuid={uuid} assignments={assignments} />
      <MemoryIndicator uuid={uuid} count={memories.length} />
      <ChoiceAnswers definitions={definitions} initialAnswers={answersMap} />
      <PerformanceManager initialPerformances={performances} />
      {wishlists.length > 0 && (
        <section className="rounded-lg border p-4 space-y-2">
          <h2 className="text-base font-semibold">Ønskesedler</h2>
          <ul className="space-y-1">
            {wishlists.map((w) => (
              <li key={w.id}>
                <a
                  href={w.wishlist_url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {w.name} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {invitationAccepted && <InvitationAccept initial={invitation} />}
    </div>
  )
}
