'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { acceptInvitation } from '@/lib/actions/guest/invitations'
import type { MyInvitation } from '@/lib/actions/guest/invitations'

interface Props {
  initial: MyInvitation | null
}

export function InvitationAccept({ initial }: Props) {
  const router = useRouter()
  const initialAccepted = initial?.accepted ?? false
  const [accepted, setAccepted] = React.useState<boolean>(initialAccepted)
  const [prevInitial, setPrevInitial] = React.useState<boolean>(initialAccepted)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  // Re-sync local state when parent sends fresh data (React 19 pattern —
  // derive during render rather than useEffect to avoid cascading renders).
  if (prevInitial !== initialAccepted) {
    setPrevInitial(initialAccepted)
    setAccepted(initialAccepted)
  }

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      try {
        await acceptInvitation()
        setAccepted(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunne ikke acceptere invitationen')
      }
    })
  }

  const invitationUrl = initial?.invitation_url ?? null

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <h2 className="text-base font-semibold">Invitation</h2>

      {invitationUrl && (
        <p className="text-sm">
          <a
            href={invitationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            Åbn invitation
          </a>
        </p>
      )}

      {accepted ? (
        <p className="flex items-center gap-2 text-sm text-green-700">
          <Check className="size-4" />
          Du har accepteret invitationen
        </p>
      ) : (
        <div className="space-y-2">
          <Button type="button" onClick={handleAccept} disabled={isPending}>
            {isPending ? 'Accepterer…' : 'Acceptér invitation'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </section>
  )
}
