import { describe, it, expect } from 'vitest';
import { encryptKeys, decryptKeys } from './vault.js';

describe('copia segura de claves', () => {
  it('cifra y recupera con la contraseña', async () => {
    const v = await encryptKeys({ geminiKey: 'AIzaSECRETO123', groqKey: '' }, 'mi-contraseña');
    expect(JSON.stringify(v)).not.toContain('AIzaSECRETO123');
    expect(await decryptKeys(v, 'mi-contraseña')).toEqual({ geminiKey: 'AIzaSECRETO123' });
  });
  it('con otra contraseña falla', async () => {
    const v = await encryptKeys({ geminiKey: 'AIzaSECRETO123' }, 'buena');
    await expect(decryptKeys(v, 'mala')).rejects.toThrow();
  });
});
