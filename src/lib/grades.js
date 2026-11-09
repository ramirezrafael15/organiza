// Cálculo de medias. Notas en escala española 0-10.

/** Media ponderada de una lista de notas { value, weight }. Peso por defecto = 1. */
export function weightedAverage(grades) {
  let sum = 0;
  let totalWeight = 0;
  for (const g of grades) {
    const value = Number(g.value);
    const weight = Number(g.weight) > 0 ? Number(g.weight) : 1;
    if (!Number.isFinite(value)) continue;
    sum += value * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? sum / totalWeight : null;
}

/** Media de una asignatura a partir de todas las notas de la app. */
export function subjectAverage(subjectId, grades) {
  return weightedAverage(grades.filter((g) => g.subjectId === subjectId));
}

/**
 * Media general: media de las medias de cada asignatura, ponderada por créditos
 * (si una asignatura no tiene créditos cuenta como 1).
 */
export function overallAverage(subjects, grades) {
  let sum = 0;
  let totalWeight = 0;
  for (const s of subjects) {
    const avg = subjectAverage(s.id, grades);
    if (avg == null) continue;
    const w = Number(s.credits) > 0 ? Number(s.credits) : 1;
    sum += avg * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? sum / totalWeight : null;
}

export const formatGrade = (n) =>
  n == null ? '–' : n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Calificación en texto + nivel de color (para pintar la nota). */
export function gradeBand(n) {
  if (n == null) return { label: 'Sin notas', tone: 'none' };
  if (n < 5) return { label: 'Suspenso', tone: 'bad' };
  if (n < 7) return { label: 'Aprobado', tone: 'ok' };
  if (n < 9) return { label: 'Notable', tone: 'good' };
  return { label: 'Sobresaliente', tone: 'great' };
}

/**
 * ¿Qué nota necesito en lo que falta? Con las notas actuales { value, weight } y el peso de lo que queda
 * (mismo criterio que los pesos de las notas), calcula la nota mínima para llegar a `target` de media.
 * Devuelve { needed, status }: 'hecho' (ya llegas aunque saques 0), 'posible' o 'imposible' (necesitarías más de 10).
 */
export function neededGrade(grades, remainingWeight, target = 5) {
  const w = Number(remainingWeight);
  const t = Number(target);
  if (!(w > 0) || !Number.isFinite(t)) return null;
  let sum = 0;
  let total = 0;
  for (const g of grades) {
    const value = Number(g.value);
    const weight = Number(g.weight) > 0 ? Number(g.weight) : 1;
    if (!Number.isFinite(value)) continue;
    sum += value * weight;
    total += weight;
  }
  const raw = (t * (total + w) - sum) / w;
  if (raw <= 0) return { needed: 0, status: 'hecho' };
  if (raw > 10) return { needed: raw, status: 'imposible' };
  return { needed: Math.ceil(raw * 100) / 100, status: 'posible' };
}
