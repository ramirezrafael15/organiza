// Limpia el HTML que devuelve la IA: solo etiquetas de texto básicas, sin atributos ni scripts.
const ALLOWED = new Set(['H1', 'H2', 'H3', 'P', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'MARK', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'BR', 'HR']);

export function cleanAiHtml(raw) {
  let s = String(raw ?? '').trim().replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  const doc = new DOMParser().parseFromString(`<body>${s}</body>`, 'text/html');
  const walk = (node) => {
    [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 8) return ch.remove();
      if (ch.nodeType !== 1) return;
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(ch.tagName)) return ch.remove();
      walk(ch);
      if (!ALLOWED.has(ch.tagName)) { ch.replaceWith(...ch.childNodes); return; }
      [...ch.attributes].forEach((a) => {
        if (!(['TD', 'TH'].includes(ch.tagName) && ['colspan', 'rowspan'].includes(a.name))) ch.removeAttribute(a.name);
      });
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
