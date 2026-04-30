import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Monitor } from 'lucide-react'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { getMyPhotos } from '@/lib/actions/guest/photos'
import {
  getStaticItemVisibilityMap,
  isStaticItemVisibleNow,
} from '@/lib/actions/staticItemVisibility'
import { PhotoGrid } from '@/components/guest/PhotoGrid'

export const metadata: Metadata = { title: 'Billeder' }

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function BillederPage({ params }: Props) {
  const { uuid } = await params
  await resolveGuest()
  const visibilityMap = await getStaticItemVisibilityMap()
  if (!(await isStaticItemVisibleNow('photos', visibilityMap))) notFound()

  const photos = await getMyPhotos()
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Mine billeder</h1>
      <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
        <Monitor className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Dine billeder kan blive vist på en skærm i løbet af festen.</p>
      </div>
      <PhotoGrid initialPhotos={photos} uuid={uuid} />
    </div>
  )
}
