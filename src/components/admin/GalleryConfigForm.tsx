'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  updateGalleryConfig,
  type GalleryConfig,
  type GalleryConfigFormData,
  type GallerySource,
  type GalleryDisplayType,
} from '@/lib/actions/gallery'

interface Props {
  config: GalleryConfig
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function GalleryConfigForm({ config }: Props) {
  const router = useRouter()
  const [source, setSource] = useState<GallerySource>(config.source)
  const [intervalSeconds, setIntervalSeconds] = useState<number>(config.interval_seconds)
  const [displayType, setDisplayType] = useState<GalleryDisplayType>(config.display_type)
  const [showMemoryText, setShowMemoryText] = useState<boolean>(config.show_memory_text)
  const [filterAfter, setFilterAfter] = useState(toDatetimeLocal(config.filter_after))
  const [filterBefore, setFilterBefore] = useState(toDatetimeLocal(config.filter_before))
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setSource(config.source)
    setIntervalSeconds(config.interval_seconds)
    setDisplayType(config.display_type)
    setShowMemoryText(config.show_memory_text)
    setFilterAfter(toDatetimeLocal(config.filter_after))
    setFilterBefore(toDatetimeLocal(config.filter_before))
  }, [config])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const parsedInterval = Number(intervalSeconds)
    if (!Number.isFinite(parsedInterval) || parsedInterval < 1) {
      setMessage({ kind: 'error', text: 'Skiftetid skal være mindst 1 sekund' })
      return
    }

    const formData: GalleryConfigFormData = {
      source,
      interval_seconds: Math.round(parsedInterval),
      display_type: displayType,
      show_memory_text: showMemoryText,
      filter_after: fromDatetimeLocal(filterAfter),
      filter_before: fromDatetimeLocal(filterBefore),
    }

    startTransition(async () => {
      try {
        await updateGalleryConfig(formData)
        setMessage({ kind: 'success', text: 'Konfiguration gemt' })
        router.refresh()
      } catch (err) {
        setMessage({
          kind: 'error',
          text: err instanceof Error ? err.message : 'Ukendt fejl',
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {message && (
        <p
          className={`text-sm ${
            message.kind === 'success' ? 'text-green-700' : 'text-destructive'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="gallery-source">Indhold</Label>
        <select
          id="gallery-source"
          value={source}
          onChange={(e) => setSource(e.target.value as GallerySource)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          <option value="photos">Kun billeder</option>
          <option value="memories">Kun minder</option>
          <option value="both">Begge</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="gallery-interval">Skiftetid (sekunder)</Label>
        <Input
          id="gallery-interval"
          type="number"
          min={1}
          value={intervalSeconds}
          onChange={(e) => setIntervalSeconds(Number(e.target.value))}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="gallery-display">Visningstype</Label>
        <select
          id="gallery-display"
          value={displayType}
          onChange={(e) => setDisplayType(e.target.value as GalleryDisplayType)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          <option value="single">Enkelt billede</option>
          <option value="quad">4 billeder</option>
          <option value="frames">3 rammer</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="gallery-show-text"
          type="checkbox"
          checked={showMemoryText}
          onChange={(e) => setShowMemoryText(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="gallery-show-text" className="cursor-pointer">
          Vis minde-tekst
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="gallery-filter-after">Vis efter</Label>
          <Input
            id="gallery-filter-after"
            type="datetime-local"
            value={filterAfter}
            onChange={(e) => setFilterAfter(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gallery-filter-before">Vis før</Label>
          <Input
            id="gallery-filter-before"
            type="datetime-local"
            value={filterBefore}
            onChange={(e) => setFilterBefore(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Gemmer…' : 'Gem konfiguration'}
      </Button>
    </form>
  )
}
