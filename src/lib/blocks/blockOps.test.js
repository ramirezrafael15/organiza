// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { editorExtensions } from '../tiptapExt.js';
import { addBlockBelow, deleteBlock, duplicateBlock, moveBlock, turnInto, TURN_INTO } from './blockOps.js';

const make = (html) => new Editor({ extensions: editorExtensions(), content: html });
const first = (ed) => ({ pos: 0, node: ed.state.doc.child(0) });
const second = (ed) => ({ pos: ed.state.doc.child(0).nodeSize, node: ed.state.doc.child(1) });
const texts = (ed) => ed.state.doc.content.content.map((n) => n.textContent);

describe('bloques tipo Notion', () => {
  it('duplica un bloque', () => {
    const ed = make('<p>uno</p><p>dos</p>');
    duplicateBlock(ed, first(ed));
    expect(texts(ed)).toEqual(['uno', 'uno', 'dos']);
  });
  it('borra un bloque', () => {
    const ed = make('<p>uno</p><p>dos</p>');
    deleteBlock(ed, first(ed));
    expect(texts(ed)).toEqual(['dos']);
  });
  it('sube y baja bloques', () => {
    const ed = make('<p>uno</p><p>dos</p><p>tres</p>');
    moveBlock(ed, second(ed), -1);
    expect(texts(ed)).toEqual(['dos', 'uno', 'tres']);
    moveBlock(ed, first(ed), 1);
    expect(texts(ed)).toEqual(['uno', 'dos', 'tres']);
    expect(moveBlock(ed, first(ed), -1)).toBe(false); // no pasa del principio
  });
  it('convierte un párrafo en título y en callout', () => {
    const ed = make('<p>hola</p>');
    turnInto(ed, first(ed), TURN_INTO.find((i) => i.title === 'Título 2'));
    expect(ed.getHTML()).toContain('<h2>hola</h2>');
    turnInto(ed, first(ed), TURN_INTO.find((i) => i.title === 'Callout'));
    expect(ed.getHTML()).toContain('data-type="callout"');
  });
  it('añade un párrafo con "/" debajo', () => {
    const ed = make('<p>uno</p>');
    addBlockBelow(ed, first(ed));
    expect(texts(ed)).toEqual(['uno', '/']);
  });
  it('guarda y recupera callout, desplegable y columnas en HTML', () => {
    const html = '<div data-type="callout" data-emoji="💡"><p>aviso</p></div>'
      + '<div data-type="columns"><div data-type="column"><p>a</p></div><div data-type="column"><p>b</p></div></div>'
      + '<details><summary>titulo</summary><div data-type="detailsContent"><p>dentro</p></div></details>';
    const ed = make(html);
    const out = ed.getHTML();
    expect(out).toContain('data-type="callout"');
    expect(out).toContain('data-type="columns"');
    expect(out).toContain('<summary>titulo</summary>');
    const again = make(out);
    expect(again.getHTML()).toBe(out); // ida y vuelta sin pérdidas
  });
  it('el desplegable sale abierto y con el cursor en el título', () => {
    const ed = make('<p>hola</p>');
    turnInto(ed, first(ed), TURN_INTO.find((i) => i.title === 'Desplegable'));
    expect(ed.getHTML()).toContain('<details open="">');
    expect(ed.state.selection.$from.parent.type.name).toBe('detailsSummary');
  });
  const type = (ed, text) => {
    // escribe como un usuario: pasa por las reglas de entrada (input rules)
    for (const ch of text) {
      const { from, to } = ed.state.selection;
      const handled = ed.view.someProp('handleTextInput', (f) => f(ed.view, from, to, ch));
      if (!handled) ed.view.dispatch(ed.state.tr.insertText(ch, from, to));
    }
  };
  it('"> " crea un desplegable abierto con el cursor en el título', () => {
    const ed = make('<p></p>');
    ed.commands.focus('end');
    type(ed, '> ');
    expect(ed.getHTML()).toContain('<details open="">');
    expect(ed.state.selection.$from.parent.type.name).toBe('detailsSummary');
    type(ed, 'Mi título');
    expect(ed.getHTML()).toContain('<summary>Mi título</summary>');
  });
  it('\'" \' crea una cita y "> " ya no', () => {
    const ed = make('<p></p>');
    ed.commands.focus('end');
    type(ed, '" ');
    expect(ed.getHTML()).toContain('<blockquote>');
  });
  it('las notas antiguas (HTML normal) se siguen leyendo igual', () => {
    const old = '<h1>Tema</h1><p>texto <strong>negrita</strong></p><ul><li><p>a</p></li></ul>';
    expect(make(old).getHTML()).toBe(old);
  });
});
