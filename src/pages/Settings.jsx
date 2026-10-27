// Ajustes: tema, copia de seguridad y datos de ejemplo.
import { useRef } from 'react';
import { KindLabel } from '../components/bits.jsx';
import { useUI } from '../components/ui.js';
import { actions, useAppState } from '../data/index.js';
import { DEFAULT_KIND_COLORS, KINDS } from '../lib/kinds.js';
import { buildDemoState } from '../data/demo.js';
import { useTheme } from '../lib/theme.js';
import { ColorSwatches, ReminderPicker, Segmented } from '../components/forms/fields.jsx';
import { AccountCard, NotificationsCard } from '../components/AccountCard.jsx';

export default function Settings() {
  const state = useAppState();
  const [theme, setTheme] = useTheme();
  const fileRef = useRef(null);
  const { openForm } = useUI();
  const { programs, settings } = state;
  const kindColors = { ...DEFAULT_KIND_COLORS, ...settings.kindColors };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `organiza-copia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (window.confirm('Esto sustituirá todos los datos actuales. ¿Continuar?')) actions.replaceAll(data);
    } catch {
      window.alert('Ese archivo no es una copia de seguridad válida.');
    }
  };

  const applyReminders = () => {
    if (!window.confirm('Se cambiarán los avisos de todos tus exámenes y entregas. ¿Continuar?')) return;
    state.exams.forEach((x) => actions.save('exams', { ...x, reminderDays: [...settings.reminderDays] }));
    state.tasks.forEach((t) => actions.save('tasks', { ...t, reminderDays: [...settings.reminderDays] }));
  };

  const scheduleRef = useRef(null);
  const importSchedule = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const plan = actions.importSchedule(JSON.parse(await file.text()));
      window.alert(`Horario añadido: ${plan.classes.length} clases nuevas${plan.skipped ? ` (${plan.skipped} ya estaban)` : ''}.`);
    } catch {
      window.alert('Ese archivo no es un horario válido.');
    }
  };

  const loadDemo = () => {
    if (window.confirm('Se sustituirán tus datos actuales por datos de ejemplo. ¿Continuar?')) actions.replaceAll(buildDemoState());
  };
  const clearAll = () => {
    if (window.confirm('¿Borrar TODOS tus datos? Si tienes la sesión iniciada, también se borrarán de tus otros dispositivos. No se puede deshacer.')) actions.replaceAll(null);
  };

  return (
    <>
      <div className="page-head"><h1>Ajustes</h1></div>
      <div className="stack">
        <section className="card stack">
          <h2>Apariencia</h2>
          <Segmented value={theme} onChange={setTheme}
            options={[{ value: 'auto', label: 'Automático' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
        </section>

        <AccountCard />
        <NotificationsCard />

        <section className="card stack">
          <h2>Avisos</h2>
          <ReminderPicker label="Avisarme por defecto" value={settings.reminderDays} onChange={(reminderDays) => actions.updateSettings({ reminderDays })} />
          <p className="muted small">
            Es el valor de los exámenes y entregas nuevos; cada uno puede cambiarlo en su formulario.
            Los avisos aparecen en el Panel y, con la cuenta y las notificaciones activadas, también en el móvil.
          </p>
          <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={applyReminders}>
            Aplicar a todos los exámenes y entregas
          </button>
        </section>

        <section className="card stack">
          <h2>Estudios</h2>
          <p className="muted small">
            Agrupa tus asignaturas (por ejemplo DAW y Marketing). Arriba de cada pantalla aparecerá un filtro para ver solo uno,
            y las medias salen por separado.
          </p>
          <div className="chips">
            {programs.map((p) => (
              <button key={p.id} className="chip-btn prog on" style={{ '--c': p.color }} onClick={() => openForm('program', p)}>
                <i /> {p.name}
              </button>
            ))}
            <button className="chip-btn" onClick={() => openForm('program')}>+ Añadir estudios</button>
          </div>
        </section>

        <section className="card stack">
          <h2>Colores</h2>
          <div className="field">
            <span className="label">Colorear la agenda por</span>
            <Segmented value={settings.colorBy || 'tipo'} onChange={(colorBy) => actions.updateSettings({ colorBy })}
              options={[{ value: 'tipo', label: 'Tipo (examen, clase…)' }, { value: 'estudios', label: 'Estudios' }]} />
            <span className="hint">
              {settings.colorBy === 'estudios'
                ? 'Lo que tiene asignatura se pinta con el color de sus estudios; el tipo se distingue por el icono.'
                : 'Cada tipo tiene su color. Los estudios se distinguen por la etiqueta de color.'}
            </span>
          </div>
          {Object.keys(KINDS).map((kind) => (
            <div key={kind} className="field">
              <KindLabel kind={kind} color={kindColors[kind]} />
              <ColorSwatches value={kindColors[kind]} onChange={(c) => actions.updateSettings({ kindColors: { ...settings.kindColors, [kind]: c } })} />
            </div>
          ))}
          <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => actions.updateSettings({ kindColors: {} })}>
            Restablecer colores
          </button>
        </section>

        <section className="card stack">
          <h2>Datos</h2>
          <p className="muted small">
            Tus datos se guardan en este dispositivo y funcionan sin conexión. Con una cuenta iniciada se sincronizan entre tus dispositivos;
            sin ella puedes pasarlos con una copia de seguridad.
          </p>
          <div className="row wrap">
            <button className="btn" onClick={exportData}>Exportar copia</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>Importar copia</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
          </div>
          <div className="row wrap">
            <button className="btn" onClick={() => scheduleRef.current?.click()}>Añadir horario desde archivo</button>
            <input ref={scheduleRef} type="file" accept="application/json,.json" hidden onChange={importSchedule} />
          </div>
          <p className="muted small" style={{ margin: 0 }}>“Añadir horario” suma las clases del archivo sin borrar nada de lo que ya tienes.</p>
          <div className="row wrap">
            <button className="btn" onClick={loadDemo}>Cargar datos de ejemplo</button>
            <button className="btn danger" onClick={clearAll}>Borrar todo</button>
          </div>
        </section>

        <section className="card stack install-tip">
          <h2>Instalar la app</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li><b>iPhone:</b> ábrela en Safari → botón Compartir → “Añadir a pantalla de inicio”.</li>
            <li><b>Windows:</b> en Edge o Chrome → icono de instalar en la barra de direcciones (o menú → “Instalar Organiza”).</li>
          </ul>
        </section>
      </div>
    </>
  );
}
