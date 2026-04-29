import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { assertNotScreen } from '@/lib/auth/resolveGuest'
import {
  getStaticItemVisibilityMap,
  isStaticItemVisibleNow,
} from '@/lib/actions/staticItemVisibility'
import { Camera } from '@/components/guest/Camera'

export const metadata: Metadata = { title: 'Kamera' }

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function KameraPage({ params }: Props) {
  await assertNotScreen()
  const visibilityMap = await getStaticItemVisibilityMap()
  if (!(await isStaticItemVisibleNow('camera', visibilityMap))) notFound()

  const { uuid } = await params
  return (
    // Fullscreen overlay — covers the layout's BottomMenu
    <div className="fixed inset-0 z-50 bg-black">
      <Camera uuid={uuid} />
    </div>
  )
}
