// Contexto de interfaz: permite abrir formularios y navegar desde cualquier pantalla.
//   const { openForm, openQuickAdd, navigate } = useUI();
//   openForm('exam')                    -> nuevo examen
//   openForm('exam', examExistente)     -> editar
//   openForm('task', null, { due: '2026-11-03' }) -> nuevo con valores por defecto
import { createContext, useContext } from 'react';

export const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

/** Qué formulario edita cada colección. */
export const FORM_FOR_COL = {
  exams: 'exam',
  tasks: 'task',
  classes: 'class',
  events: 'event',
  notes: 'note',
  grades: 'grade',
  subjects: 'subject',
  programs: 'program',
};
