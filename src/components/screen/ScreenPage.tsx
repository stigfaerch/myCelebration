import { RichTextDisplay } from '@/components/admin/RichTextDisplay'
import {
  PAGE_MAX_WIDTH_CLASS,
  coercePageMaxWidth,
} from '@/lib/admin/pageMaxWidth'

interface Props {
  page: {
    title: string
    content: Record<string, unknown> | null
    /**
     * Per-page max-width Tailwind suffix (`'2xl'` … `'7xl'`, `'full'`).
     * Stored on the `pages` row; falls back to the default if absent.
     */
    max_width?: string | null
  }
}

/**
 * Renders a `pages` row as full-screen content for a screen guest.
 * Large centered title above the TipTap-rendered content block on a
 * dark background. The page's `max_width` controls how wide the
 * content column may grow on the screen device — useful when admins
 * want a single-column reading layout vs. a wide-screen layout.
 */
export function ScreenPage({ page }: Props) {
  const widthClass = PAGE_MAX_WIDTH_CLASS[coercePageMaxWidth(page.max_width)]
  return (
    <div className="w-screen h-screen overflow-auto bg-slate-950 text-white">
      <div
        className={`mx-auto flex min-h-full ${widthClass} flex-col items-center justify-center px-8 py-12`}
      >
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
