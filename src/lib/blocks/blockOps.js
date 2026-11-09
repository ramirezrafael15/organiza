// Operaciones sobre un bloque concreto ({ pos, node }): duplicar, borrar, mover, convertir y "+".
// Todas comprueban que el bloque sigue en su sitio antes de tocar nada.
import { TextSelection } from '@tiptap/pm/state';
import { slashItems } from '../slash/slashItems.js';

const live = (editor, { pos, node }) => {
  const n = editor.state.doc.nodeAt(pos);
  return n && n.type === node.type ? n : null;
};

export function duplicateBlock(editor, target) {
  const n = live(editor, target);
  if (!n) return false;
  return editor.chain().insertContentAt(target.pos + n.nodeSize, n.toJSON()).run();
}

export function deleteBlock(editor, target) {
  const n = live(editor, target);
  if (!n) return false;
  const only = editor.state.doc.resolve(target.pos).parent.childCount === 1;
  // Si es el único bloque de su contenedor, lo dejamos vacío en vez de romper el documento.
  if (only && editor.state.doc.resolve(target.pos).depth === 0) {
    return editor.chain().setTextSelection(target.pos + 1).clearNodes().deleteSelection().run();
  }
  return editor.chain().deleteRange({ from: target.pos, to: target.pos + n.nodeSize }).run();
}

/** dir = -1 sube, +1 baja (entre hermanos del mismo contenedor). */
export function moveBlock(editor, target, dir) {
  const n = live(editor, target);
  if (!n) return false;
  const $pos = editor.state.doc.resolve(target.pos);
  const parent = $pos.parent;
  const i = $pos.index();
  const j = i + dir;
  if (j < 0 || j >= parent.childCount) return false;
  const { tr } = editor.state;
  const sib = parent.child(j);
  if (dir < 0) {
    const at = target.pos - sib.nodeSize;
    tr.delete(target.pos, target.pos + n.nodeSize).insert(at, n);
    tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1)));
  } else {
    const at = target.pos + sib.nodeSize;
    tr.insert(target.pos + n.nodeSize + sib.nodeSize, n).delete(target.pos, target.pos + n.nodeSize);
    tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1)));
  }
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

/** Bloque de primer nivel donde está el cursor (para los botones de mover del móvil). */
export function topBlockAtCursor(editor) {
  const { $from } = editor.state.selection;
  if ($from.depth < 1) return null;
  return { pos: $from.before(1), node: $from.node(1) };
}

/** Inserta un párrafo vacío debajo del bloque con "/" para abrir el menú de bloques. */
export function addBlockBelow(editor, target) {
  const n = live(editor, target);
  if (!n) return false;
  const at = target.pos + n.nodeSize;
  return editor.chain()
    .insertContentAt(at, { type: 'paragraph', content: [{ type: 'text', text: '/' }] })
    .focus(at + 2)
    .run();
}

export const TURN_INTO = slashItems().filter((i) => i.turn);

/** Convierte el bloque en otro tipo (texto, título, lista, cita…). */
export function turnInto(editor, target, item) {
  const n = live(editor, target);
  if (!n) return false;
  const at = target.pos + 1;
  editor.chain().setTextSelection(at).run();
  return item.command({ editor, range: { from: at, to: at } });
}
