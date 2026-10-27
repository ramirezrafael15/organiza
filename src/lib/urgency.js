// Niveles de urgencia: 0 baja (verde) · 1 media (amarillo) · 2 alta (naranja) · 3 crítica (rojo)
import { daysUntil, todayISO } from './dates.js';

export const URGENCY = [
  { level: 0, key: 'baja', label: 'Baja', color: 'var(--u-0)' },
  { level: 1, key: 'media', label: 'Media', color: 'var(--u-1)' },
  { level: 2, key: 'alta', label: 'Alta', color: 'var(--u-2)' },
  { level: 3, key: 'critica', label: 'Crítica', color: 'var(--u-3)' },
];

/**
 * Urgencia automática según los días que quedan y lo avanzado que vas.
 *  - 0-1 días  -> crítica      - 2-3 días -> alta
 *  - 4-7 días  -> media        - más      -> baja
 *  Si faltan 7 días o menos y llevas menos del 50 %, sube un nivel (vas justo).
 *  Si llevas 80 % o más y aún quedan 2+ días, baja un nivel (vas sobrado).
 */
export function autoLevel({ daysLeft, progress = 0 }) {
  let level = daysLeft <= 1 ? 3 : daysLeft <= 3 ? 2 : daysLeft <= 7 ? 1 : 0;
  if (daysLeft <= 7 && progress < 50 && level < 3) level += 1;
  if (progress >= 80 && daysLeft >= 2) level = Math.max(0, level - 1);
  return level;
}

/**
 * Urgencia de un examen ('exam') o una entrega ('task').
 * Devuelve null cuando no aplica (examen ya pasado o trabajo entregado).
 *
 * Si marcas la urgencia a mano (item.urgencyManual) funciona como MÍNIMO:
 * la urgencia final es la mayor entre la manual y la automática,
 * así sigue subiendo sola aunque tú la hayas puesto en "baja".
 */
export function getUrgency(item, kind, today = todayISO()) {
  const date = kind === 'exam' ? item.date : item.due;
  if (!date) return null;
  if (kind === 'task' && item.status === 'entregado') return null;
  const daysLeft = daysUntil(date, today);
  if (kind === 'exam' && daysLeft < 0) return null;

  const overdue = daysLeft < 0;
  const auto = overdue ? 3 : autoLevel({ daysLeft, progress: item.progress ?? 0 });
  const manual = Number.isInteger(item.urgencyManual) ? item.urgencyManual : null;
  const level = Math.max(auto, manual ?? 0);
  return { ...URGENCY[level], auto, manual, daysLeft, overdue };
}
