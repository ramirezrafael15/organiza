// Extensión de Tiptap: al escribir "/" (al empezar línea o tras un espacio) abre el menú de bloques.
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { slashItems, filterSlashItems } from './slashItems.js';
import { createSlashMenuRenderer } from './slashMenu.js';

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() { return { onPickImage: null }; },
  addProseMirrorPlugins() {
    const all = slashItems({ onPickImage: this.options.onPickImage });
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        allowSpaces: false,
        command: ({ editor, range, props }) => props.command({ editor, range }),
        items: ({ query }) => filterSlashItems(all, query),
        render: createSlashMenuRenderer,
      }),
    ];
  },
});
