// Estudio seleccionado en el filtro de arriba. Se recuerda entre sesiones en el dispositivo.
import { useMemo, useSyncExternalStore } from 'react';
import { filterState } from '../lib/filter.js';
import { useAppState } from './index.js';

const KEY = 'organiza:filter';
const listeners = new Set();
let current = 'todo';
try {
  current = localStorage.getItem(KEY) || 'todo';
} catch {
  /* sin almacenamiento: vale 'todo' */
}

export const getFilter = () => current;

export function setFilter(value) {
  current = value;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* ignorar */
  }
  listeners.forEach((fn) => fn());
}

const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));

/** Filtro activo; si el estudio ya no existe, vuelve a 'todo'. */
export function useFilter() {
  const f = useSyncExternalStore(subscribe, getFilter);
  const { programs } = useAppState();
  return f === 'todo' || f === 'otros' || programs.some((p) => p.id === f) ? f : 'todo';
}

/** Igual que useAppState pero ya filtrado por estudios: es lo que usan las pantallas. */
export function useViewState() {
  const state = useAppState();
  const filter = useFilter();
  return useMemo(() => filterState(state, filter), [state, filter]);
}
