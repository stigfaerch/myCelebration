import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'

import { ColumnBreak } from '@/lib/tiptap/columnBreak'

interface Props {
  content: Record<string, unknown> | null
  /**
   * Render with the @tailwindcss/typography `prose-invert` palette so text
   * reads on a dark background. Used by the screen renderers (ScreenPage,
   * ScreenPageCycle) which sit on `bg-slate-950`. Without this flag the
   * inner prose div would re-establish the default (dark) color and the
   * ancestor's `prose-invert` would lose against it.
   */
  invert?: boolean
}

interface DocNode {
  type?: string
  content?: DocNode[]
  [k: string]: unknown
}

const EXTENSIONS = [StarterKit, ColumnBreak] as const

const COLUMN_GRID_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
}

function renderSegment(
  nodes: DocNode[],
  key: number,
  invert: boolean
): React.ReactElement {
  const html = generateHTML(
    { type: 'doc', content: nodes } as Parameters<typeof generateHTML>[0],
    EXTENSIONS as unknown as Parameters<typeof generateHTML>[1]
  )
  const className = invert
    ? 'prose prose-sm prose-invert max-w-none'
    : 'prose prose-sm max-w-none'
  return (
    <div
      key={key}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function RichTextDisplay({ content, invert = false }: Props) {
  if (!content) return null

  const doc = content as DocNode
  const children = Array.isArray(doc.content) ? doc.content : []

  // Split top-level children at every columnBreak node. The break nodes
  // themselves are discarded — they are markers, not content.
  const segments: DocNode[][] = [[]]
  for (const node of children) {
    if (node?.type === 'columnBreak') {
      segments.push([])
      continue
    }
    segments[segments.length - 1].push(node)
  }

  // Drop empty leading/trailing segments so a stray break at the doc edges
  // doesn't open an empty column.
  while (segments.length > 1 && segments[0].length === 0) segments.shift()
  while (segments.length > 1 && segments[segments.length - 1].length === 0)
    segments.pop()

  // Single column — render the (column-break-stripped) content without
  // a grid wrapper. We must pass the cleaned segment, not the original
  // children: a doc containing only column-break nodes would otherwise
  // hit `generateHTML` with the unknown-output node and throw.
  if (segments.length <= 1) {
    return renderSegment(segments[0] ?? [], 0, invert)
  }

  const cols = Math.min(segments.length, 4)
  const gridCols = COLUMN_GRID_CLASS[cols] ?? COLUMN_GRID_CLASS[2]

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
      {segments.map((seg, i) => renderSegment(seg, i, invert))}
    </div>
  )
}
