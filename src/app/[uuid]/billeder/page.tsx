import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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
      <PhotoGrid initialPhotos={photos} uuid={uuid} />
    </div>
  )
}
