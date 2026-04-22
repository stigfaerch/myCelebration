'use client'
import { useState } from 'react'
import { updateSmsTemplate } from '@/lib/actions/settings'

const EXAMPLE_NAME = 'Anders Hansen'
const EXAMPLE_URL = 'https://fest.dk/a1b2c3d4-...'

interface Props {
  defaultTemplate: string
}

export function SmsTemplateEditor({ defaultTemplate }: Props) {
  const [template, setTemplate] = useState(defaultTemplate)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const preview = template
    .replace('{navn}', EXAMPLE_NAME)
    .replace('{url}', EXAMPLE_URL)

  async function handleSave() {
    setSaving(true)
    try {
      await updateSmsTemplate(template)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Skabelon</label>
        <textarea
          rows={4}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="rounded-md bg-muted p-3 text-sm">
        <p className="text-xs text-muted-foreground font-medium mb-1">Forhåndsvisning</p>
        <p className="whitespace-pre-wrap">{preview}</p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saved ? '✓ Gemt' : saving ? 'Gemmer...' : 'Gem skabelon'}
      </button>
    </div>
  )
}
