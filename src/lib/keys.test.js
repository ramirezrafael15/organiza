// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { passwordProblem } from './password.js';

describe('passwordProblem', () => {
  it('exige 8 caracteres con letras y números', () => {
    expect(passwordProblem('abc123')).toMatch(/8 caracteres/);
    expect(passwordProblem('abcdefgh')).toMatch(/letras y números/);
    expect(passwordProblem('12345678')).toMatch(/letras y números/);
    expect(passwordProblem('Seiri2026ok')).toBe('');
  });
});

describe('claves locales', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });
  it('las pasa de los ajustes al dispositivo y las borra de la nube', async () => {
    const { migrateKeysFromSettings, getKeys } = await import('./keys.js');
    const update = vi.fn();
    migrateKeysFromSettings({ geminiKey: 'AIza123', groqKey: '' }, update);
    expect(getKeys().geminiKey).toBe('AIza123');
    expect(update).toHaveBeenCalledWith({ geminiKey: '' });
    expect(JSON.parse(localStorage.getItem('organiza:keys')).geminiKey).toBe('AIza123');
  });
  it('si no hay claves en los ajustes no toca nada', async () => {
    const { migrateKeysFromSettings } = await import('./keys.js');
    const update = vi.fn();
    migrateKeysFromSettings({}, update);
    expect(update).not.toHaveBeenCalled();
  });
});
