// Columnas tipo Notion: un bloque "columns" con 2 o 3 "column" dentro; cada columna admite cualquier bloque.
import { Node, mergeAttributes } from '@tiptap/core';

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,
  parseHTML() { return [{ tag: 'div[data-type="column"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column' }), 0];
  },
});

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,4}',
  isolating: true,
  defining: true,
  parseHTML() { return [{ tag: 'div[data-type="columns"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns' }), 0];
  },
  addCommands() {
    return {
      insertColumns: (n = 2) => ({ commands }) => commands.insertContent({
        type: this.name,
        content: Array.from({ length: n }, () => ({ type: 'column', content: [{ type: 'paragraph' }] })),
      }),
    };
  },
});
