// Ajustes: calendarios de clase (Moodle de PRADO, Atlántida…). Se leen desde un enlace .ics o desde un archivo.
import { useRef, useState } from 'react';
import { actions, useAppState } from '../data/index.js';
import { newId } from '../data/repository.js';
import { ProgramSelect, Field } from './forms/fields.jsx';

const normalizeUrl = (u) => u.trim().replace(/^webcal:\/\//i, 'https://');

export default function CalendarsCard() {
  const { settings } = useAppState();
  const calendars = settings.calendars ?? [];
  const fileRef = useRef(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [programId, setProgramId] = useState(null);
  const [msg, setMsg] = useState('');

  const add = (e) => {
    e.preventDefault();
    const clean = normalizeUrl(url);
    if (!/^https:\/\/.+/i.test(clean)) { setMsg('El enlace debe empezar por https:// (el que da “Obtener URL del calendario”).'); return; }
    actions.updateSettings({ calendars: [...calendars, { id: newId(), name: name.trim() || 'Calendario', url: clean, programId }] });
    setName(''); setUrl(''); setMsg('Guardado. Tu servidor lo leerá en unas horas (o importa el archivo para verlo ya).');
  };
  const remove = (id) => actions.updateSettings({ calendars: calendars.filter((c) => c.id !== id) });

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const plan = actions.importCalendar(await file.text(), { programId });
      const n = plan.tasks.length + plan.exams.length;
      setMsg(n ? `Importado: ${plan.tasks.length} entregas y ${plan.exams.length} exámenes.` : 'No había nada nuevo que añadir.');
    } catch {
      setMsg('Ese archivo no es un calendario válido.');
    }
  };

  return (
    <section className="card stack">
      <h2>Calendarios de clase</h2>
      <p className="muted small" style={{ margin: 0 }}>
        Trae solos las entregas y exámenes de PRADO o del Moodle de Atlántida. En Moodle: Calendario → Importar o exportar → Exportar
        calendario → “Todos los eventos”, “Intervalo personalizado” → Obtener URL. El enlace da acceso de lectura a tu calendario: no lo compartas.
      </p>
      {calendars.map((c) => (
        <div key={c.id} className="row" style={{ justifyContent: 'space-between' }}>
          <span><b>{c.name}</b> <span className="muted small">· se lee desde tu servidor cada pocas horas</span></span>
          <button className="btn small" onClick={() => remove(c.id)}>Quitar</button>
        </div>
      ))}
      <form className="stack" onSubmit={add}>
        <Field label="Nombre"><input type="text" placeholder="Ej: PRADO" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Enlace del calendario"><input type="url" required placeholder="https://…/export_execute.php?…" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
        <ProgramSelect value={programId} onChange={setProgramId} hint="Estudios de las asignaturas nuevas que se creen." />
        <div className="row wrap">
          <button className="btn primary" type="submit">Añadir calendario</button>
          <button className="btn" type="button" onClick={() => fileRef.current?.click()}>Importar archivo .ics</button>
          <input ref={fileRef} type="file" accept=".ics,text/calendar" hidden onChange={importFile} />
        </div>
      </form>
      {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
    </section>
  );
}
