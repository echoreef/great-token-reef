import { useEffect, useState } from 'react';
import { THEME_KEY, otherTheme, parseTheme, resolveTheme, type Theme } from '../lib/theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

// Storage can throw (private mode, blocked site data); the toggle then works for this page view only.
const readStored = (): Theme | null => {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return null;
  }
};

export function ThemeToggle() {
  const [stored, setStored] = useState<Theme | null>(readStored);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);
  const theme = resolveTheme(stored, systemDark);

  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = () => {
    const next = otherTheme(theme);
    setStored(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // not persisted; the choice still applies until reload
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${otherTheme(theme)} mode`}
      title={`Switch to ${otherTheme(theme)} mode`}
      className="rounded-md px-2 py-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
