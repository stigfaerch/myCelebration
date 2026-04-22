'use client'
import { useState } from 'react'
import { createChoiceDefinition, updateChoiceDefinition, deleteChoiceDefinition } from '@/lib/actions/choices'
import type { ChoiceDefinition, ChoiceType } from '@/lib/actions/choices'

const TYPE_LABELS: Record<ChoiceType, string> = {
  binary: 'Ja/Nej',
  multichoice: 'Valgmuligheder',
  text: 'Fritekst',
}

interface ChoiceFormProps {
  defaultValues?: ChoiceDefinition
  onDone: () => void
}

function ChoiceForm({ defaultValues, onDone }: ChoiceFormProps) {
  const [type, setType] = useState<ChoiceType>(defaultValues?.type ?? 'binary')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      if (defaultValues) {
        await updateChoiceDefinition(defaultValues.id, formData)
      } else {
        await createChoiceDefinition(formData)
      }
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Titel *</label>
        <input
          name="title"
          required
          defaultValue={defaultValues?.title ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="F.eks. Glutenallergi"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Type *</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ChoiceType)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {(Object.entries(TYPE_LABELS) as [ChoiceType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      {type === 'multichoice' && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Svarmuligheder</label>
          <textarea
            name="options"
            rows={4}
            defaultValue={defaultValues?.options?.join('\n') ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            placeholder="Én mulighed per linje"
          />
          <p className="text-xs text-muted-foreground">Skriv én svarmulighed per linje</p>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Gemmer...' : 'Gem'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Annuller
        </button>
      </div>
    </form>
  )
}

interface Props {
  initialChoices: ChoiceDefinition[]
}

export function ChoiceManager({ initialChoices }: Props) {
  const [choices, setChoices] = useState(initialChoices)
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(choice: ChoiceDefinition) {
    const responseCount = choice.response_count ?? 0
    const msg = responseCount > 0
      ? `Der er ${responseCount} svar på "${choice.title}". Slet alligevel?`
      : `Slet "${choice.title}"?`
    if (!confirm(msg)) return
    setDeleting(choice.id)
    await deleteChoiceDefinition(choice.id)
    setChoices((prev) => prev.filter((c) => c.id !== choice.id))
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      {choices.length === 0 && !showNew && (
        <p className="text-sm text-muted-foreground">Ingen valg oprettet endnu.</p>
      )}

      {choices.map((choice) => (
        <div key={choice.id} className="rounded-md border p-4">
          {editingId === choice.id ? (
            <ChoiceForm
              defaultValues={choice}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{choice.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {TYPE_LABELS[choice.type]}
                  </span>
                  {(choice.response_count ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {choice.response_count} svar
                    </span>
                  )}
                </div>
                {choice.type === 'multichoice' && choice.options && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {choice.options.map((opt) => (
                      <span key={opt} className="rounded bg-muted px-2 py-0.5 text-xs">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditingId(choice.id)}
                  className="text-xs px-2 py-1 rounded border hover:bg-accent"
                >
                  Rediger
                </button>
                <button
                  onClick={() => handleDelete(choice)}
                  disabled={deleting === choice.id}
                  className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  Slet
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showNew ? (
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium mb-4">Nyt valg</p>
          <ChoiceForm onDone={() => setShowNew(false)} />
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary w-full"
        >
          + Tilføj valg
        </button>
      )}
    </div>
  )
}
