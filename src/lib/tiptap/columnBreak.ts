import { Node } from '@tiptap/core'

/**
 * `columnBreak` — a void block-level node used to mark column boundaries
 * inside rich-text content. The renderer (`RichTextDisplay`) splits the
 * top-level document at these nodes and lays the resulting segments out
 * as a CSS grid:
 *
 *   - 0 markers → 1 column (default flow)
 *   - 1 marker  → 2 columns
 *   - 2 markers → 3 columns
 *
 * In the editor the node renders as an `<hr data-column-break>` styled to
 * read clearly as a column boundary (dashed line + label) so admins can
 * see where a split will happen. Persisted in TipTap JSON as
 * `{ type: 'columnBreak' }`.
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columnBreak: {
      /** Insert a column break at the current selection. */
      insertColumnBreak: () => ReturnType
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
        // .column-break-marker is styled in globals.css for the editor
        // surface; the display path slices the doc and discards these
        // nodes so the class never reaches the rendered output.
        class: 'column-break-marker',
      },
    ]
  },

  addCommands() {
    return {
      insertColumnBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    }
  },
})
