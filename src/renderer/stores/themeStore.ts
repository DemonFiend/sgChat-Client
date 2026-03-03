import { create } from 'zustand';

export type ThemeName = 'green' | 'midnight' | 'light';

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sgchat-theme', theme);
}

const saved = (typeof localStorage !== 'undefined'
  ? localStorage.getItem('sgchat-theme') as ThemeName
  : null) || 'green';

// Apply on load
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', saved);
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: saved,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));

export function isDarkTheme(theme: ThemeName): boolean {
  return theme !== 'light';
}
