import { create } from 'zustand';

export type ThemeName = 'green' | 'midnight' | 'dark' | 'light' | 'oled' | 'nord';

const ALL_THEMES: ThemeName[] = ['green', 'midnight', 'dark', 'light', 'oled', 'nord'];
const STORAGE_KEY = 'sgchat-theme';

function applyTheme(theme: ThemeName) {
  document.documentElement.classList.add('no-theme-transition');
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('no-theme-transition');
  });
}

function getInitialTheme(): ThemeName {
  if (typeof localStorage === 'undefined') return 'green';
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
  if (stored && ALL_THEMES.includes(stored)) return stored;
  return 'green';
}

const initial = getInitialTheme();

// Apply on load
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', initial);
}

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const currentIndex = ALL_THEMES.indexOf(get().theme);
    const nextTheme = ALL_THEMES[(currentIndex + 1) % ALL_THEMES.length];
    applyTheme(nextTheme);
    set({ theme: nextTheme });
  },
}));

export function isDarkTheme(theme: ThemeName): boolean {
  return theme !== 'light';
}

export function getAvailableThemes(): ThemeName[] {
  return ALL_THEMES;
}

export const themeNames: Record<ThemeName, string> = {
  green: 'Soft Green',
  midnight: 'Midnight',
  dark: 'Dark',
  light: 'Light',
  oled: 'OLED Black',
  nord: 'Nord',
};
