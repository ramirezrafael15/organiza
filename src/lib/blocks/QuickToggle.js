// Atajos de escritura como en Notion: "> " + espacio = desplegable, \" + espacio = cita.
import { Extension, InputRule, wrappingInputRule } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import { openDetailsCommand } from '../slash/slashItems.js';

/** Cita (sin el "> " de serie, que ahora es del desplegable). Typography convierte " en “, por eso se aceptan los dos. */
export const QuoteBlock = Blockquote.extend({
  addInputRules() {
    return [wrappingInputRule({ find: /^\s*["“]\s$/, type: this.type })];
  },
});

export const QuickToggle = Extension.create({
  name: 'quickToggle',
  addInputRules() {
    return [
      new InputRule({
        find: /^>\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).setDetails().command(openDetailsCommand).run();
        },
      }),
    ];
  },
});
