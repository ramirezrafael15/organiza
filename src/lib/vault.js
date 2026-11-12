// Copia segura de las claves de IA: se cifran EN EL DISPOSITIVO con una contraseña de recuperación que solo sabes tú
// (PBKDF2 + AES-GCM) y solo se sube el texto cifrado. Ni el administrador ni nadie con acceso a la cuenta puede leerlas.
const enc = new TextEncoder();
const b64 = (u8) => btoa(String.fromCharCode(...new Uint8Array(u8)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ITER = 250_000;

async function deriveKey(pass, salt, usage) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

/** keys: { geminiKey, groqKey } → { v, salt, iv, data } (todo en base64) */
export async function encryptKeys(keys, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt, 'encrypt');
  const clean = Object.fromEntries(Object.entries(keys).filter(([, v]) => v));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(clean)));
  return { v: 1, salt: b64(salt), iv: b64(iv), data: b64(data), at: Date.now() };
}

/** Devuelve las claves o lanza si la contraseña no es la correcta. */
export async function decryptKeys(vault, pass) {
  const key = await deriveKey(pass, unb64(vault.salt), 'decrypt');
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(vault.iv) }, key, unb64(vault.data));
  return JSON.parse(new TextDecoder().decode(raw));
}
