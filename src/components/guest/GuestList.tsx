import * as React from 'react'

interface GuestListItem {
  id: string
  name: string
  type: string
  relation: string | null
}

interface GuestListProps {
  guests: GuestListItem[]
}

// Render order on the guest page. Section is omitted entirely when empty.
const SECTIONS = [
  { key: 'main_person', label: 'Hovedperson' },
  { key: 'family', label: 'Familie' },
  { key: 'friend', label: 'Venner' },
] as const

export function GuestList({ guests }: GuestListProps) {
  // Group by type. Page-level query already sorts alphabetically; preserved here.
  const grouped = SECTIONS.map((section) => ({
    ...section,
    guests: guests.filter((g) => g.type === section.key),
  })).filter((section) => section.guests.length > 0)

  if (grouped.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Ingen deltagere endnu</p>
    )
  }

  return (
    <div className="space-y-6">
      {grouped.map((section) => (
        <section key={section.key}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {section.label}
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {section.guests.map((guest) => (
              <li key={guest.id} className="text-sm">
                <span className="font-medium">{guest.name}</span>
                {guest.relation ? (
                  <span className="text-muted-foreground"> ({guest.relation})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
