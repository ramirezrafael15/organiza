import { describe, it, expect } from 'vitest';
import { heardWake } from './wake.js';

describe('wake', () => {
  it('oye + palabra, sin tildes ni mayúsculas', () => {
    expect(heardWake('Oye Nova, ¿qué tengo hoy?', 'Nova')).toBe(true);
    expect(heardWake('hey NOVA', 'nova')).toBe(true);
    expect(heardWake('oye Siri', 'Nova')).toBe(false);
    expect(heardWake('la nova es una estrella', 'Nova')).toBe(false);
    expect(heardWake('Oye Pepe Grillo', 'pepe grillo')).toBe(true);
    expect(heardWake('oye café', 'Café')).toBe(true);
  });
});
