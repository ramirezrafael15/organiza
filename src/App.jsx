// Estructura de la app: navegación (barra lateral en ordenador, barra inferior en móvil),
// botón "+" y gestión de formularios. Las rutas usan el hash (#/calendario) para que
// funcionen igual en cualquier hosting (GitHub Pages, Firebase...).
import { useCallback, useEffect, useMemo, useState } from 'react';
import FormHost, { QuickAdd } from './components/forms/FormHost.jsx';
import Icon from './components/Icon.jsx';
import Modal from './components/Modal.jsx';
import ProgramFilter from './components/ProgramFilter.jsx';
import SyncBadge from './components/SyncBadge.jsx';
import { UIContext } from './components/ui.js';
import { useAppState } from './data/index.js';
import { DEFAULT_KIND_COLORS } from './lib/kinds.js';
import CalendarPage from './pages/CalendarPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Grades from './pages/Grades.jsx';
import Notes from './pages/Notes.jsx';
import Schedule from './pages/Schedule.jsx';
import Settings from './pages/Settings.jsx';
import Tasks from './pages/Tasks.jsx';
import { useTheme } from './lib/theme.js';
import { initAccount } from './sync/account.js';

const ROUTES = [
  { id: 'panel', label: 'Panel', icon: 'home', Page: Dashboard },
  { id: 'calendario', label: 'Calendario', icon: 'calendar', Page: CalendarPage },
  { id: 'tareas', label: 'Tareas', icon: 'tasks', Page: Tasks },
  { id: 'notas', label: 'Bloc', icon: 'note', Page: Notes },
  { id: 'horario', label: 'Horario', icon: 'clock', Page: Schedule },
  { id: 'calificaciones', label: 'Notas', icon: 'grades', Page: Grades },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings', Page: Settings },
];
const MOBILE_MAIN = ['panel', 'calendario', 'tareas', 'notas']; // el resto va en "Más"

const routeFromHash = () => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return ROUTES.some((r) => r.id === id) ? id : 'panel';
};

export default function App() {
  useTheme(); // aplica el tema guardado
  useEffect(() => { initAccount(); }, []); // si la nube está configurada, conecta la cuenta y la sincronización
  const { settings } = useAppState();
  const [routeId, setRouteId] = useState(routeFromHash);
  const [form, setForm] = useState(null); // { kind, item, defaults } o null
  const [quick, setQuick] = useState(null); // { defaults } o null
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setRouteId(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Colores de cada tipo elegidos en Ajustes: se aplican como variables CSS (--k-clase, --k-examen...).
  useEffect(() => {
    const root = document.documentElement;
    for (const kind of Object.keys(DEFAULT_KIND_COLORS)) {
      const custom = settings.kindColors?.[kind];
      if (custom) root.style.setProperty(`--k-${kind}`, custom);
      else root.style.removeProperty(`--k-${kind}`);
    }
  }, [settings.kindColors]);

  const navigate = useCallback((id) => {
    window.location.hash = `/${id}`;
    setMoreOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const ui = useMemo(
    () => ({
      navigate,
      openForm: (kind, item = null, defaults = {}) => { setQuick(null); setForm({ kind, item, defaults }); },
      openQuickAdd: (defaults = {}) => setQuick({ defaults }),
    }),
    [navigate],
  );

  const { Page } = ROUTES.find((r) => r.id === routeId);
  const moreActive = !MOBILE_MAIN.includes(routeId);

  return (
    <UIContext.Provider value={ui}>
      <SyncBadge />
      <div className="app">
        <nav className="sidebar" aria-label="Principal">
          <div className="brand"><img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" /> Organiza</div>
          {ROUTES.map((r) => (
            <button key={r.id} className={`side-btn ${routeId === r.id ? 'active' : ''}`} onClick={() => navigate(r.id)}>
              <Icon name={r.icon} /> {r.id === 'notas' ? 'Bloc de notas' : r.id === 'calificaciones' ? 'Calificaciones' : r.label}
            </button>
          ))}
        </nav>

        <main className="main">
          {/* El calendario es común (lo junta todo) y trae sus propios botones; Ajustes no filtra nada. */}
          {routeId !== 'ajustes' && routeId !== 'calendario' && <ProgramFilter />}
          <Page />
        </main>

        <nav className="bottom-nav" aria-label="Principal">
          {ROUTES.filter((r) => MOBILE_MAIN.includes(r.id)).map((r) => (
            <button key={r.id} className={`nav-btn ${routeId === r.id ? 'active' : ''}`} onClick={() => navigate(r.id)}>
              <Icon name={r.icon} /> {r.label}
            </button>
          ))}
          <button className={`nav-btn ${moreActive ? 'active' : ''}`} onClick={() => setMoreOpen(true)}>
            <Icon name="grid" /> Más
          </button>
        </nav>

        <button className="fab" onClick={() => ui.openQuickAdd()} aria-label="Añadir"><Icon name="plus" /></button>
      </div>

      {moreOpen && (
        <Modal title="Más" onClose={() => setMoreOpen(false)}>
          <div className="modal-body" style={{ paddingBottom: 22 }}>
            {ROUTES.filter((r) => !MOBILE_MAIN.includes(r.id)).map((r) => (
              <button key={r.id} className="side-btn" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }} onClick={() => navigate(r.id)}>
                <Icon name={r.icon} /> {r.id === 'calificaciones' ? 'Calificaciones' : r.label}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {quick && <QuickAdd defaults={quick.defaults} onPick={(kind, defaults) => ui.openForm(kind, null, defaults)} onClose={() => setQuick(null)} />}
      {form && <FormHost form={form} onClose={() => setForm(null)} />}
    </UIContext.Provider>
  );
}
