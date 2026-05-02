'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { updateShowProgramTypeIcons } from '@/lib/actions/settings'

interface Props {
  initial: boolean
}

export function ProgramTypeIconsToggle({ initial }: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = React.useState(initial)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [confirmation, setConfirmation] = React.useState<string | null>(null)

  function handleToggle(next: boolean) {
    setError(null)
    setConfirmation(null)
    setEnabled(next)
    startTransition(async () => {
      try {
        await updateShowProgramTypeIcons(next)
        setConfirmation('Gemt')
        router.refresh()
      } catch (err) {
        setEnabled(!next)
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={isPending}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <span className="text-sm font-medium">
          {enabled ? 'Ikoner vises' : 'Ikoner skjult'}
        </span>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {confirmation && <p className="text-sm text-green-700">{confirmation}</p>}
    </div>
  )
}
