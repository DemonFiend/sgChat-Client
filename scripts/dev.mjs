import { spawn } from 'child_process';
import { watch } from 'chokidar';
import { build } from 'esbuild';
import path from 'path';

const mainEntry = 'src/main/index.ts';
const preloadEntry = 'src/preload/index.ts';

const esbuildOptions = {
  bundle: true,
  platform: 'node',
  external: ['electron'],
  format: 'cjs',
  sourcemap: true,
};

let electronProcess = null;

async function buildMain() {
  await build({
    ...esbuildOptions,
    entryPoints: [mainEntry],
    outdir: 'dist/main',
  });
  console.log('[dev] Main process built');
}

async function buildPreload() {
  await build({
    ...esbuildOptions,
    entryPoints: [preloadEntry],
    outdir: 'dist/preload',
  });
  console.log('[dev] Preload script built');
}

function startElectron() {
  if (electronProcess) {
    electronProcess.kill();
    electronProcess = null;
  }

  electronProcess = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' },
  });

  electronProcess.on('close', (code) => {
    if (code !== null) {
      console.log(`[dev] Electron exited with code ${code}`);
      process.exit(0);
    }
  });
}

async function dev() {
  console.log('[dev] Building...');
  await Promise.all([buildMain(), buildPreload()]);

  console.log('[dev] Starting Electron...');
  startElectron();

  // Watch for changes and rebuild
  const watcher = watch(['src/**/*.ts'], {
    ignoreInitial: true,
  });

  watcher.on('change', async (filePath) => {
    console.log(`[dev] Changed: ${filePath}`);
    try {
      if (filePath.includes(path.normalize('src/preload'))) {
        await buildPreload();
        console.log('[dev] Preload rebuilt — reload the window to apply');
      } else {
        await buildMain();
        console.log('[dev] Main rebuilt — restarting Electron...');
        startElectron();
      }
    } catch (err) {
      console.error('[dev] Build error:', err.message);
    }
  });
}

dev().catch((err) => {
  console.error(err);
  process.exit(1);
});
