// Tema claro / oscuro / automático (según el sistema). Se guarda en el dispositivo.
import { useEffect, useState } from 'react';

const KEY = 'organiza:theme';

export const getTheme = () => {
  try {
    return localStorage.getItem(KEY) || 'auto';
  } catch {
    return 'auto';
  }
};

function apply(theme) {
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* sin almacenamiento: se aplica igualmente en esta sesión */
  }
  apply(theme);
}

export function useTheme() {
  const [theme, set] = useState(getTheme);
  useEffect(() => {
    apply(theme);
    if (theme !== 'auto') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('auto');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
  return [theme, (t) => { setTheme(t); set(t); }];
}
