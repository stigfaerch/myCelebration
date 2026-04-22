'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Copy, MessageSquare, CheckCircle, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteGuestAction, acceptInvitationAction } from '@/lib/actions/guests'
import type { Guest } from '@/lib/actions/guests'

interface Props {
  guest: Guest
  guestUrl: string
  smsTemplate: string
}

export function GuestActions({ guest, guestUrl, smsTemplate }: Props) {
  const [copying, setCopying] = useState(false)
  const router = useRouter()

  function buildSmsBody(): string {
    return smsTemplate
      .replace('{navn}', guest.name)
      .replace('{url}', guestUrl)
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(guestUrl)
      setCopying(true)
      setTimeout(() => setCopying(false), 2000)
    } catch {
      // Fallback: clipboard API not available
    }
  }

  function handleSms() {
    window.location.href = `sms:?body=${encodeURIComponent(buildSmsBody())}`
  }

  async function handleDelete() {
    if (!confirm(`Slet ${guest.name}? Dette kan ikke fortrydes.`)) return
    await deleteGuestAction(guest.id)
  }

  async function handleAccept() {
    await acceptInvitationAction(guest.id)
  }

  function handleEdit() {
    router.push(`/admin/deltagere/${guest.id}/rediger`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center rounded-md p-1 hover:bg-accent"
        aria-label="Handlinger"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyUrl}>
          <Copy className="mr-2 h-4 w-4" />
          {copying ? 'Kopieret!' : 'Kopier UUID-URL'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSms}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Opret SMS
        </DropdownMenuItem>
        {!guest.invitation_accepted && (
          <DropdownMenuItem onClick={handleAccept}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Acceptér invitation
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Rediger
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Slet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
