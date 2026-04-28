'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

interface Props {
  value?: Record<string, unknown> | null  // TipTap JSON
  onChange?: (json: Record<string, unknown>) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder: _placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
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
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
