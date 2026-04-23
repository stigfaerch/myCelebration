import { RichTextDisplay } from '@/components/admin/RichTextDisplay'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { getFestInfo } from '@/lib/actions/information'
import { getMyInvitation } from '@/lib/actions/guest/invitations'
import { getChoiceDefinitions, getMyChoiceAnswers } from '@/lib/actions/guest/choices'
import { getMyPerformances } from '@/lib/actions/guest/performances'
import { getAssignmentCount } from '@/lib/actions/guest/tasks'
import { InvitationAccept } from '@/components/guest/InvitationAccept'
import { PerformanceManager } from '@/components/guest/PerformanceManager'
import { ChoiceAnswers } from '@/components/guest/ChoiceAnswers'
import { TaskIndicator } from '@/components/guest/TaskIndicator'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function ForsidePage({ params }: Props) {
  const { uuid } = await params
  const guest = await resolveGuest()
  const festInfo = await getFestInfo()

  // Screen-type guests see only the festinfo description — no personal data
  if (guest.type === 'screen') {
    const description = (festInfo as { description?: Record<string, unknown> | null } | null)
      ?.description
    return (
      <div className="p-4 space-y-6">
        {description && <RichTextDisplay content={description} />}
      </div>
    )
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
