'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { Columns2, X } from 'lucide-react'

import { ColumnBreak, ColumnBlockEnd } from '@/lib/tiptap/columnBreak'

interface Props {
  value?: Record<string, unknown> | null  // TipTap JSON
  onChange?: (json: Record<string, unknown>) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder: _placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, ColumnBreak, ColumnBlockEnd],
    content: value ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[120px] p-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>)
    },
  })

  useEffect(() => {
    if (editor && value && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex flex-wrap gap-1 border-b p-1">
        <button
          type="button"
          onClick={() => editor?.chain().focus().setParagraph().run()}
          className={`rounded px-2 py-1 text-xs ${editor?.isActive('paragraph') ? 'bg-accent' : 'hover:bg-accent'}`}
          aria-label="Almindelig tekst"
        >
          P
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`rounded px-2 py-1 text-xs font-bold ${editor?.isActive('heading', { level: 1 }) ? 'bg-accent' : 'hover:bg-accent'}`}
          aria-label="Overskrift 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded px-2 py-1 text-xs font-bold ${editor?.isActive('heading', { level: 2 }) ? 'bg-accent' : 'hover:bg-accent'}`}
          aria-label="Overskrift 2"
        >
          H2
        </button>
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-1 text-xs ${editor?.isActive('bold') ? 'bg-accent' : 'hover:bg-accent'}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-1 text-xs italic ${editor?.isActive('italic') ? 'bg-accent' : 'hover:bg-accent'}`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`rounded px-2 py-1 text-xs ${editor?.isActive('bulletList') ? 'bg-accent' : 'hover:bg-accent'}`}
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`rounded px-2 py-1 text-xs ${editor?.isActive('orderedList') ? 'bg-accent' : 'hover:bg-accent'}`}
        >
          1.
        </button>
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => editor?.chain().focus().insertColumnBreak().run()}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent"
          aria-label="Indsæt ny kolonne"
          title="Ny kolonne — første marker åbner blokken, hver efterfølgende starter en ny kolonne. Kollapser til én kolonne på mobil."
        >
          <Columns2 className="h-3.5 w-3.5" />
          Ny kolonne
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().insertColumnBlockEnd().run()}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent"
          aria-label="Slut kolonne-blok"
          title="Slut kolonne-blok — alt herefter vises i normal flow igen."
        >
          <X className="h-3.5 w-3.5" />
          Slut blok
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
