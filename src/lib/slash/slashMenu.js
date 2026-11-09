// Menú flotante del "/" en JS puro (lo usa @tiptap/suggestion: onStart → onUpdate → onKeyDown → onExit).
export function createSlashMenuRenderer() {
  let el = null;
  let items = [];
  let selected = 0;
  let run = null;

  const draw = () => {
    el.innerHTML = '';
    if (!items.length) { el.innerHTML = '<div class="slash-empty">Sin resultados</div>'; return; }
    items.forEach((item, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'slash-item' + (i === selected ? ' is-selected' : '');
      const icon = document.createElement('span');
      icon.className = 'slash-icon'; icon.textContent = item.icon;
      const txt = document.createElement('span');
      const b = document.createElement('strong'); b.textContent = item.title;
      const s = document.createElement('small'); s.textContent = item.description;
      txt.append(b, s);
      row.append(icon, txt);
      // mousedown (no click) para no quitarle el foco al editor
      row.addEventListener('mousedown', (e) => { e.preventDefault(); run(item); });
      el.appendChild(row);
    });
    el.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' });
  };

  const place = (props) => {
    const r = props.clientRect?.();
    if (!r) return;
    const h = el.offsetHeight || 300;
    const below = r.bottom + 6 + h <= window.innerHeight;
    el.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 296))}px`;
    el.style.top = `${below ? r.bottom + 6 : Math.max(8, r.top - h - 6)}px`;
  };

  const sync = (props) => {
    items = props.items;
    run = (item) => props.command(item);
    if (selected >= items.length) selected = 0;
    draw();
    place(props);
  };

  return {
    onStart(props) {
      el = document.createElement('div');
      el.className = 'slash-menu';
      document.body.appendChild(el);
      selected = 0;
      sync(props);
    },
    onUpdate(props) { selected = 0; sync(props); },
    onKeyDown({ event }) {
      const n = Math.max(items.length, 1);
      if (event.key === 'ArrowDown') { selected = (selected + 1) % n; draw(); return true; }
      if (event.key === 'ArrowUp') { selected = (selected - 1 + n) % n; draw(); return true; }
      if (event.key === 'Enter') { if (items[selected]) run(items[selected]); return true; }
      return false; // Escape lo gestiona Suggestion y llama a onExit
    },
    onExit() { el?.remove(); el = null; },
  };
}
