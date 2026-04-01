import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    target: 'chrome130',
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/renderer/index.html'),
      output: {
        manualChunks: {
          'mantine': ['@mantine/core', '@mantine/hooks', '@mantine/notifications'],
          'livekit': ['livekit-client'],
          'query': ['@tanstack/react-query'],
          'icons': ['@tabler/icons-react'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Browser-mode proxy: forwards REST API calls to the QA server
      // Uses a regex to avoid intercepting source file imports (api/socket.ts etc.)
      '^/api/(?!.*\\.(ts|tsx|js|jsx|css|map)$)': {
        target: 'http://localhost:3124',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3124',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:3124',
        changeOrigin: true,
      },
      // LiveKit WebSocket proxy — rewrites /livekit-ws → ws://localhost:7880
      // The browser shim rewrites livekit_url to use this path
      '/livekit-ws': {
        target: 'ws://localhost:7880',
        ws: true,
        rewrite: (path: string) => path.replace(/^\/livekit-ws/, ''),
      },
    },
  },
});
