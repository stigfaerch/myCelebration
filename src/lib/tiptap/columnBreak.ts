import { Node } from '@tiptap/core'

/**
 * Two complementary marker nodes that drive multi-column layout in
 * `RichTextDisplay` without requiring a real columns-block schema.
 *
 *   - `columnBreak`   → insert-column marker. The display walker opens a
 *                       column block at the FIRST `columnBreak` it
 *                       encounters and starts a new column at every
 *                       subsequent `columnBreak` while the block is open.
 *
 *   - `columnBlockEnd` → close-block marker. Closes the active column
 *                       block; everything after it falls back to single
 *                       column flow. If the doc ends without one, the
 *                       block is closed implicitly.
 *
 * This shape lets a doc mix single-column flow with one or more
 * column-block sections of arbitrary column count, e.g.
 *
 *   intro paragraph
 *   [columnBreak]
 *   col 1
 *   [columnBreak]
 *   col 2
 *   [columnBreak]
 *   col 3
 *   [columnBlockEnd]
 *   outro paragraph
 *
 * The downside is that the editor surface still renders each marker
 * as a horizontal divider rather than visually grouping content into
 * columns — that trade-off is intentional.
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columnBreak: {
      /** Insert a column-start marker at the current selection. */
      insertColumnBreak: () => ReturnType
      /** Insert a column-block-end marker at the current selection. */
      insertColumnBlockEnd: () => ReturnType
    }
  }
}

export const ColumnBreak = Node.create({
  name: 'columnBreak',
  group: 'block',
  selectable: true,
  draggable: false,
  atom: true,

  parseHTML() {
    return [{ tag: 'hr[data-column-break]' }]
  },

  renderHTML() {
    return [
      'hr',
      {
        'data-column-break': 'true',
        class: 'column-break-marker column-break-marker--start',
      },
    ]
  },

  addCommands() {
    return {
      insertColumnBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
      // Defined on the same scope so a single namespace covers both nodes.
      insertColumnBlockEnd:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: 'columnBlockEnd' }),
    }
  },
})

export const ColumnBlockEnd = Node.create({
  name: 'columnBlockEnd',
  group: 'block',
  selectable: true,
  draggable: false,
  atom: true,

  parseHTML() {
    return [{ tag: 'hr[data-column-block-end]' }]
  },

  renderHTML() {
    return [
      'hr',
      {
        'data-column-block-end': 'true',
        class: 'column-break-marker column-break-marker--end',
      },
    ]
  },
})
