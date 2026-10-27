// Tipos de evento, sus iconos y sus colores.
// Los colores por defecto se pueden cambiar en Ajustes -> Colores (ver App.jsx).
export const KINDS = {
  clase: { label: 'Clase', color: 'var(--k-clase)', icon: 'grades' },
  examen: { label: 'Examen', color: 'var(--k-examen)', icon: 'exam' },
  entrega: { label: 'Entrega', color: 'var(--k-entrega)', icon: 'flag' },
  laboral: { label: 'Trabajo', color: 'var(--k-laboral)', icon: 'tasks' },
  personal: { label: 'Personal', color: 'var(--k-personal)', icon: 'home' },
};

// Colores por defecto de cada tipo (mismos valores que --k-* en styles/index.css).
// Evitan verde/amarillo/naranja/rojo, que se reservan para el semáforo de urgencia.
export const DEFAULT_KIND_COLORS = {
  clase: '#2563eb',
  examen: '#9333ea',
  entrega: '#0d9488',
  laboral: '#db2777',
  personal: '#78716c',
};

// Tipos que se pueden elegir al crear una clase del horario o un evento suelto.
export const SCHEDULE_KINDS = ['clase', 'laboral', 'personal'];
export const EVENT_KINDS = ['personal', 'laboral', 'clase'];

export const TASK_STATUS = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  entregado: 'Entregado',
};

// Paleta para elegir colores (asignaturas, estudios, tipos). Tonos bien separados entre sí.
export const PALETTE = [
  '#2563eb', '#0ea5e9', '#0d9488', '#16a34a', '#65a30d', '#ca8a04', '#ea580c',
  '#dc2626', '#db2777', '#c026d3', '#9333ea', '#4f46e5', '#78716c', '#475569',
];
export const SUBJECT_COLORS = PALETTE;
