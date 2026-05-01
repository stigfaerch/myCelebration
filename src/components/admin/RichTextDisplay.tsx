import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'

import { ColumnBreak, ColumnBlockEnd } from '@/lib/tiptap/columnBreak'

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

const EXTENSIONS = [StarterKit, ColumnBreak, ColumnBlockEnd] as const

/**
 * One rendered region. A `flow` region renders linearly; a `columns`
 * region renders as a CSS grid that collapses to a single column on
 * mobile.
 */
type Region =
  | { kind: 'flow'; nodes: DocNode[] }
  | { kind: 'columns'; columns: DocNode[][] }

const COLUMN_GRID_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
}

/**
 * Walk top-level children and group them according to columnBreak +
 * columnBlockEnd markers. The walker maintains a tiny state machine:
 *
 *   - `flow` mode: nodes accumulate into the current flow region.
 *     A `columnBreak` opens a column block (closes flow region first
 *     if non-empty). A `columnBlockEnd` is meaningless and dropped.
 *
 *   - `columns` mode: nodes accumulate into the current column.
 *     A `columnBreak` starts a new column. A `columnBlockEnd` closes
 *     the block (emits the columns region) and returns to flow mode.
 *
 * On end-of-document any open block is closed implicitly.
 */
function buildRegions(children: DocNode[]): Region[] {
  const regions: Region[] = []
  let mode: 'flow' | 'columns' = 'flow'
  let flow: DocNode[] = []
  let cols: DocNode[][] = []

  const flushFlow = () => {
    if (flow.length === 0) return
    regions.push({ kind: 'flow', nodes: flow })
    flow = []
  }
  const flushColumns = () => {
    // Drop trailing empty columns (a trailing columnBreak right before
    // the end marker would create one).
    while (cols.length > 1 && cols[cols.length - 1].length === 0) cols.pop()
    if (cols.length === 0) return
    regions.push({ kind: 'columns', columns: cols })
    cols = []
  }

  for (const node of children) {
    const t = node?.type
    if (mode === 'flow') {
      if (t === 'columnBreak') {
        flushFlow()
        mode = 'columns'
        cols = [[]]
        continue
      }
      if (t === 'columnBlockEnd') {
        // Stray end marker outside a block — ignore.
        continue
      }
      flow.push(node)
    } else {
      // columns mode
      if (t === 'columnBreak') {
        cols.push([])
        continue
      }
      if (t === 'columnBlockEnd') {
        flushColumns()
        mode = 'flow'
        continue
      }
      cols[cols.length - 1].push(node)
    }
  }

  // EOF: close whatever is open.
  if (mode === 'columns') flushColumns()
  else flushFlow()

  return regions
}

function renderHtmlFromNodes(nodes: DocNode[]): string {
  return generateHTML(
    { type: 'doc', content: nodes } as Parameters<typeof generateHTML>[0],
    EXTENSIONS as unknown as Parameters<typeof generateHTML>[1]
  )
}

export function RichTextDisplay({ content, invert = false }: Props) {
  if (!content) return null

  const doc = content as DocNode
  const children = Array.isArray(doc.content) ? doc.content : []
  const regions = buildRegions(children)

  // Empty doc — render an empty prose div so the caller's layout reserves
  // the same space as a real (but empty) page.
  if (regions.length === 0) {
    const emptyClass = invert
      ? 'prose prose-sm prose-invert max-w-none'
      : 'prose prose-sm max-w-none'
    return <div className={emptyClass} />
  }

  const proseClass = invert
    ? 'prose prose-sm prose-invert max-w-none'
    : 'prose prose-sm max-w-none'

  return (
    <>
      {regions.map((region, idx) => {
        if (region.kind === 'flow') {
          return (
            <div
              key={idx}
              className={proseClass}
              dangerouslySetInnerHTML={{ __html: renderHtmlFromNodes(region.nodes) }}
            />
          )
        }
        const cols = Math.min(region.columns.length, 6)
        const gridCols = COLUMN_GRID_CLASS[cols] ?? COLUMN_GRID_CLASS[2]
        return (
          <div key={idx} className={`grid grid-cols-1 ${gridCols} gap-6 my-4`}>
            {region.columns.map((seg, i) => (
              <div
                key={i}
                className={proseClass}
                dangerouslySetInnerHTML={{ __html: renderHtmlFromNodes(seg) }}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}
