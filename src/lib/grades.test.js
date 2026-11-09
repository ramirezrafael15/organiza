import { describe, expect, it } from 'vitest';

import { neededGrade } from './grades.js';

describe('neededGrade', () => {
  it('calcula la nota mínima para aprobar con un 5', () => {
    // 4 (peso 1) y falta un examen de peso 1: (5*2-4)/1 = 6
    expect(neededGrade([{ value: 4, weight: 1 }], 1, 5)).toEqual({ needed: 6, status: 'posible' });
  });
  it('respeta los pesos', () => {
    // 8 (peso 1) + falta peso 3, objetivo 7: (7*4-8)/3 = 6.67
    expect(neededGrade([{ value: 8, weight: 1 }], 3, 7)).toEqual({ needed: 6.67, status: 'posible' });
  });
  it('avisa si ya has llegado', () => {
    expect(neededGrade([{ value: 9, weight: 3 }], 1, 5).status).toBe('hecho');
  });
  it('avisa si es imposible', () => {
    const r = neededGrade([{ value: 1, weight: 4 }], 1, 5);
    expect(r.status).toBe('imposible');
    expect(r.needed).toBeGreaterThan(10);
  });
  it('sin notas, necesitas el objetivo', () => {
    expect(neededGrade([], 2, 6)).toEqual({ needed: 6, status: 'posible' });
  });
  it('peso o objetivo inválido → null', () => {
    expect(neededGrade([], 0, 5)).toBeNull();
    expect(neededGrade([], 1, 'x')).toBeNull();
  });
});
