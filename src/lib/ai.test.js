// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askAI } from './ai.js';
import { pickGroqModels } from './groq.js';

const ok = (b) => ({ ok: true, status: 200, json: async () => b });
const fail = (status) => ({ ok: false, status, json: async () => ({ error: { message: 'x' } }) });
const gModels = ok({ models: [{ name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] }] });
const rModels = ok({ data: [{ id: 'whisper-large-v3' }, { id: 'llama-3.1-8b-instant' }, { id: 'llama-3.3-70b-versatile' }] });

describe('pickGroqModels', () => {
  it('quita audio y pone los grandes primero', () => {
    expect(pickGroqModels([{ id: 'whisper-large-v3' }, { id: 'llama-3.1-8b-instant' }, { id: 'llama-3.3-70b-versatile' }])).toEqual(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']);
  });
});

describe('askAI', () => {
  beforeEach(() => { localStorage.clear(); vi.useRealTimers(); });
  it('usa Gemini si responde', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(gModels).mockResolvedValueOnce(ok({ candidates: [{ content: { parts: [{ text: 'de gemini' }] } }] }));
    expect(await askAI({ geminiKey: 'g'.repeat(30), groqKey: 'q'.repeat(30), prompt: 'x' })).toBe('de gemini');
  });
  it('si Gemini falla pasa a Groq con texto', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(gModels)
      .mockResolvedValue(fail(503)); // todas las rondas de Gemini
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('groq.com') && String(url).endsWith('/models')) return rModels;
      if (String(url).includes('groq.com')) return ok({ choices: [{ message: { content: 'de groq' } }] });
      if (String(url).includes('/models?')) return gModels;
      return fail(503);
    });
    expect(await askAI({ geminiKey: 'g'.repeat(30), groqKey: 'q'.repeat(30), prompt: 'x' })).toBe('de groq');
  }, 15000);
  it('con PDF no usa Groq y lo explica', async () => {
    global.fetch = vi.fn().mockImplementation(async (url) => (String(url).includes('/models?') ? gModels : fail(503)));
    await expect(askAI({ geminiKey: 'g'.repeat(30), groqKey: 'q'.repeat(30), prompt: 'x', image: { mimeType: 'application/pdf', data: 'QQ==' } })).rejects.toThrow(/no lee PDF/);
  }, 15000);
  it('solo con clave de Groq funciona con texto', async () => {
    global.fetch = vi.fn().mockImplementation(async (url) => (String(url).endsWith('/models') ? rModels : ok({ choices: [{ message: { content: 'solo groq' } }] })));
    expect(await askAI({ geminiKey: '', groqKey: 'q'.repeat(30), prompt: 'x' })).toBe('solo groq');
  });
});
