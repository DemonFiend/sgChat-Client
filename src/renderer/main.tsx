import './browser-shim';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme';
import { useThemeStore, isDarkTheme } from './stores/themeStore';
import { App } from './App';
import './styles/globals.css';

function Root() {
  const currentTheme = useThemeStore((s) => s.theme);
  const colorScheme = isDarkTheme(currentTheme) ? 'dark' : 'light';

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme} forceColorScheme={colorScheme}>
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
