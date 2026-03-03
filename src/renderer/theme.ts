import { createTheme, MantineColorsTuple } from '@mantine/core';

// Green palette for primary brand color
const brand: MantineColorsTuple = [
  '#e6fff0',
  '#d0f5e0',
  '#a3e8c1',
  '#72dba0',
  '#4ade80',
  '#33d670',
  '#22c55e',
  '#16a34a',
  '#0e8a3e',
  '#047030',
];

export const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand,
    dark: [
      '#e8f5e9',
      '#a5d6a7',
      '#6d9b7a',
      '#4a6b5a',
      '#2d4a3f',
      '#243830',
      '#1e2b27',
      '#1a2420',
      '#152019',
      '#0f1813',
    ],
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
  other: {
    headerHeight: 32,
    channelSidebarWidth: 240,
    memberListWidth: 240,
  },
});
