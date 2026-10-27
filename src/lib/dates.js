// Utilidades de fechas.
// Convención de la app: las fechas se guardan como texto 'YYYY-MM-DD' (sin zona horaria)
// y las horas como 'HH:mm'. Así no hay líos de husos horarios entre iPhone y Windows.
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';

export const toISO = (date) => format(date, 'yyyy-MM-dd');
export const fromISO = (iso) => parseISO(iso); // 'YYYY-MM-DD' -> medianoche local
export const todayISO = () => toISO(new Date());
export const addDaysISO = (iso, n) => toISO(addDays(fromISO(iso), n));

/** Días naturales que faltan (negativo = ya pasó). */
export const daysUntil = (iso, today = todayISO()) =>
  differenceInCalendarDays(fromISO(iso), fromISO(today));

/** 0 = lunes ... 6 = domingo (la semana española empieza en lunes). */
export const weekdayOf = (iso) => (getDay(fromISO(iso)) + 6) % 7;

export const fmt = (iso, pattern) => format(fromISO(iso), pattern, { locale: es });

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const WEEKDAYS_3 = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Los 7 días (lunes a domingo) de la semana que contiene `iso`. */
export function weekDays(iso) {
  const start = startOfWeek(fromISO(iso), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 6) }).map(toISO);
}

/** Todos los días que se pintan en la cuadrícula del mes (semanas completas). */
export function monthGrid(iso) {
  const d = fromISO(iso);
  const start = startOfWeek(startOfMonth(d), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(d), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).map(toISO);
}

/** "Hoy", "Mañana", "En 3 días", "Hace 2 días". */
export function relativeLabel(iso, today = todayISO()) {
  const n = daysUntil(iso, today);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Ayer';
  if (n > 1) return `En ${n} días`;
  return `Hace ${-n} días`;
}

/** Texto corto para cuenta atrás: "hoy", "mañana", "3 días". */
export function countdownLabel(iso, today = todayISO()) {
  const n = daysUntil(iso, today);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  if (n > 1) return `${n} días`;
  return `hace ${-n} días`;
}

/** "08:30–10:00", "08:30" o "Todo el día". */
export function timeLabel(start, end) {
  if (!start) return 'Todo el día';
  return end ? `${start}–${end}` : start;
}
