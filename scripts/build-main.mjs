import { build } from 'esbuild';

await build({
  entryPoints: ['src/main/index.ts'],
  bundle: true,
  platform: 'node',
  external: ['electron', 'application-loopback'],
  format: 'cjs',
  sourcemap: true,
  outfile: 'dist/main/index.cjs',
});
