// Pasar apuntes de y hacia Google Docs, Drive y Notion: importar/exportar archivos y enlaces.
// Todo ocurre en el dispositivo (sin cuentas ni claves), así que es gratis y funciona sin conexión.

/** Qué servicio es un enlace: 'docs' | 'drive' | 'notion' | 'web'. */
export function linkKind(url) {
  let h = '';
  try { h = new URL(url).hostname.toLowerCase(); } catch { return 'web'; }
  if (h === 'docs.google.com') return 'docs';
  if (h === 'drive.google.com') return 'drive';
  if (h === 'notion.so' || h.endsWith('.notion.so') || h.endsWith('.notion.site')) return 'notion';
  return 'web';
}

export const KIND_LABEL = { docs: 'Google Docs', drive: 'Drive', notion: 'Notion', web: 'Enlace' };
export const KIND_ICON = { docs: '📄', drive: '📁', notion: '🗒', web: '🔗' };

/** Limpia lo que pega el usuario: añade https:// y rechaza lo que no es un enlace. null si no vale. */
export function cleanUrl(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes('.')) return null;
    return u.href;
  } catch { return null; }
}

/** Crea el objeto de enlace de un apunte, o null si la dirección no vale. */
export function makeLink(raw, label = '') {
  const url = cleanUrl(raw);
  if (!url) return null;
  const kind = linkKind(url);
  return { url, kind, label: String(label).trim() || KIND_LABEL[kind] };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const baseName = (name) => String(name).replace(/\.[^.]+$/, '');

/** Lee un archivo (.docx, .md, .html, .txt) y devuelve { title, html } listo para el editor. */
export async function fileToNote(file) {
  const name = String(file.name || 'Apunte');
  const ext = (name.split('.').pop() || '').toLowerCase();
  let html;
  if (ext === 'docx') {
    const mammoth = (await import('mammoth/mammoth.browser.js')).default ?? (await import('mammoth/mammoth.browser.js'));
    html = (await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })).value;
  } else if (ext === 'md' || ext === 'markdown') {
    const { marked } = await import('marked');
    html = marked.parse(await file.text(), { gfm: true });
  } else if (ext === 'html' || ext === 'htm') {
    const raw = await file.text();
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed').forEach((n) => n.remove());
    html = doc.body.innerHTML;
  } else if (ext === 'txt' || file.type.startsWith('text/')) {
    html = (await file.text()).split(/\r?\n/).map((l) => `<p>${esc(l)}</p>`).join('');
  } else {
    throw new Error('Formato no admitido. Usa .docx, .md, .html o .txt');
  }
  return { title: baseName(name), html };
}

/** HTML de un apunte → Markdown (para Notion y otros). */
export async function htmlToMarkdown(html) {
  const Turndown = (await import('turndown')).default;
  const td = new Turndown({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
  return td.turndown(html);
}

const safeName = (t) => (String(t || 'apunte').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'apunte');

/** Documento .doc (HTML que abren Word y Google Docs conservando formato). */
export function docFile(title, html) {
  const body = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body><h1>${esc(title)}</h1>${html}</body></html>`;
  return { name: `${safeName(title)}.doc`, type: 'application/msword', text: body };
}
export function htmlFile(title, html) {
  return { name: `${safeName(title)}.html`, type: 'text/html', text: `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body><h1>${esc(title)}</h1>${html}</body></html>` };
}
export async function mdFile(title, html) {
  return { name: `${safeName(title)}.md`, type: 'text/markdown', text: `# ${title}\n\n${await htmlToMarkdown(html)}\n` };
}

/** Descarga (o, en móvil, abre el menú de compartir para mandarlo a Drive/Notion). */
export async function deliver({ name, type, text }) {
  const file = new File([text], name, { type: `${type};charset=utf-8` });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return 'shared'; }
  } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
