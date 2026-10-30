import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'dashvolcano-theme';

/** Saved choice, else the system preference, else light */
const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage blocked (private mode, disabled site data): fall through
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
};

const initialTheme = getInitialTheme();
// Applied at module load, before the first React render, to avoid a flash
applyTheme(initialTheme);

/**
 * Colour theme, reflected on <html data-theme> (read by the CSS tokens in
 * index.css). The user's choice is remembered in localStorage when available.
 */
export const useTheme = create<ThemeState>((set) => ({
  theme: initialTheme,
  toggleTheme: () =>
    set((state) => {
      const theme: Theme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(theme);
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // Not persisted when storage is unavailable; the toggle still works
      }
      return { theme };
    }),
}));
