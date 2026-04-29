import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { GuestLayoutShell } from '@/components/guest/GuestLayoutShell'
import { getResolvedNavForGuest } from '@/lib/actions/settings'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function fetchGuestName(uuid: string): Promise<string> {
  if (!UUID_PATTERN.test(uuid)) return ''
  const { data } = await supabaseServer
    .from('guests')
    .select('name')
    .eq('id', uuid)
    .single()
  return (data as { name?: string } | null)?.name ?? ''
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uuid: string }>
}): Promise<Metadata> {
  const { uuid } = await params
  const name = await fetchGuestName(uuid)
  // Sub-page titles ("Program", "Hvor", ...) are slotted into %s by their own
  // exported metadata. The default applies to /{uuid} forsiden where no
  // sub-page title exists.
  return {
    title: name
      ? { template: `%s - ${name}`, default: name }
      : { template: '%s', default: '' },
  }
}

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
  if (!UUID_PATTERN.test(uuid)) notFound()

  // Get guest type from proxy headers
  const headersList = await headers()
  const guestType = headersList.get('x-guest-type')
  const guestId = headersList.get('x-guest-id')

  if (guestType === 'screen') {
    return <ScreenLayout>{children}</ScreenLayout>
  }

  // Fetch guest name + nav config in parallel.
  const [guestNameResult, navItems] = await Promise.all([
    guestId
      ? supabaseServer
          .from('guests')
          .select('name')
          .eq('id', guestId)
          .single()
          .then(({ data }) => (data as { name?: string } | null)?.name ?? '')
      : Promise.resolve(''),
    getResolvedNavForGuest(uuid),
  ])

  return (
    <GuestLayoutShell guestName={guestNameResult} uuid={uuid} navItems={navItems}>
      {children}
    </GuestLayoutShell>
  )
}
