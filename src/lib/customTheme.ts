/**
 * Custom Theme System
 * Users can create, edit, import/export their own themes.
 * Custom themes are stored as JSON objects mapping CSS variable names to values.
 */

import { tauriGet, tauriSet } from './tauri';

const CUSTOM_THEMES_KEY = 'sgchat-custom-themes';

export interface CustomTheme {
  id: string;
  name: string;
  author: string;
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

/**
 * All CSS variable names that themes can customize
 */
export const THEME_VARIABLES = [
  // Backgrounds
  '--color-bg-primary',
  '--color-bg-secondary',
  '--color-bg-tertiary',
  '--color-bg-modifier-hover',
  '--color-bg-modifier-active',
  '--color-bg-modifier-selected',
  // Text
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-muted',
  '--color-text-link',
  // Interactive
  '--color-interactive-normal',
  '--color-interactive-hover',
  '--color-interactive-active',
  '--color-interactive-muted',
  // Accent / Brand
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-active',
  '--color-brand-primary',
  '--color-brand-primary-hover',
  // Status
  '--color-success',
  '--color-warning',
  '--color-danger',
  '--color-info',
  // Online status
  '--color-status-online',
  '--color-status-idle',
  '--color-status-dnd',
  '--color-status-offline',
  // Borders
  '--color-border',
  '--color-border-strong',
  '--color-divider',
  // Scrollbar
  '--color-scrollbar-thumb',
  '--color-scrollbar-track',
] as const;

export const THEME_VARIABLE_GROUPS = {
  'Backgrounds': [
    '--color-bg-primary',
    '--color-bg-secondary',
    '--color-bg-tertiary',
    '--color-bg-modifier-hover',
    '--color-bg-modifier-active',
    '--color-bg-modifier-selected',
  ],
  'Text': [
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-muted',
    '--color-text-link',
  ],
  'Interactive': [
    '--color-interactive-normal',
    '--color-interactive-hover',
    '--color-interactive-active',
    '--color-interactive-muted',
  ],
  'Accent & Brand': [
    '--color-accent',
    '--color-accent-hover',
    '--color-accent-active',
    '--color-brand-primary',
    '--color-brand-primary-hover',
  ],
  'Status Colors': [
    '--color-success',
    '--color-warning',
    '--color-danger',
    '--color-info',
  ],
  'Online Status': [
    '--color-status-online',
    '--color-status-idle',
    '--color-status-dnd',
    '--color-status-offline',
  ],
  'Borders': [
    '--color-border',
    '--color-border-strong',
    '--color-divider',
  ],
  'Scrollbar': [
    '--color-scrollbar-thumb',
    '--color-scrollbar-track',
  ],
} as const;

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get all saved custom themes
 */
export async function getCustomThemes(): Promise<CustomTheme[]> {
  return tauriGet<CustomTheme[]>(CUSTOM_THEMES_KEY, []);
}

/**
 * Get a specific custom theme by ID
 */
export async function getCustomTheme(id: string): Promise<CustomTheme | null> {
  const themes = await getCustomThemes();
  return themes.find((t) => t.id === id) || null;
}

/**
 * Save a custom theme (create or update)
 */
export async function saveCustomTheme(theme: CustomTheme): Promise<void> {
  const themes = await getCustomThemes();
  const existingIndex = themes.findIndex((t) => t.id === theme.id);

  if (existingIndex >= 0) {
    themes[existingIndex] = { ...theme, updatedAt: new Date().toISOString() };
  } else {
    themes.push(theme);
  }

  await tauriSet(CUSTOM_THEMES_KEY, themes);
}

/**
 * Create a new custom theme from scratch
 */
export async function createCustomTheme(
  name: string,
  author: string,
  variables: Record<string, string>
): Promise<CustomTheme> {
  const now = new Date().toISOString();
  const theme: CustomTheme = {
    id: generateId(),
    name,
    author,
    variables,
    createdAt: now,
    updatedAt: now,
  };

  await saveCustomTheme(theme);
  return theme;
}

/**
 * Delete a custom theme by ID
 */
export async function deleteCustomTheme(id: string): Promise<void> {
  const themes = await getCustomThemes();
  const filtered = themes.filter((t) => t.id !== id);
  await tauriSet(CUSTOM_THEMES_KEY, filtered);
}

/**
 * Apply a custom theme to the document
 */
export function applyCustomTheme(theme: CustomTheme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'custom');

  for (const [key, value] of Object.entries(theme.variables)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Remove custom theme overrides from the document
 */
export function removeCustomThemeOverrides(): void {
  const root = document.documentElement;
  root.removeAttribute('style');
}

/**
 * Extract current computed theme variables from the document
 * Useful for duplicating a built-in theme as starting point
 */
export function extractCurrentThemeVariables(): Record<string, string> {
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  const variables: Record<string, string> = {};

  for (const varName of THEME_VARIABLES) {
    const value = computed.getPropertyValue(varName).trim();
    if (value) {
      variables[varName] = value;
    }
  }

  return variables;
}

/**
 * Duplicate a built-in theme as a new custom theme
 */
export async function duplicateBuiltInTheme(
  themeName: string,
  author: string,
  builtInTheme: string
): Promise<CustomTheme> {
  // Temporarily apply the built-in theme to extract its variables
  const currentTheme = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', builtInTheme);

  // Force reflow to compute styles
  void document.documentElement.offsetHeight;

  const variables = extractCurrentThemeVariables();

  // Restore current theme
  if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }

  return createCustomTheme(themeName, author, variables);
}

/**
 * Export a custom theme as a JSON string (for file saving)
 */
export function exportThemeToJson(theme: CustomTheme): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * Import a custom theme from a JSON string
 * Validates the structure before importing
 */
export async function importThemeFromJson(json: string): Promise<CustomTheme> {
  const parsed = JSON.parse(json);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid theme format');
  }

  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('Theme must have a name');
  }

  if (!parsed.variables || typeof parsed.variables !== 'object') {
    throw new Error('Theme must have variables');
  }

  // Create a new theme with a fresh ID
  const now = new Date().toISOString();
  const theme: CustomTheme = {
    id: generateId(),
    name: parsed.name,
    author: parsed.author || 'Imported',
    variables: parsed.variables,
    createdAt: now,
    updatedAt: now,
  };

  await saveCustomTheme(theme);
  return theme;
}
