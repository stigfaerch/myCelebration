'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateFontSizes } from '@/lib/actions/settings'
import type { FontSizes } from '@/lib/admin/fontSizes'

interface Props {
  initial: FontSizes
}

export function FontSizeEditor({ initial }: Props) {
  const router = useRouter()
  const [values, setValues] = React.useState<FontSizes>(initial)
  const [saved, setSaved] = React.useState<FontSizes>(initial)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [confirmation, setConfirmation] = React.useState<string | null>(null)

  const dirty =
    values.p !== saved.p || values.h1 !== saved.h1 || values.h2 !== saved.h2

  function setField(key: keyof FontSizes, raw: string) {
    setError(null)
    setConfirmation(null)
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    setValues((prev) => ({ ...prev, [key]: n }))
  }

  function handleSave() {
    setError(null)
    setConfirmation(null)
    startTransition(async () => {
      try {
        await updateFontSizes(values)
        setSaved(values)
        setConfirmation('Gemt')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleReset() {
    setError(null)
    setConfirmation(null)
    setValues(saved)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="font-p">Brødtekst (p / li)</Label>
          <Input
            id="font-p"
            type="number"
            min={10}
            max={96}
            value={values.p}
            onChange={(e) => setField('p', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">px</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="font-h1">Overskrift 1 (h1)</Label>
          <Input
            id="font-h1"
            type="number"
            min={10}
            max={96}
            value={values.h1}
            onChange={(e) => setField('h1', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">px</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="font-h2">Overskrift 2 (h2)</Label>
          <Input
            id="font-h2"
            type="number"
            min={10}
            max={96}
            value={values.h2}
            onChange={(e) => setField('h2', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">px</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {confirmation && <p className="text-sm text-green-700">{confirmation}</p>}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || isPending}>
          Gem skriftstørrelser
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!dirty || isPending}
        >
          Nulstil
        </Button>
      </div>
    </div>
  )
}
