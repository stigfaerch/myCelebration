import { headers } from 'next/headers'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function GuestHomePage({ params }: Props) {
  const { uuid } = await params
  const headersList = await headers()
  const guestType = headersList.get('x-guest-type')

  if (guestType === 'screen') {
    return (
      <div className="w-full h-full flex items-center justify-center text-white">
        <p className="text-2xl">Skærm klar</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-2">Velkommen</h1>
      <p className="text-muted-foreground text-sm">Festens side er under opbygning.</p>
    </div>
  )
}
