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

const TYPE_LABELS: Record<string, string> = {
  couple: 'Par',
  family: 'Familie',
}

export function GuestList({ guests }: GuestListProps) {
  if (guests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Ingen deltagere endnu</p>
    )
  }

  return (
    <ul className="space-y-2">
      {guests.map((guest) => {
        const badge = TYPE_LABELS[guest.type]
        return (
          <li
            key={guest.id}
            className="rounded-md border p-3 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{guest.name}</p>
              {guest.relation ? (
                <p className="text-sm text-muted-foreground truncate">
                  {guest.relation}
                </p>
              ) : null}
            </div>
            {badge ? (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {badge}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
