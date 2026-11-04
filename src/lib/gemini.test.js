// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askGemini, diagnose, pickModel } from './gemini.js';
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
      .mockResolvedValueOnce(ok({ candidates: [{ content: { parts: [{ text: '<p>hola</p>' }] } }] }));
    expect(await askGemini({ key: 'k'.repeat(30), prompt: 'x' })).toBe('<p>hola</p>');
  });
  it('si un modelo está saturado prueba con el siguiente', async () => {
    const ok = (body) => ({ ok: true, status: 200, json: async () => body });
    const m = (name) => ({ name: `models/${name}`, supportedGenerationMethods: ['generateContent'] });
    global.fetch = vi.fn()
      .mockResolvedValueOnce(ok({ models: [m('gemini-3-flash'), m('gemini-2.5-flash'), m('gemini-2.5-flash-lite')] }))
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: { message: 'overloaded' } }) })
      .mockResolvedValueOnce(ok({ candidates: [{ content: { parts: [{ text: 'ok2' }] } }] }));
    expect(await askGemini({ key: 'k'.repeat(30), prompt: 'x' })).toBe('ok2');
    expect(global.fetch.mock.calls[2][0]).toContain('gemini-2.5-flash:generate');
  });
  it('una clave mala no reintenta', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ models: [] }) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'API key not valid' } }) });
    await expect(askGemini({ key: 'k'.repeat(30), prompt: 'x' })).rejects.toThrow(/clave/);
  });
});

describe('diagnose y modelo que funciona', () => {
  beforeEach(() => { localStorage.clear(); });
  it('cuenta qué responde cada modelo y recuerda el bueno', async () => {
    const m = (name) => ({ name: `models/${name}`, supportedGenerationMethods: ['generateContent'] });
    const ok = (body) => ({ ok: true, status: 200, json: async () => body });
    global.fetch = vi.fn()
      .mockResolvedValueOnce(ok({ models: [m('gemini-3-flash'), m('gemini-2.5-flash')] }))
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: { message: 'limit: 0' } }) })
      .mockResolvedValueOnce(ok({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }));
    const d = await diagnose('k'.repeat(30));
    expect(d.results.map((r) => [r.model, r.ok, r.status])).toEqual([['gemini-3-flash', false, 429], ['gemini-2.5-flash', true, 200]]);
    expect(JSON.parse(localStorage.getItem('organiza:gemini-model'))[0]).toBe('gemini-2.5-flash');
  });
});
