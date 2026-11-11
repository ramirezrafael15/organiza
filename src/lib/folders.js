// Carpetas con subcarpetas: cada carpeta puede tener `parentId`. Todo está protegido contra ciclos.
const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'es');

/** Lista plana en orden de árbol: [{ folder, depth }]. Una carpeta cuyo padre no existe cuelga de la raíz. */
export function flatTree(folders) {
  const ids = new Set(folders.map((f) => f.id));
  const kids = new Map();
  for (const f of folders) {
    const p = f.parentId && ids.has(f.parentId) && f.parentId !== f.id ? f.parentId : null;
    kids.set(p, [...(kids.get(p) ?? []), f]);
  }
  const out = []; const seen = new Set();
  const walk = (p, depth) => {
    for (const f of (kids.get(p) ?? []).sort(byName)) {
      if (seen.has(f.id)) continue;
      seen.add(f.id); out.push({ folder: f, depth }); walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const f of folders) if (!seen.has(f.id)) { seen.add(f.id); out.push({ folder: f, depth: 0 }); walk(f.id, 1); } // restos de un ciclo
  return out;
}

/** Ids de la carpeta y de todas las que cuelgan de ella. */
export function withDescendants(folders, id) {
  const out = new Set([id]); let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) if (f.parentId && out.has(f.parentId) && !out.has(f.id)) { out.add(f.id); grew = true; }
  }
  return out;
}

/** «Asignaturas › Bases de Datos» */
export function folderPath(folders, id) {
  const parts = []; let cur = folders.find((f) => f.id === id); const seen = new Set();
  while (cur && !seen.has(cur.id)) { seen.add(cur.id); parts.unshift(cur.name); cur = folders.find((f) => f.id === cur.parentId); }
  return parts.join(' › ');
}

/** Carpetas donde se puede meter `id` (ella misma y sus descendientes no). */
export function validParents(folders, id) {
  const bad = withDescendants(folders, id);
  return flatTree(folders).filter(({ folder }) => !bad.has(folder.id));
}
