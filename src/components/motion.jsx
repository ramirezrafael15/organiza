// Piezas con movimiento: anillo de progreso, contador y explosión de confeti al marcar algo.
import { useEffect, useState } from 'react';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Número que sube desde 0 hasta `to`. */
export function useCountUp(to, ms = 800) {
  const [n, setN] = useState(reduced() ? to : 0);
  useEffect(() => {
    if (reduced()) { setN(to); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

/** Anillo de progreso: el trazo se dibuja al aparecer; en el centro, el porcentaje. */
export function Ring({ value = 0, color = 'var(--primary)', size = 64, label }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(reduced() ? value : 0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const shown = useCountUp(value);
  return (
    <div className="ring" style={{ width: size, height: size, '--c': color }} role="img" aria-label={`${value}% ${label ?? ''}`}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle cx="50" cy="50" r={r} className="ring-bar" strokeDasharray={c} strokeDashoffset={c * (1 - drawn / 100)} />
      </svg>
      <div className="ring-num"><b>{shown}</b><span>%</span></div>
    </div>
  );
}

/** Chispas que salen del elemento (al marcar algo como hecho). */
export function burst(el, count = 10) {
  if (!el || reduced()) return;
  const colors = ['var(--text)', 'var(--primary-2)'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const d = 26 + Math.random() * 20;
    s.className = 'spark';
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
    s.style.background = colors[i % colors.length];
    el.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }
}
