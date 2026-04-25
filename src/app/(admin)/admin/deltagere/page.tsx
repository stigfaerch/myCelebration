import Link from 'next/link'
import {
  getGuests,
  getSmsTemplate,
  getGuestAssignmentCounts,
  type Guest,
} from '@/lib/actions/guests'
import { getGuestUrl } from '@/lib/guests/url'
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

const PARTICIPANT_TYPE_ORDER: Record<string, number> = {
  main_person: 0,
  family: 1,
  friend: 2,
}

function compareParticipants(a: Guest, b: Guest): number {
  const ao = PARTICIPANT_TYPE_ORDER[a.type] ?? 99
  const bo = PARTICIPANT_TYPE_ORDER[b.type] ?? 99
  if (ao !== bo) return ao - bo
  return a.name.localeCompare(b.name, 'da')
}

function compareScreens(a: Guest, b: Guest): number {
  return a.name.localeCompare(b.name, 'da')
}

export default async function DeltagerePage() {
  const [guests, smsTemplate, assignmentCounts] = await Promise.all([
    getGuests(),
    getSmsTemplate(),
    getGuestAssignmentCounts(),
  ])

  const participants = guests
    .filter((g) => g.type !== 'screen')
    .sort(compareParticipants)
  const screens = guests.filter((g) => g.type === 'screen').sort(compareScreens)

  return (
    <div className="p-8 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Deltagere</h1>
        <Link
          href="/admin/deltagere/ny"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Tilføj deltager
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">Deltagere</h2>
        {participants.length === 0 ? (
          <p className="text-muted-foreground text-sm">Ingen deltagere endnu.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Navn</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Invitation</th>
                  <th className="px-4 py-3 text-left font-medium">Opgavevalg</th>
                  <th className="px-4 py-3 text-left font-medium">Tildelt</th>
                  <th className="px-4 py-3 text-right font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((guest) => {
                  const count = assignmentCounts[guest.id] ?? 0
                  return (
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
                      <td className="px-4 py-3 text-muted-foreground">
                        {count === 0 ? (
                          <span className="text-xs">Ingen</span>
                        ) : (
                          <span className="text-xs">{count === 1 ? '1 opgave' : `${count} opgaver`}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <GuestActions
                          guest={guest}
                          guestUrl={getGuestUrl(guest.id)}
                          smsTemplate={smsTemplate}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Skærme</h2>
        {screens.length === 0 ? (
          <p className="text-muted-foreground text-sm">Ingen skærme endnu.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Navn</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {screens.map((guest) => (
                  <tr key={guest.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{guest.name}</td>
                    <td className="px-4 py-3">
                      {guest.is_primary_screen ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Primær skærm
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
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
      </section>
    </div>
  )
}
