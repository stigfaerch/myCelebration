'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload } from 'lucide-react'
import { uploadInvitation } from '@/lib/actions/information'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  currentUrl: string | null
}

export function InvitationUpload({ currentUrl }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUpload(file: File) {
    setError(null)
    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      try {
        await uploadInvitation(formData)
      } catch (err) {
        setError(`Upload fejlede: ${err instanceof Error ? err.message : 'Ukendt fejl'}`)
      }
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
          <Upload className="size-4" />
          {isPending
            ? 'Uploader...'
            : currentUrl
              ? 'Skift PDF eller billede'
              : 'Upload PDF eller billede'}
        </Button>
        <span className="text-xs text-muted-foreground">PDF, PNG eller JPG</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
