import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Details from '@tiptap/extension-details';
import DetailsSummary from '@tiptap/extension-details-summary';
import DetailsContent from '@tiptap/extension-details-content';
import { SlashCommand } from './slash/SlashCommand.js';
import { Callout } from './blocks/Callout.js';
import { Column, Columns } from './blocks/Columns.js';

// Tamaño de letra como atributo de "textStyle" (no viene de serie en Tiptap).
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions: () => ({ types: ['textStyle'] }),
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (a) => (a.fontSize ? { style: `font-size: ${a.fontSize}` } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ chain }) => chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// onPickImage: abre el selector de imágenes del editor (lo usa el bloque "Imagen" del menú "/").
export const editorExtensions = ({ onPickImage } = {}) => [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Typography, Underline, Subscript, Superscript, TextStyle, Color, FontFamily, FontSize,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TaskList, TaskItem.configure({ nested: true }),
  Link.configure({ openOnClick: false, autolink: true }),
  Image.configure({ allowBase64: true }),
  Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
  Placeholder.configure({ placeholder: "Empieza a escribir tus apuntes… (escribe '/' para insertar bloques)" }),
  Details.configure({ persist: true }), DetailsSummary, DetailsContent, Callout, Columns, Column,
  SlashCommand.configure({ onPickImage }),
];
