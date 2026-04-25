import { getGuest, updateGuestAction, deleteGuestAction } from '@/lib/actions/guests'
import { GuestForm } from '@/components/admin/GuestForm'
import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RedigerDeltager({ params }: Props) {
  const { id } = await params
  const guest = await getGuest(id)

  async function updateAction(formData: FormData) {
    'use server'
    await updateGuestAction(id, formData)
  }

  async function deleteAction() {
    'use server'
    await deleteGuestAction(id)
    redirect('/admin/deltagere')
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/deltagere" className="text-sm text-muted-foreground hover:underline">
          &larr; Tilbage til deltagere
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Rediger: {guest.name}</h1>
      </div>

      <GuestForm
        defaultValues={guest}
        action={updateAction}
        submitLabel="Gem ændringer"
      />

      <div className="mt-8 pt-8 border-t">
        <form action={deleteAction}>
          <ConfirmSubmitButton
            confirmMessage={`Slet ${guest.name}? Dette kan ikke fortrydes.`}
            className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            Slet deltager
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  )
}
