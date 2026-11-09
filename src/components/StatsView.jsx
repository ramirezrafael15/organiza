// Estadísticas de estudio: racha, foco de la semana por asignatura y tareas hechas. Sin gráficos pesados.
import { useState } from 'react';
import { useToday } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { addDaysISO, fmt, WEEKDAYS_SHORT } from '../lib/dates.js';
import { fmtMin, streak, weekStats } from '../lib/stats.js';
import { shareSummary, summaryData } from '../lib/summaryCard.js';
import { toast } from './toast.jsx';

export default function StatsView() {
  const state = useViewState();
  const today = useToday();
  const [offset, setOffset] = useState(0); // semanas hacia atrás
  const [busy, setBusy] = useState(false);
  const log = state.settings?.focusLog ?? {};
  const day = addDaysISO(today, -7 * offset);
  const w = weekStats(state, log, day);
  const st = streak(state, log, today);
  const max = Math.max(30, ...w.days.map((d) => d.min));
  const subj = (id) => state.subjects.find((s) => s.id === id);
  const bySubject = w.bySubject.filter((x) => subj(x.subjectId)); // respeta el filtro de estudios de arriba
  const label = offset === 0 ? 'Esta semana' : `Semana del ${fmt(w.from, "d 'de' MMM")}`;

  const share = async () => {
    setBusy(true);
    try { if (await shareSummary(summaryData(w, st, state.subjects)) === 'downloaded') toast('Imagen guardada en tus descargas'); }
    catch (e) { toast(e.message || 'No se pudo compartir'); }
    setBusy(false);
  };

  return (
    <div className="stack">
      <div className="card row spread">
        <div>
          <div className="small muted">Racha</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.1 }}>🔥 {st.days} {st.days === 1 ? 'día' : 'días'}</div>
          <div className="small muted">{st.todayDone ? 'Hoy ya cuenta.' : 'Hoy aún no cuenta: haz foco o termina tus pendientes del día.'}</div>
        </div>
      </div>

      <div className="row spread">
        <div className="row-gap">
          <button className="btn small" onClick={() => setOffset(offset + 1)} aria-label="Semana anterior">‹</button>
          <b>{label}</b>
          <button className="btn small" disabled={offset === 0} onClick={() => setOffset(offset - 1)} aria-label="Semana siguiente">›</button>
        </div>
        <button className="btn small" disabled={busy} onClick={share}>📤 Compartir</button>
      </div>

      <div className="card stack">
        <div className="row spread"><b>Foco</b><span>{w.totalMin ? fmtMin(w.totalMin) : '—'}</span></div>
        <div className="stats-bars" role="img" aria-label="Minutos de foco por día">
          {w.days.map((d, i) => (
            <div key={d.day} className="stats-col" title={`${fmt(d.day, "EEEE d")}: ${d.min} min`}>
              <div className="stats-bar"><span style={{ height: `${(d.min / max) * 100}%` }} /></div>
              <span className="small muted">{WEEKDAYS_SHORT[i]}</span>
            </div>
          ))}
        </div>
        {bySubject.length ? bySubject.map(({ subjectId, min }) => (
          <div key={subjectId} className="row spread small">
            <span><i className="dot" style={{ background: subj(subjectId)?.color ?? 'var(--muted)' }} /> {subj(subjectId)?.name ?? 'Sin asignatura'}</span>
            <b>{fmtMin(min)}</b>
          </div>
        )) : <p className="small muted" style={{ margin: 0 }}>Sin foco esta semana. Empieza uno desde “Qué hago ahora” o en Estudio → Técnicas.</p>}
      </div>

      <div className="card row spread">
        <div><div className="small muted">Hechas esta semana</div><b style={{ fontSize: '1.4rem' }}>{w.done}</b></div>
        <div className="small muted" style={{ textAlign: 'right' }}>{w.todosDone} pendientes<br />{w.tasksDone} entregas<br />{w.rounds} bloques de foco</div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Un día cuenta para la racha si hiciste foco o terminaste tus pendientes de ese día, y no dejaste ninguno sin hacer.</p>
    </div>
  );
}
