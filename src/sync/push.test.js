import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setup = ({ permission = 'granted', existing = null, off = false } = {}) => {
  const store = off ? { 'seiri:push-off': '1' } : {};
  const sub = { toJSON: () => ({ endpoint: 'https://push/x' }) };
  const pm = { getSubscription: vi.fn(async () => existing), subscribe: vi.fn(async () => sub) };
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }), PushManager: function PushManager() {}, Notification: {} });
  vi.stubGlobal('navigator', { userAgent: 'x', platform: 'Win', maxTouchPoints: 0, serviceWorker: { ready: Promise.resolve({ pushManager: pm }) } });
  vi.stubGlobal('PushManager', function PushManager() {});
  vi.stubGlobal('Notification', { permission });
  vi.stubGlobal('localStorage', { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } });
  return { pm, fb: { savePushSubscription: vi.fn(async () => {}) } };
};

describe('ensurePush (notificaciones siempre activas)', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('si el sistema perdió la suscripción, la recrea y la registra', async () => {
    const { pm, fb } = setup({ existing: null });
    const { ensurePush } = await import('./push.js');
    expect(await ensurePush('u1', fb)).toBe('ok');
    expect(pm.subscribe).toHaveBeenCalled();
    expect(fb.savePushSubscription).toHaveBeenCalledTimes(1);
  });
  it('si ya existe, no crea otra pero la vuelve a registrar (por si el servidor la borró)', async () => {
    const { pm, fb } = setup({ existing: { toJSON: () => ({ endpoint: 'https://push/y' }) } });
    const { ensurePush } = await import('./push.js');
    expect(await ensurePush('u1', fb)).toBe('ok');
    expect(pm.subscribe).not.toHaveBeenCalled();
    expect(fb.savePushSubscription).toHaveBeenCalledTimes(1);
  });
  it('si las desactivaste tú, no las toca', async () => {
    const { fb } = setup({ off: true });
    const { ensurePush } = await import('./push.js');
    expect(await ensurePush('u1', fb)).toBe('off');
    expect(fb.savePushSubscription).not.toHaveBeenCalled();
  });
  it('sin permiso concedido no pide nada ni molesta', async () => {
    const { pm, fb } = setup({ permission: 'default' });
    const { ensurePush } = await import('./push.js');
    expect(await ensurePush('u1', fb)).toBe('no-permission');
    expect(pm.subscribe).not.toHaveBeenCalled();
  });
});
