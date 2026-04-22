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
      <div className="flex gap-1 border-b p-1">
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
