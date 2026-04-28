'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImageIcon, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { setForsidebilledePhotoId } from '@/lib/actions/information'

interface PickerPhoto {
  id: string
  storage_url: string
  taken_at: string | null
}

interface Props {
  current: { id: string; storage_url: string } | null
  allPhotos: PickerPhoto[]
}

export function ForsidebilledePicker({ current, allPhotos }: Props) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSelect(photoId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await setForsidebilledePhotoId(photoId)
        setSheetOpen(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  function handleClear() {
    if (!window.confirm('Ryd forsidebilledet? Gæsternes forside vil ikke længere vise et billede.')) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await setForsidebilledePhotoId(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ukendt fejl')
      }
    })
  }

  const triggerLabel = current ? 'Skift billede' : 'Vælg billede'

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {current ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-md border bg-muted max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.storage_url}
              alt="Nuværende forsidebillede"
              className="block aspect-video w-full object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger
                render={
                  <Button type="button" variant="outline" size="sm" disabled={isPending}>
                    <ImageIcon className="size-4" />
                    {triggerLabel}
                  </Button>
                }
              />
              <PhotoPickerSheetContent
                allPhotos={allPhotos}
                isPending={isPending}
                onSelect={handleSelect}
                selectedId={current.id}
              />
            </Sheet>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleClear}
            >
              <Trash2 className="size-4 text-destructive" />
              Ryd
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              render={
                <Button type="button" variant="outline" size="sm" disabled={isPending}>
                  <ImageIcon className="size-4" />
                  {triggerLabel}
                </Button>
              }
            />
            <PhotoPickerSheetContent
              allPhotos={allPhotos}
              isPending={isPending}
              onSelect={handleSelect}
              selectedId={null}
            />
          </Sheet>
          <span className="text-xs text-muted-foreground">Intet forsidebillede valgt.</span>
        </div>
      )}
    </div>
  )
}

interface PickerSheetProps {
  allPhotos: PickerPhoto[]
  isPending: boolean
  onSelect: (photoId: string) => void
  selectedId: string | null
}

function PhotoPickerSheetContent({
  allPhotos,
  isPending,
  onSelect,
  selectedId,
}: PickerSheetProps) {
  return (
    <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Vælg forsidebillede</SheetTitle>
        <SheetDescription>
          Klik på et billede for at vælge det som forsidebillede.
        </SheetDescription>
      </SheetHeader>

      <div className="p-4">
        {allPhotos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ingen billeder uploadet endnu — gæster eller admin kan uploade via /admin/billeder eller fra deres egen forside.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allPhotos.map((photo) => {
              const isSelected = photo.id === selectedId
              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onSelect(photo.id)}
                    aria-pressed={isSelected}
                    className={[
                      'block w-full overflow-hidden rounded-md border bg-muted transition',
                      'hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected ? 'ring-2 ring-primary' : '',
                      isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.storage_url}
                      alt=""
                      className="block aspect-square w-full object-cover"
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </SheetContent>
  )
}
