export type Theme = 'light' | 'dark';

export const THEME_KEY = 'gtr-theme';

export const parseTheme = (raw: unknown): Theme | null => (raw === 'light' || raw === 'dark' ? raw : null);

// No saved choice means follow the OS, so the page looks the way it did before the toggle existed.
export const resolveTheme = (stored: Theme | null, systemDark: boolean): Theme => stored ?? (systemDark ? 'dark' : 'light');

export const otherTheme = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark');
