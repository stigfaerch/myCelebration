import { assertNotScreen } from '@/lib/auth/resolveGuest'
import { Camera } from '@/components/guest/Camera'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function KameraPage({ params }: Props) {
  await assertNotScreen()
  const { uuid } = await params
  return (
    // Fullscreen overlay — covers the layout's BottomMenu
    <div className="fixed inset-0 z-50 bg-black">
      <Camera uuid={uuid} />
    </div>
  )
}
