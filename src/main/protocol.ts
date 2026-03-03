import { protocol, net } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs';

// MUST be called before app.whenReady()
export function registerAppProtocol(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: false,
        corsEnabled: false,
      },
    },
  ]);
}

// Called AFTER app.whenReady()
export function handleAppProtocol(): void {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let filePath = decodeURIComponent(url.pathname);

    // SPA fallback: serve index.html for any path that doesn't map to a real file
    if (filePath === '/' || filePath === '') {
      filePath = '/index.html';
    }

    const rendererDir = path.join(__dirname, '../renderer');
    let resolvedPath = path.resolve(path.join(rendererDir, filePath));

    // Security: prevent directory traversal
    if (!resolvedPath.startsWith(path.resolve(rendererDir))) {
      return new Response('Forbidden', { status: 403 });
    }

    // SPA fallback: if file doesn't exist, serve index.html (for React Router)
    if (!fs.existsSync(resolvedPath)) {
      resolvedPath = path.join(rendererDir, 'index.html');
    }

    return net.fetch(pathToFileURL(resolvedPath).toString());
  });
}
