// Bloque "Callout": caja destacada con icono, como en Notion. Se guarda como <div data-type="callout">.
import { Node, mergeAttributes } from '@tiptap/core';

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      emoji: {
        default: '💡',
        parseHTML: (el) => el.getAttribute('data-emoji') || '💡',
        renderHTML: (a) => ({ 'data-emoji': a.emoji }),
      },
    };
  },
  parseHTML() { return [{ tag: 'div[data-type="callout"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0];
  },
  addCommands() {
    return { setCallout: () => ({ commands }) => commands.wrapIn(this.name) };
  },
});
