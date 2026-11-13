// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanUrl, docFile, fileToNote, linkKind, makeLink } from './noteIO.js';

describe('enlaces de apuntes', () => {
  it('reconoce Docs, Drive y Notion', () => {
    expect(linkKind('https://docs.google.com/document/d/abc/edit')).toBe('docs');
    expect(linkKind('https://drive.google.com/file/d/abc/view')).toBe('drive');
    expect(linkKind('https://www.notion.so/Mi-pagina-123')).toBe('notion');
    expect(linkKind('https://miweb.notion.site/x')).toBe('notion');
    expect(linkKind('https://ejemplo.com')).toBe('web');
  });
  it('limpia direcciones y rechaza basura', () => {
    expect(cleanUrl('notion.so/abc')).toBe('https://notion.so/abc');
    expect(cleanUrl('  ')).toBeNull();
    expect(cleanUrl('hola')).toBeNull();
    expect(cleanUrl('javascript:alert(1)')).toBeNull();
  });
  it('makeLink pone etiqueta por defecto', () => {
    expect(makeLink('docs.google.com/document/d/1')).toMatchObject({ kind: 'docs', label: 'Google Docs' });
    expect(makeLink('notion.so/x', 'Temario')).toMatchObject({ kind: 'notion', label: 'Temario' });
    expect(makeLink('nada')).toBeNull();
  });
});

describe('importar y exportar', () => {
  it('importa markdown y texto', async () => {
    const md = await fileToNote(new File(['# Hola\n\n**negrita**'], 'Tema 1.md'));
    expect(md.title).toBe('Tema 1');
    expect(md.html).toContain('<h1');
    expect(md.html).toContain('<strong>negrita</strong>');
    const txt = await fileToNote(new File(['a\nb'], 'x.txt'));
    expect(txt.html).toBe('<p>a</p><p>b</p>');
  });
  it('quita scripts del html importado', async () => {
    const r = await fileToNote(new File(['<p>ok</p><script>alert(1)</script>'], 'a.html'));
    expect(r.html).toBe('<p>ok</p>');
  });
  it('rechaza formatos raros', async () => {
    await expect(fileToNote(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).rejects.toThrow();
  });
  it('el .doc lleva el título y el contenido', () => {
    const f = docFile('Tema: 1/2', '<p>x</p>');
    expect(f.name).toBe('Tema 1 2.doc');
    expect(f.text).toContain('<p>x</p>');
  });
});
