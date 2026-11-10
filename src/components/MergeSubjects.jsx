// Fusionar asignaturas repetidas: todo lo de una pasa a la otra (nada se borra). Con copia de seguridad y "Deshacer".
import { useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal.jsx';
import { toast } from './toast.jsx';
import { useAppState } from '../data/index.js';
import { repo } from '../data/repo.js';
import { autoBackup } from '../lib/safety.js';
import { getKeys } from '../lib/keys.js';
import { duplicateGroups, planMerge, SUBJECT_COLS } from '../lib/subjects.js';

const LABEL = { classes: 'clases', events: 'eventos', exams: 'exámenes', tasks: 'entregas', todos: 'pendientes', notes: 'apuntes', grades: 'notas' };

function apply(plan) {
  autoBackup(repo.getState(), getKeys()).catch(() => {}); // red de seguridad antes de tocar nada
  const oldProgram = plan.patch ? plan.into.programId ?? null : null;
  for (const [col, ids] of Object.entries(plan.moves)) ids.forEach((id) => repo.upsert(col, { id, subjectId: plan.into.id }));
  if (plan.patch) repo.upsert('subjects', plan.patch);
  repo.remove('subjects', plan.from.id);
  return () => { // deshacer
    repo.upsert('subjects', plan.from);
    for (const [col, ids] of Object.entries(plan.moves)) ids.forEach((id) => repo.upsert(col, { id, subjectId: plan.from.id }));
    if (plan.patch) repo.upsert('subjects', { id: plan.into.id, programId: oldProgram });
  };
}

export default function MergeSubjects({ onClose }) {
  const state = useAppState();
  const [from, setFrom] = useState('');
  const [into, setInto] = useState('');
  const progName = (s) => state.programs.find((p) => p.id === s.programId)?.name;
  const label = (s) => `${s.name}${progName(s) ? ` · ${progName(s)}` : ''}`;
  const subjects = [...state.subjects].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const groups = duplicateGroups(state.subjects);
  const plan = planMerge(state, from, into);

  const run = (p) => {
    const undo = apply(p);
    toast(`Fusionada “${p.from.name}” en “${p.into.name}” (${p.total} cosas movidas)`, undo);
    setFrom(''); setInto('');
  };
  const count = (p) => SUBJECT_COLS.filter((c) => p.moves[c]).map((c) => `${p.moves[c].length} ${LABEL[c]}`).join(', ') || 'nada (estaba vacía)';

  return createPortal(
    <Modal title="Ordenar asignaturas" onClose={onClose}>
      <div className="stack modal-body">
        <p className="small" style={{ margin: 0 }}>Fusionar pasa todo lo de una asignatura (clases, exámenes, entregas, pendientes, apuntes y notas) a la otra. No se borra nada, solo desaparece la asignatura repetida. Antes se guarda una copia y puedes deshacer.</p>

        {groups.length > 0 && (
          <>
            <b>Parecen repetidas</b>
            {groups.map((g) => {
              const keep = g[0];
              return g.slice(1).map((dup) => {
                const p = planMerge(state, dup.id, keep.id);
                return (
                  <div key={dup.id} className="card stack" style={{ padding: 12 }}>
                    <span><b>{label(dup)}</b> → <b>{label(keep)}</b></span>
                    <span className="small">Se mueven: {count(p)}</span>
                    <button type="button" className="btn small primary" style={{ alignSelf: 'flex-start' }} onClick={() => run(p)}>Fusionar</button>
                  </div>
                );
              });
            })}
          </>
        )}
        {!groups.length && <p style={{ margin: 0 }}>No veo asignaturas con el mismo nombre. Si tienes dos que son la misma con nombre distinto, elígelas aquí:</p>}

        <b>Elegir a mano</b>
        <label className="small" style={{ display: 'grid', gap: 4, fontWeight: 600 }}>Asignatura repetida (desaparecerá)
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Elige…</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
          </select>
        </label>
        <label className="small" style={{ display: 'grid', gap: 4, fontWeight: 600 }}>Se queda esta (recibe todo)
          <select value={into} onChange={(e) => setInto(e.target.value)}>
            <option value="">Elige…</option>
            {subjects.filter((s) => s.id !== from).map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
          </select>
        </label>
        {plan && <p className="small" style={{ margin: 0 }}>Se moverán: {count(plan)}.</p>}
        <button type="button" className="btn primary" disabled={!plan} onClick={() => run(plan)}>Fusionar</button>
      </div>
    </Modal>,
    document.body,
  );
}
