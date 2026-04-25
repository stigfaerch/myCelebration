import { RichTextDisplay } from '@/components/admin/RichTextDisplay'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { getFestInfo } from '@/lib/actions/information'
import { getMyInvitation } from '@/lib/actions/guest/invitations'
import { getChoiceDefinitions, getMyChoiceAnswers } from '@/lib/actions/guest/choices'
import { getMyPerformances } from '@/lib/actions/guest/performances'
import { getMyAssignments } from '@/lib/actions/guest/tasks'
import { getGalleryItems } from '@/lib/actions/guest/gallery'
import { supabaseServer } from '@/lib/supabase/server'
import { InvitationAccept } from '@/components/guest/InvitationAccept'
import { PerformanceManager } from '@/components/guest/PerformanceManager'
import { ChoiceAnswers } from '@/components/guest/ChoiceAnswers'
import { TaskIndicator } from '@/components/guest/TaskIndicator'
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
    // Pages-mode (multi-page cycling) takes priority over the legacy
    // single-override flow. If ANY assignments exist for this screen, we
    // are in pages-mode — even if zero are currently visible (the cycler
    // renders blank-black until the schedule rolls back into a visible
    // window). This is intentional: assigning pages is an explicit
    // operator signal that should not silently fall through to gallery.
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

    const { data: stateRow } = await supabaseServer
      .from('screen_state')
      .select('current_override, override_ref_id')
      .eq('guest_id', guest.id)
      .maybeSingle()

    const override = stateRow as
      | { current_override: string | null; override_ref_id: string | null }
      | null

    let content: React.ReactNode = null

    if (override?.current_override === 'page' && override.override_ref_id) {
      const { data: pageRow } = await supabaseServer
        .from('pages')
        .select('title, content')
        .eq('id', override.override_ref_id)
        .maybeSingle()
      if (pageRow) {
        content = (
          <ScreenPage
            page={pageRow as { title: string; content: Record<string, unknown> | null }}
          />
        )
      }
    } else if (override?.current_override === 'photo' && override.override_ref_id) {
      const { data: photoRow } = await supabaseServer
        .from('photos')
        .select('storage_url')
        .eq('id', override.override_ref_id)
        .maybeSingle()
      if (photoRow) {
        content = <ScreenPhoto photo={photoRow as { storage_url: string }} />
      }
    } else if (override?.current_override === 'memory' && override.override_ref_id) {
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

    // Default: gallery (for override null, 'gallery', 'program', or a
    // reference whose target row has been deleted).
    if (!content) {
      const { config, items } = await getGalleryItems()
      content = <ScreenDefault config={config} items={items} />
    }

    return <ScreenRouter guestId={guest.id}>{content}</ScreenRouter>
  }

  const [invitation, definitions, answers, performances, assignments] = await Promise.all([
    getMyInvitation(),
    getChoiceDefinitions(),
    getMyChoiceAnswers(),
    getMyPerformances(),
    getMyAssignments(),
  ])

  const answersMap: Record<string, string> = Object.fromEntries(
    answers
      .filter((a) => a.value !== null)
      .map((a) => [a.choice_definition_id, a.value as string])
  )

  const description = (festInfo as { description?: Record<string, unknown> | null } | null)
    ?.description

  const invitationAccepted = invitation?.accepted === true

  return (
    <div className="p-4 space-y-6">
      {description && (
        <section>
          <RichTextDisplay content={description} />
        </section>
      )}
      {!invitationAccepted && <InvitationAccept initial={invitation} />}
      <TaskIndicator uuid={uuid} assignments={assignments} />
      <ChoiceAnswers definitions={definitions} initialAnswers={answersMap} />
      <PerformanceManager initialPerformances={performances} />
      {invitationAccepted && <InvitationAccept initial={invitation} />}
    </div>
  )
}
