// Tarjeta del resumen semanal (imagen para compartir). Se dibuja en el propio móvil, sin servidor.
import { fmt } from './dates.js';
import { fmtMin } from './stats.js';

/** Datos listos para pintar (función pura). */
export function summaryData(week, streakInfo, subjects) {
  const name = (id) => subjects.find((s) => s.id === id);
  return {
    range: `${fmt(week.from, "d 'de' MMMM")} – ${fmt(week.days[6].day, "d 'de' MMMM")}`,
    focus: week.totalMin ? fmtMin(week.totalMin) : '0 min',
    done: week.done,
    streak: streakInfo.days,
    subjects: week.bySubject.filter((x) => name(x.subjectId)).slice(0, 3).map((x) => ({ name: name(x.subjectId).name, color: name(x.subjectId).color, time: fmtMin(x.min), min: x.min })),
    days: week.days.map((d) => d.min),
  };
}

const W = 1080, H = 1350;

/** Dibuja la tarjeta en un canvas nuevo y lo devuelve. */
export function drawSummary(d) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const font = (px, w = 600) => { x.font = `${w} ${px}px -apple-system, "Segoe UI", Inter, system-ui, sans-serif`; };

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#312e81'); g.addColorStop(0.55, '#4f46e5'); g.addColorStop(1, '#0ea5e9');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.arc(W - 120, 160, 300, 0, Math.PI * 2); x.fill();

  x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
  font(40, 700); x.fillText('Seiri', 80, 120);
  font(34, 500); x.fillStyle = 'rgba(255,255,255,.8)'; x.fillText('Mi semana de estudio', 80, 175);
  font(30, 500); x.fillText(d.range, 80, 220);

  const stat = (px, py, big, small) => {
    x.fillStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.roundRect(px, py, 280, 190, 36); x.fill();
    x.fillStyle = '#fff'; font(64, 800); x.fillText(big, px + 28, py + 98);
    font(28, 500); x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(small, px + 28, py + 150);
  };
  stat(80, 280, d.focus, 'de foco');
  stat(400, 280, String(d.done), 'tareas hechas');
  stat(720, 280, `🔥 ${d.streak}`, d.streak === 1 ? 'día de racha' : 'días de racha');

  // barras por día
  const max = Math.max(30, ...d.days);
  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  x.fillStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.roundRect(80, 520, 920, 330, 36); x.fill();
  d.days.forEach((m, i) => {
    const bx = 130 + i * 125, bh = Math.round((m / max) * 200);
    x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.roundRect(bx, 580, 80, 200, 20); x.fill();
    if (bh) { x.fillStyle = '#fff'; x.beginPath(); x.roundRect(bx, 580 + 200 - bh, 80, bh, 20); x.fill(); }
    x.fillStyle = '#fff'; font(28, 600); x.textAlign = 'center'; x.fillText(labels[i], bx + 40, 825); x.textAlign = 'left';
  });

  // asignaturas
  font(34, 700); x.fillStyle = '#fff'; x.fillText('Lo que más he estudiado', 80, 925);
  if (!d.subjects.length) { font(30, 500); x.fillStyle = 'rgba(255,255,255,.8)'; x.fillText('Esta semana, a descansar 😴', 80, 990); }
  d.subjects.forEach((s, i) => {
    const y = 960 + i * 100;
    x.fillStyle = s.color || '#fff'; x.beginPath(); x.arc(100, y + 28, 16, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; font(34, 600);
    let t = s.name; while (x.measureText(t).width > 620 && t.length > 4) t = `${t.slice(0, -2)}…`;
    x.fillText(t, 135, y + 40);
    x.textAlign = 'right'; font(34, 800); x.fillText(s.time, 1000, y + 40); x.textAlign = 'left';
  });
  return c;
}

/** Comparte la imagen (hoja de compartir del móvil) o, si no se puede, la descarga. Devuelve 'shared' | 'downloaded'. */
export async function shareSummary(d) {
  const canvas = drawSummary(d);
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
  if (!blob) throw new Error('No se pudo crear la imagen.');
  const file = new File([blob], 'mi-semana-seiri.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Mi semana de estudio' }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'shared'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'mi-semana-seiri.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
