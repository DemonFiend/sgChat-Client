import { createTheme, MantineColorsTuple } from '@mantine/core';

// sgChat brand purple
const brand: MantineColorsTuple = [
  '#eef0ff',
  '#dce0f9',
  '#b5bcf0',
  '#8b96e8',
  '#6875e1',
  '#5260de',
  '#4754dd',
  '#3945c4',
  '#303db0',
  '#23349b',
];

export const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand,
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2b2d31',
      '#25262b',
      '#1a1b1e',
      '#141517',
      '#111214',
    ],
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
  other: {
    headerHeight: 32,
    serverSidebarWidth: 72,
    channelSidebarWidth: 240,
    memberListWidth: 240,
  },
});
