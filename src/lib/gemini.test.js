// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askGemini, pickModel } from './gemini.js';
import { cleanAiHtml } from './sanitize.js';

describe('pickModel', () => {
  it('elige el flash estable más nuevo', () => {
    const m = (name) => ({ name: `models/${name}`, supportedGenerationMethods: ['generateContent'] });
    expect(pickModel([m('gemini-2.0-flash'), m('gemini-2.5-flash'), m('gemini-2.5-flash-lite'), m('gemini-3-pro'), m('gemini-2.5-flash-preview')])).toBe('gemini-2.5-flash');
    expect(pickModel([])).toBe(null);
  });
});

describe('cleanAiHtml', () => {
  it('quita scripts, atributos y vallas de código', () => {
    const out = cleanAiHtml('```html\n<h2 onclick="x()">Hola</h2><script>alert(1)</script><p style="color:red">a <a href="http://x">b</a></p>\n```');
    expect(out).toBe('<h2>Hola</h2><p>a b</p>');
  });
  it('mantiene tablas y listas', () => {
    expect(cleanAiHtml('<ul><li><strong>a</strong></li></ul><table><tr><td colspan="2">x</td></tr></table>')).toContain('<td colspan="2">x</td>');
  });
});

describe('askGemini', () => {
  beforeEach(() => { localStorage.clear(); });
  it('sin clave falla con mensaje claro', async () => {
    await expect(askGemini({ key: '', prompt: 'x' })).rejects.toThrow(/clave/i);
  });
  it('devuelve el texto y traduce el 429', async () => {
    const ok = (body) => ({ ok: true, status: 200, json: async () => body });
    global.fetch = vi.fn()
      .mockResolvedValueOnce(ok({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }))
      .mockResolvedValueOnce(ok({ candidates: [{ content: { parts: [{ text: '<p>hola</p>' }] } }] }))
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: { message: 'quota' } }) });
    expect(await askGemini({ key: 'k'.repeat(30), prompt: 'x' })).toBe('<p>hola</p>');
    await expect(askGemini({ key: 'k'.repeat(30), prompt: 'x' })).rejects.toThrow(/límite gratuito/);
  });
});
