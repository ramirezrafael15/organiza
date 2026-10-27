// @vitest-environment jsdom
// Prueba de humo: monta la app entera con datos de ejemplo, recorre todas las pantallas
// y comprueba que los formularios guardan y que las medias/urgencias salen en pantalla.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App.jsx';
import { repo } from './data/repo.js';
import { buildDemoState } from './data/demo.js';

// jsdom no trae matchMedia (los navegadores sí): lo simulamos.
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.scrollTo = () => {};

beforeEach(() => {
  window.location.hash = '';
  act(() => repo.replaceAll(buildDemoState()));
});
afterEach(cleanup);

const go = (hash) => act(() => { window.location.hash = `/${hash}`; window.dispatchEvent(new HashChangeEvent('hashchange')); });

describe('app', () => {
  it('panel: muestra hoy, urgente y próximos exámenes', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Urgente' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Próximos exámenes' })).toBeTruthy();
    expect(screen.getAllByText(/Bases de Datos/).length).toBeGreaterThan(0);
  });

  it.each(['calendario', 'tareas', 'notas', 'horario', 'calificaciones', 'ajustes'])('pantalla %s se pinta sin errores', (r) => {
    render(<App />);
    go(r);
    expect(document.querySelector('main').textContent.length).toBeGreaterThan(10);
  });

  it('calendario: cambia entre mes, semana y día', () => {
    render(<App />);
    go('calendario');
    for (const v of ['Semana', 'Día', 'Mes']) {
      fireEvent.click(within(document.querySelector('.cal-bar')).getByText(v));
    }
    expect(document.querySelector('.month')).toBeTruthy();
  });

  it('calificaciones: calcula la media', () => {
    render(<App />);
    go('calificaciones');
    // BD: (7.2*30 + 8.5*20) / 50 = 7,72
    expect(screen.getByText('7,72')).toBeTruthy();
  });

  it('crear una entrega desde el botón +', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Añadir'));
    fireEvent.click(screen.getByText('Entrega'));
    fireEvent.change(screen.getByPlaceholderText(/Práctica 2/), { target: { value: 'Trabajo de prueba' } });
    fireEvent.click(screen.getByText('Guardar'));
    expect(repo.getState().tasks.some((t) => t.title === 'Trabajo de prueba')).toBe(true);
    expect(repo.getState().tasks.at(-1).reminderDays).toEqual([7, 3, 1, 0]);
  });

  it('filtro de estudios: al elegir DAW desaparece lo de Marketing', async () => {
    const { setFilter } = await import('./data/viewFilter.js');
    render(<App />);
    go('tareas');
    expect(screen.getAllByText(/Marketing/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText('DAW')[0]); // chip del filtro
    expect(document.querySelector('main').textContent).not.toMatch(/Informe de mercado/);
    act(() => setFilter('todo'));
  });

  it('calificaciones: la media se separa por estudios', async () => {
    const { setFilter } = await import('./data/viewFilter.js');
    render(<App />);
    go('calificaciones');
    act(() => setFilter('demo-grado')); // Marketing: Inglés = 9,00
    expect(document.querySelector('.grade-big').textContent).toBe('9,00');
    act(() => setFilter('todo'));
  });

  it('notas: busca por texto', () => {
    render(<App />);
    go('notas');
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: 'joins' } });
    expect(screen.getByText('Repaso SQL')).toBeTruthy();
    expect(screen.queryByText('Comprar')).toBeNull();
  });

  it('repositorio: borrar un examen deja sus notas sin enlace', async () => {
    const { actions } = await import('./data/index.js');
    act(() => actions.remove('exams', 'demo-x1'));
    expect(repo.getState().notes.find((n) => n.id === 'demo-n1').linkType).toBeNull();
  });
});

describe('avisos previos y calendario común', () => {
  it('panel: muestra los avisos con días que quedan y % preparado', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Avisos' })).toBeTruthy();
    expect(screen.getByText(/Te quedan 3 días para el examen de Bases de Datos, llevas el 40 % preparado/)).toBeTruthy();
  });

  it('formulario de examen: se eligen los días de aviso y se guardan', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Añadir'));
    fireEvent.click(screen.getByText('Examen'));
    fireEvent.change(document.querySelector('select'), { target: { value: 'demo-bd' } });
    const picker = screen.getByText('Avisarme antes').closest('.field');
    fireEvent.click(within(picker).getByText('14 días')); // añade 14
    fireEvent.click(within(picker).getByText('1 día')); // quita 1
    fireEvent.click(screen.getByText('Guardar'));
    expect(repo.getState().exams.at(-1).reminderDays).toEqual([14, 7, 3, 0]);
  });

  it('ajustes: cambia los avisos por defecto de lo nuevo', () => {
    render(<App />);
    go('ajustes');
    const picker = screen.getByText('Avisarme por defecto').closest('.field');
    fireEvent.click(within(picker).getByText('5 días'));
    expect(repo.getState().settings.reminderDays).toEqual([7, 5, 3, 1, 0]);
  });

  it('ajustes: sin configurar la nube explica cómo activarla y no rompe', () => {
    render(<App />);
    go('ajustes');
    expect(screen.getByText('Cuenta y sincronización')).toBeTruthy();
    expect(screen.getByText(/aún no está configurada/)).toBeTruthy();
    expect(screen.queryByText('Notificaciones')).toBeNull(); // necesitan cuenta
  });

  it('calendario común: ignora el filtro global y trae sus propios botones', async () => {
    const { setFilter } = await import('./data/viewFilter.js');
    act(() => setFilter('demo-daw')); // filtro global en DAW
    render(<App />);
    go('calendario');
    expect(document.querySelector('.filter-bar').textContent).toMatch(/Todo junto/);
    expect(document.querySelectorAll('.filter-bar').length).toBe(1); // no se duplica el filtro global
    fireEvent.click(within(document.querySelector('.cal-bar')).getByText('Lista'));
    // Marketing sigue visible aunque el filtro global sea DAW
    expect(document.querySelector('main').textContent).toMatch(/Marketing/);
    fireEvent.click(within(document.querySelector('.filter-bar')).getByText('DAW'));
    expect(document.querySelector('main').textContent).not.toMatch(/Inglés/);
    act(() => setFilter('todo'));
  });
});

describe('formulario de examen', () => {
  it('permite asignar estudios a una asignatura que no los tiene', () => {
    act(() => {
      repo.upsert('subjects', { id: 'sin-estudios', name: 'Entorno Servidor', color: '#0ea5e9' });
    });
    render(<App />);
    fireEvent.click(screen.getByLabelText('Añadir'));
    fireEvent.click(screen.getByText('Examen'));
    fireEvent.change(document.querySelector('select'), { target: { value: 'sin-estudios' } });
    const programSelect = screen.getByText(/Estudios de Entorno Servidor/).closest('.field').querySelector('select');
    fireEvent.change(programSelect, { target: { value: 'demo-daw' } });
    expect(repo.getState().subjects.find((s) => s.id === 'sin-estudios').programId).toBe('demo-daw');
  });
});
