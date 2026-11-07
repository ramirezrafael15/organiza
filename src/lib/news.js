// Avisos de "qué ha cambiado" que tú tienes que ver, sobre todo cuando hace falta que hagas algo.
// Cada aviso sale una sola vez por dispositivo. Para un aviso nuevo: añade una entrada con un id nuevo.
export const NEWS = [
  {
    id: '2026-11-07-proteccion',
    title: 'Tus datos ahora se protegen mejor',
    body: 'Seiri guarda una copia de seguridad diaria en este dispositivo y una copia de tus claves de IA. Si algún día falta algo, entra en Ajustes → Copias de seguridad y restaura.',
    action: null, // si hubiera algo que hacer, aquí iría la instrucción
  },
];
const KEY = 'seiri:news-seen';
const seen = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const pendingNews = () => NEWS.filter((n) => !seen().includes(n.id));
export const markSeen = (id) => { try { localStorage.setItem(KEY, JSON.stringify([...new Set([...seen(), id])])); } catch { /* nada */ } };
