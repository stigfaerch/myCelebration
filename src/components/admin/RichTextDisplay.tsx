import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'

interface Props {
  content: Record<string, unknown> | null
}

export function RichTextDisplay({ content }: Props) {
  if (!content) return null
  const html = generateHTML(content as Parameters<typeof generateHTML>[0], [StarterKit])
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
