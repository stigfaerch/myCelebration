import { RichTextDisplay } from '@/components/admin/RichTextDisplay'

interface Props {
  page: {
    title: string
    content: Record<string, unknown> | null
  }
}

/**
 * Renders a `pages` row as full-screen content for a screen guest.
 * Large centered title above the TipTap-rendered content block on
 * a dark background.
 */
export function ScreenPage({ page }: Props) {
  return (
    <div className="w-screen h-screen overflow-auto bg-slate-950 text-white">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-8 py-12">
        <h1 className="mb-8 text-center text-5xl font-bold tracking-tight">
          {page.title}
        </h1>
        {page.content && (
          <div className="w-full">
            <RichTextDisplay content={page.content} invert />
          </div>
        )}
      </div>
    </div>
  )
}
