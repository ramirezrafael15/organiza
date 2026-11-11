import { describe, it, expect } from 'vitest';
import { pushRecent } from './ColorTool.jsx';

describe('colores recientes', () => {
  it('pone el último primero, sin repetir y con máximo 6', () => {
    expect(pushRecent(['#111111', '#222222'], '#222222')).toEqual(['#222222', '#111111']);
    expect(pushRecent(['#1', '#2', '#3', '#4', '#5', '#6'], '#7')).toEqual(['#7', '#1', '#2', '#3', '#4', '#5']);
  });
});
