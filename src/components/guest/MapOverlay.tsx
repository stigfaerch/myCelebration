'use client'

import * as React from 'react'
import { MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface MapOverlayProps {
  /**
   * A pre-validated Google Maps embed URL. Validation MUST happen on the
   * server (see `extractMapsEmbedSrc` in `EventMapDisplay`); this client
   * component intentionally does not re-validate.
   */
  src: string
  eventName: string
}

export function MapOverlay({ src, eventName }: MapOverlayProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button type="button" variant="outline" size="sm" />
        }
      >
        <MapPin />
        Vis kort
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex flex-col gap-0 p-0 data-[side=bottom]:h-[100dvh]"
      >
        <SheetHeader className="border-b">
          <SheetTitle>{`Kort: ${eventName}`}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          {open ? (
            <iframe
              src={src}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
              title={`Kort: ${eventName}`}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
