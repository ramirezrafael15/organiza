// Punto único de acceso a los datos para las pantallas: estado, hooks y acciones.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { todayISO } from '../lib/dates.js';
import { repo } from './repo.js';

export { repo };
export { actions } from './actions.js';

/** Estado completo de la app; el componente se repinta cuando algo cambia. */
export const useAppState = () => useSyncExternalStore(repo.subscribe, repo.getState);

/** Fecha de hoy ('YYYY-MM-DD'); se actualiza sola si pasa la medianoche o vuelves a la app. */
export function useToday() {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const refresh = () => setToday(todayISO());
    const timer = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}
