// "Qué hago ahora": lo siguiente destacado y, debajo, el resto por orden de urgencia.
import { useState } from 'react';
import { actions } from '../data/index.js';
import { nowList } from '../lib/now.js';
import { entryColor } from '../lib/color.js';
import { FORM_FOR_COL, useUI } from './ui.js';
import { ProgramPill, Progress } from './bits.jsx';
import { burst } from './motion.jsx';
import { toast } from './toast.jsx';
import { startFocusFor } from './Focus.jsx';

const KIND_LABEL = { pendiente: 'Pendiente', entrega: 'Entrega', examen: 'Examen', clase: 'Clase', evento: 'Evento' };
const nowHHMM = () => new Date().toTimeString().slice(0, 5);

export default function NowList({ state, full, today }) {
  const { openForm, navigate } = useUI();
  const [all, setAll] = useState(false);
  const list = nowList(state, today, nowHHMM());
  const subjectOf = (id) => state.subjects.find((s) => s.id === id);

  const done = (e, ev) => {
    burst(ev.currentTarget);
    if (e.col === 'todos') actions.toggleTodo(e.item);
    else actions.save('tasks', { ...e.item, status: 'entregado' });
    toast(`Hecho: ${e.title}`);
  };
  const focus = (e) => {
    const started = startFocusFor({ label: e.kind === 'examen' ? e.title : `Estudiando: ${e.title}`.replace('Estudiando: Estudiar: ', 'Estudiando: '), subjectId: e.subjectId });
    if (!started) toast('Ya tienes un foco en marcha');
    navigate('estudio');
  };
  const open = (e) => openForm(FORM_FOR_COL[e.col], e.item);

  if (!list.length) {
    return (
      <section className="section now">
        <div className="section-head"><h2>Qué hago ahora</h2></div>
        <div className="card"><p className="muted" style={{ margin: 0 }}>Nada urgente ahora mismo ✅ Buen momento para adelantar trabajo.</p></div>
      </section>
    );
  }

  const [first, ...rest] = list;
  const shown = all ? rest : rest.slice(0, 4);
  const Actions = ({ e, big }) => (
    <div className="row-gap" style={{ flexWrap: 'wrap' }}>
      {e.canDone && <button className={`btn${big ? ' primary' : ' small'}`} onClick={(ev) => done(e, ev)}>✓ Hecho</button>}
      {e.canFocus && <button className={`btn${big ? '' : ' small'}`} onClick={() => focus(e)}>▶ Foco</button>}
    </div>
  );

  return (
    <section className="section now">
      <div className="section-head"><h2>Qué hago ahora</h2><span className="small muted">{list.length} {list.length === 1 ? 'cosa' : 'cosas'}</span></div>

      <div className="card now-first" style={{ '--k': entryColor({ kind: first.kind === 'evento' ? 'personal' : first.kind, subjectId: first.subjectId }, full) }}>
        <span className="now-tag">Lo siguiente · {KIND_LABEL[first.kind]}</span>
        <button className="now-title" onClick={() => open(first)}>{first.title}</button>
        <div className="now-meta">
          <ProgramPill subject={subjectOf(first.subjectId)} />
          <span>{first.reason}</span>
        </div>
        {first.progress != null && first.kind !== 'pendiente' && <Progress value={first.progress} color={first.urgency?.color} />}
        {(first.canDone || first.canFocus) && <Actions e={first} big />}
      </div>

      {shown.length > 0 && (
        <div className="entries now-rest">
          {shown.map((e) => (
            <div key={e.key} className="entry now-row" style={{ '--k': entryColor({ kind: e.kind === 'evento' ? 'personal' : e.kind, subjectId: e.subjectId }, full) }}>
              <button className="now-row-main" onClick={() => open(e)}>
                <span className="entry-title">{e.title}</span>
                <span className="entry-meta"><span>{KIND_LABEL[e.kind]} · {e.reason}</span><ProgramPill subject={subjectOf(e.subjectId)} /></span>
              </button>
              {(e.canDone || e.canFocus) && <Actions e={e} />}
            </div>
          ))}
        </div>
      )}
      {rest.length > 4 && <button className="link-btn" onClick={() => setAll(!all)}>{all ? 'Ver menos' : `Ver ${rest.length - 4} más`}</button>}
    </section>
  );
}
