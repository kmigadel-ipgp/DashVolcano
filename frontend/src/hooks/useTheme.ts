import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

/**
 * Colour theme (light by default). The choice lives in memory only and is
 * reflected on <html data-theme>, which the CSS tokens in index.css read.
 */
export const useTheme = create<ThemeState>((set) => ({
  theme: 'light',
  toggleTheme: () =>
    set((state) => {
      const theme: Theme = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      return { theme };
    }),
}));
