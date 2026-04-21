import { headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase/server'

// Screen layout — fullscreen, no navigation
function ScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      {children}
    </div>
  )
}

// Guest layout — mobile-first with bottom nav placeholder
function GuestLayout({
  children,
  guestName,
}: {
  children: React.ReactNode
  guestName: string
}) {
  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
      {/* Header */}
      <header className="border-b px-4 py-3 shrink-0">
        <span className="text-sm font-medium">{guestName}</span>
      </header>
      {/* Content */}
      <main className="flex-1 overflow-auto pb-16">
        {children}
      </main>
      {/* Bottom nav placeholder */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] border-t bg-background">
        <div className="flex items-center justify-around py-2">
          <a href="#" className="flex flex-col items-center gap-0.5 p-2 text-xs text-muted-foreground">
            <span className="text-lg">🏠</span>
            <span>Hjem</span>
          </a>
          <a href="#" className="flex flex-col items-center gap-0.5 p-2 text-xs text-muted-foreground">
            <span className="text-lg">📋</span>
            <span>Program</span>
          </a>
          <a href="#" className="flex flex-col items-center gap-0.5 p-2 text-xs text-muted-foreground">
            <span className="text-lg">📷</span>
            <span>Billede</span>
          </a>
          <a href="#" className="flex flex-col items-center gap-0.5 p-2 text-xs text-muted-foreground">
            <span className="text-lg">☰</span>
            <span>Menu</span>
          </a>
        </div>
      </nav>
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
    guestName = data?.name ?? ''
  }

  if (guestType === 'screen') {
    return <ScreenLayout>{children}</ScreenLayout>
  }

  return <GuestLayout guestName={guestName}>{children}</GuestLayout>
}
