import { RichTextDisplay } from '@/components/admin/RichTextDisplay'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { getFestInfo } from '@/lib/actions/information'
import { getMyInvitation } from '@/lib/actions/guest/invitations'
import { getChoiceDefinitions, getMyChoiceAnswers } from '@/lib/actions/guest/choices'
import { getMyPerformances } from '@/lib/actions/guest/performances'
import { getAssignmentCount } from '@/lib/actions/guest/tasks'
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

  const [invitation, definitions, answers, performances, taskCount] = await Promise.all([
    getMyInvitation(),
    getChoiceDefinitions(),
    getMyChoiceAnswers(),
    getMyPerformances(),
    getAssignmentCount(),
  ])

  const answersMap: Record<string, string> = Object.fromEntries(
    answers
      .filter((a) => a.value !== null)
      .map((a) => [a.choice_definition_id, a.value as string])
  )

  const description = (festInfo as { description?: Record<string, unknown> | null } | null)
    ?.description

  return (
    <div className="p-4 space-y-6">
      {description && (
        <section>
          <RichTextDisplay content={description} />
        </section>
      )}
      <InvitationAccept initial={invitation} />
      <TaskIndicator uuid={uuid} count={taskCount} />
      <ChoiceAnswers definitions={definitions} initialAnswers={answersMap} />
      <PerformanceManager initialPerformances={performances} />
    </div>
  )
}
