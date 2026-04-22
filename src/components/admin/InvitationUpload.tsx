'use client'
// NOTE: Requires Supabase Storage bucket 'invitations' to be created manually:
// Supabase Dashboard → Storage → New bucket → name: "invitations", public: true

import { useRef, useState, useTransition } from 'react'
import { supabaseClient } from '@/lib/supabase/client'
import { updateInvitationUrl } from '@/lib/actions/information'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  currentUrl: string | null
}

export function InvitationUpload({ currentUrl }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleUpload(file: File) {
    setError(null)
    const timestamp = Date.now()
    const path = `${timestamp}-${file.name}`

    const { error: uploadError } = await supabaseClient.storage
      .from('invitations')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setError(`Upload fejlede: ${uploadError.message}`)
      return
    }

    const { data: urlData } = supabaseClient.storage
      .from('invitations')
      .getPublicUrl(path)

    startTransition(async () => {
      await updateInvitationUrl(urlData.publicUrl)
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleUpload(file)
  }

  return (
    <div className="space-y-3">
      <Label>Invitation fil</Label>

      {currentUrl && (
        <p className="text-sm text-muted-foreground">
          Nuværende invitation:{' '}
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            Åbn invitation
          </a>
        </p>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {isPending ? 'Uploader...' : currentUrl ? 'Erstat invitation' : 'Upload invitation'}
        </Button>
        <span className="text-xs text-muted-foreground">PDF, PNG eller JPG</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
