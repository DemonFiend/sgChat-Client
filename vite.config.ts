import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  clearScreen: false,
  server: {
    port: 5174,
    host: host || true,
    strictPort: true,
    hmr: host ? { protocol: 'ws', host, port: 5174 } : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari14',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: {
          'solid-vendor': ['solid-js', '@solidjs/router'],
          livekit: ['livekit-client'],
          socket: ['socket.io-client'],
          query: ['@tanstack/solid-query'],
        },
      },
    },
  },
});
