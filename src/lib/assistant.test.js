import { describe, expect, it } from 'vitest';
import { buildPrompt, clip, MAX_CHARS, MAX_TURNS, rateCheck, wantsContext } from './assistant.js';

describe('asistente: prompt y límites', () => {
  it('recorta los mensajes largos', () => { expect(clip('a'.repeat(900)).length).toBe(MAX_CHARS); });
  it('incluye la sección y el mensaje nuevo', () => {
    const p = buildPrompt({ history: [], section: 'Exámenes', text: '¿Qué estudio primero?' });
    expect(p).toContain('Exámenes'); expect(p).toContain('¿Qué estudio primero?');
  });
  it('solo reenvía los últimos mensajes y salta los que dieron error', () => {
    const history = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'ai' : 'user', text: `m${i}` }));
    history.push({ role: 'ai', text: 'ERROR', error: true });
    const p = buildPrompt({ history, section: 'Panel', text: 'hola' });
    expect(p).not.toContain('m0'); expect(p).toContain('m11'); expect(p).not.toContain('ERROR');
    expect((p.match(/^(Usuario|Asistente): m/gm) ?? []).length).toBe(MAX_TURNS);
  });
  it('limita peticiones por ventana de tiempo', () => {
    const now = 1_000_000;
    const full = Array.from({ length: 20 }, (_, i) => now - i * 1000);
    expect(rateCheck(full, now).ok).toBe(false);
    expect(rateCheck(full.slice(0, 5), now).ok).toBe(true);
    expect(rateCheck([now - 11 * 60 * 1000], now).recent).toEqual([]);
  });
  it('mete la agenda en el prompt y entiende cuándo pide otra sección', () => {
    const p = buildPrompt({ history: [], section: 'Panel', text: 'hola', overview: { hoy: '2026-11-13' }, context: { entregas: [1] }, extra: { notas: { total: 2 } } });
    expect(p).toContain('"hoy":"2026-11-13"'); expect(p).toContain('seccion_actual: {"entregas":[1]}'); expect(p).toContain('mas_secciones: {"notas"');
    const ok = ['examenes', 'notas'];
    expect(wantsContext('PEDIR_CONTEXTO: examenes', ok)).toBe('examenes');
    expect(wantsContext('PEDIR_CONTEXTO: loquesea', ok)).toBeNull();
    expect(wantsContext('Claro, tienes examen', ok)).toBeNull();
  });
});
