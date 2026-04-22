import Link from 'next/link'
import { getGuests, getSmsTemplate, getGuestUrl } from '@/lib/actions/guests'
import { GuestActions } from '@/components/admin/GuestActions'

const TYPE_LABELS: Record<string, string> = {
  main_person: 'Hovedperson',
  family: 'Familie',
  friend: 'Ven',
  screen: 'Skærm',
}

const TYPE_COLORS: Record<string, string> = {
  main_person: 'bg-purple-100 text-purple-800',
  family: 'bg-blue-100 text-blue-800',
  friend: 'bg-green-100 text-green-800',
  screen: 'bg-gray-100 text-gray-700',
}

const TASK_LABELS: Record<string, string> = {
  none: 'Ingen',
  easy: 'Lette',
  all: 'Alle',
}

export default async function DeltagerePage() {
  const [guests, smsTemplate] = await Promise.all([getGuests(), getSmsTemplate()])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Deltagere</h1>
        <Link
          href="/admin/deltagere/ny"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Tilføj deltager
        </Link>
      </div>

      {guests.length === 0 ? (
        <p className="text-muted-foreground text-sm">Ingen deltagere endnu.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Navn</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Invitation</th>
                <th className="px-4 py-3 text-left font-medium">Opgaver</th>
                <th className="px-4 py-3 text-right font-medium">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{guest.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[guest.type] ?? ''}`}>
                      {TYPE_LABELS[guest.type] ?? guest.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {guest.invitation_accepted ? (
                      <span className="text-green-600 text-xs">&#10003; Accepteret</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Ikke accepteret</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {TASK_LABELS[guest.task_participation] ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <GuestActions
                      guest={guest}
                      guestUrl={getGuestUrl(guest.id)}
                      smsTemplate={smsTemplate}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
