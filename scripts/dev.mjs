import { spawn } from 'child_process';
import { createServer } from 'vite';
import { build } from 'esbuild';
import { watch } from 'chokidar';
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

function startElectron(devServerUrl) {
  if (electronProcess) {
    electronProcess.kill();
    electronProcess = null;
  }

  electronProcess = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: devServerUrl,
    },
  });

  electronProcess.on('close', (code) => {
    if (code !== null) {
      console.log(`[dev] Electron exited with code ${code}`);
      process.exit(0);
    }
  });
}

async function dev() {
  // 1. Start Vite dev server for the renderer
  console.log('[dev] Starting Vite dev server...');
  const viteServer = await createServer({
    configFile: path.resolve('vite.config.ts'),
  });
  await viteServer.listen();
  const devServerUrl = `http://localhost:${viteServer.config.server.port}`;
  console.log(`[dev] Vite ready at ${devServerUrl}`);

  // 2. Build main + preload with esbuild
  console.log('[dev] Building main + preload...');
  await Promise.all([buildMain(), buildPreload()]);

  // 3. Start Electron with dev server URL
  console.log('[dev] Starting Electron...');
  startElectron(devServerUrl);

  // 4. Watch main/preload for changes (renderer is handled by Vite HMR)
  const watcher = watch(['src/main/**/*.ts', 'src/preload/**/*.ts'], {
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
        startElectron(devServerUrl);
      }
    } catch (err) {
      console.error('[dev] Build error:', err.message);
    }
  });

  // Cleanup on exit
  process.on('SIGINT', async () => {
    if (electronProcess) electronProcess.kill();
    await viteServer.close();
    process.exit(0);
  });
}

dev().catch((err) => {
  console.error(err);
  process.exit(1);
});
