import { createGuestAction } from '@/lib/actions/guests'
import { GuestForm } from '@/components/admin/GuestForm'
import Link from 'next/link'

export default function NyDeltagere() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/deltagere" className="text-sm text-muted-foreground hover:underline">
          &larr; Tilbage til deltagere
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Ny deltager</h1>
      </div>
      <GuestForm action={createGuestAction} submitLabel="Opret deltager" />
    </div>
  )
}
