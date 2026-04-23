import { headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase/server'
import { GuestLayoutShell } from '@/components/guest/GuestLayoutShell'

// Screen layout — fullscreen, no navigation
function ScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      {children}
    </div>
  )
}

interface Props {
  children: React.ReactNode
  params: Promise<{ uuid: string }>
}

export default async function UuidLayout({ children, params }: Props) {
  const { uuid } = await params

  // Get guest type from middleware headers
  const headersList = await headers()
  const guestType = headersList.get('x-guest-type')
  const guestId = headersList.get('x-guest-id')

  // Fetch guest name for display
  let guestName = ''
  if (guestId) {
    const { data } = await supabaseServer
      .from('guests')
      .select('name')
      .eq('id', guestId)
      .single()
    guestName = (data as { name?: string } | null)?.name ?? ''
  }

  if (guestType === 'screen') {
    return <ScreenLayout>{children}</ScreenLayout>
  }

  return (
    <GuestLayoutShell guestName={guestName} uuid={uuid}>
      {children}
    </GuestLayoutShell>
  )
}
