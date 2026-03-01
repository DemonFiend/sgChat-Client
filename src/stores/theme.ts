import { createSignal, createRoot } from 'solid-js';
import { tauriGet, tauriSet } from '../lib/tauri';

export type Theme = 'dark' | 'light' | 'oled' | 'nord' | 'modern' | 'custom';

const STORAGE_KEY = 'sgchat-theme';
const CUSTOM_THEME_ID_KEY = 'sgchat-custom-theme-id';

function getInitialTheme(): Theme {
  // Default to nord — will be overridden by hydrate() from Tauri store
  return 'nord';
}

function applyTheme(newTheme: Theme) {
  if (newTheme !== 'custom') {
    // Remove any custom CSS variable overrides
    const root = document.documentElement;
    root.removeAttribute('style');
    root.setAttribute('data-theme', newTheme);
  }
}

const { theme, setTheme, toggleTheme, customThemeId, setCustomThemeId, hydrateTheme } = createRoot(() => {
  const [themeSignal, setThemeSignal] = createSignal<Theme>(getInitialTheme());
  const [customThemeIdSignal, setCustomThemeIdSignal] = createSignal<string | null>(null);

  if (typeof window !== 'undefined') {
    applyTheme(themeSignal());
  }

  const setThemeValue = (newTheme: Theme) => {
    setThemeSignal(newTheme);
    applyTheme(newTheme);
    tauriSet(STORAGE_KEY, newTheme);
  };

  const toggleThemeValue = () => {
    const themes: Theme[] = ['dark', 'light', 'oled', 'nord', 'modern'];
    const currentIndex = themes.indexOf(themeSignal());
    const nextIndex = (currentIndex + 1) % themes.length;
    setThemeValue(themes[nextIndex]);
  };

  const setCustomThemeIdValue = (id: string | null) => {
    setCustomThemeIdSignal(id);
    tauriSet(CUSTOM_THEME_ID_KEY, id);
  };

  const hydrateThemeValue = async () => {
    const storedTheme = await tauriGet<Theme>(STORAGE_KEY, 'nord');
    const storedCustomId = await tauriGet<string | null>(CUSTOM_THEME_ID_KEY, null);
    setThemeSignal(storedTheme);
    setCustomThemeIdSignal(storedCustomId);
    applyTheme(storedTheme);
  };

  return {
    theme: themeSignal,
    setTheme: setThemeValue,
    toggleTheme: toggleThemeValue,
    customThemeId: customThemeIdSignal,
    setCustomThemeId: setCustomThemeIdValue,
    hydrateTheme: hydrateThemeValue,
  };
});

export const themeNames: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
  oled: 'OLED Black',
  nord: 'Nord',
  modern: 'Modern',
  custom: 'Custom',
};

export { theme, setTheme, toggleTheme, customThemeId, setCustomThemeId, hydrateTheme };
