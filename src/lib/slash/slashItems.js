import { TextSelection } from '@tiptap/pm/state';

// Catálogo de bloques del menú "/". Para añadir uno nuevo basta con añadir un objeto aquí.
// Cada comando primero borra el "/texto" que escribió el usuario y luego transforma el bloque.
const base = (editor, range) => editor.chain().focus().deleteRange(range);

/** Comando encadenable: deja el desplegable abierto y el cursor en su título, para escribirlo directamente. */
export const openDetailsCommand = ({ state, tr, dispatch }) => {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'details') {
      const pos = $from.before(d);
      tr.setNodeMarkup(pos, undefined, { ...$from.node(d).attrs, open: true });
      tr.setSelection(TextSelection.create(tr.doc, pos + 2)); // dentro del título (summary)
      if (dispatch) dispatch(tr);
      return true;
    }
  }
  return false;
};
export const openDetailsAtCursor = (editor) => editor.commands.command(openDetailsCommand);

export const slashItems = ({ onPickImage } = {}) => [
  { title: 'Texto', turn: true, description: 'Párrafo normal', icon: 'T', keywords: ['p', 'parrafo', 'texto'],
    command: ({ editor, range }) => base(editor, range).setParagraph().run() },
  { title: 'Título 1', turn: true, description: 'Cabecera grande', icon: 'H1', keywords: ['h1', 'titulo', 'cabecera'],
    command: ({ editor, range }) => base(editor, range).setHeading({ level: 1 }).run() },
  { title: 'Título 2', turn: true, description: 'Cabecera mediana', icon: 'H2', keywords: ['h2', 'titulo', 'cabecera'],
    command: ({ editor, range }) => base(editor, range).setHeading({ level: 2 }).run() },
  { title: 'Título 3', turn: true, description: 'Cabecera pequeña', icon: 'H3', keywords: ['h3', 'titulo', 'cabecera'],
    command: ({ editor, range }) => base(editor, range).setHeading({ level: 3 }).run() },
  { title: 'Lista con viñetas', turn: true, description: 'Lista simple', icon: '•', keywords: ['ul', 'lista', 'vinetas'],
    command: ({ editor, range }) => base(editor, range).toggleBulletList().run() },
  { title: 'Lista numerada', turn: true, description: 'Lista ordenada 1, 2, 3…', icon: '1.', keywords: ['ol', 'lista', 'numerada'],
    command: ({ editor, range }) => base(editor, range).toggleOrderedList().run() },
  { title: 'Lista de tareas', turn: true, description: 'Con casillas marcables', icon: '☑', keywords: ['todo', 'tareas', 'checklist'],
    command: ({ editor, range }) => base(editor, range).toggleTaskList().run() },
  { title: 'Tabla', description: '3 × 3 con cabecera', icon: '▦', keywords: ['table', 'tabla'],
    command: ({ editor, range }) => base(editor, range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: 'Desplegable', turn: true, description: 'Contenido que se abre y se cierra', icon: '▸', keywords: ['toggle', 'desplegable', 'acordeon'],
    command: ({ editor, range }) => { base(editor, range).setDetails().run(); openDetailsAtCursor(editor); } },
  { title: 'Callout', turn: true, description: 'Caja destacada con icono', icon: '💡', keywords: ['callout', 'aviso', 'nota', 'destacado'],
    command: ({ editor, range }) => base(editor, range).setCallout().run() },
  { title: '2 columnas', description: 'Contenido en paralelo', icon: '▥', keywords: ['columnas', 'columns', '2'],
    command: ({ editor, range }) => base(editor, range).insertColumns(2).run() },
  { title: '3 columnas', description: 'Contenido en paralelo', icon: '▥▥', keywords: ['columnas', 'columns', '3'],
    command: ({ editor, range }) => base(editor, range).insertColumns(3).run() },
  { title: 'Cita', turn: true, description: 'Texto destacado', icon: '❝', keywords: ['quote', 'cita'],
    command: ({ editor, range }) => base(editor, range).toggleBlockquote().run() },
  { title: 'Código', turn: true, description: 'Bloque de código', icon: '</>', keywords: ['code', 'codigo'],
    command: ({ editor, range }) => base(editor, range).toggleCodeBlock().run() },
  { title: 'Separador', description: 'Línea horizontal', icon: '―', keywords: ['hr', 'linea', 'separador'],
    command: ({ editor, range }) => base(editor, range).setHorizontalRule().run() },
  { title: 'Imagen', description: 'Desde tu dispositivo', icon: '🖼', keywords: ['image', 'imagen', 'foto'],
    command: ({ editor, range }) => { base(editor, range).run(); onPickImage?.(); } },
];

/** Filtra por título o palabras clave según lo escrito tras "/". */
export function filterSlashItems(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) => i.title.toLowerCase().includes(q) || i.keywords.some((k) => k.includes(q)));
}
