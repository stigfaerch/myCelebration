'use client'
import { useState, useTransition } from 'react'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { updateFestDescription } from '@/lib/actions/information'
import { Button } from '@/components/ui/button'

interface Props {
  initialDescription: Record<string, unknown> | null
}

export function FestDescriptionEditor({ initialDescription }: Props) {
  const [json, setJson] = useState<Record<string, unknown> | null>(initialDescription)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!json) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateFestDescription(json)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  return (
    <div className="space-y-3">
      <RichTextEditor
        value={initialDescription ?? undefined}
        onChange={(updated) => {
          setJson(updated)
          setSaved(false)
        }}
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={isPending || !json}
          onClick={handleSave}
        >
          {isPending ? 'Gemmer...' : 'Gem beskrivelse'}
        </Button>
        {saved && <span className="text-sm text-green-600">Gemt</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  )
}
