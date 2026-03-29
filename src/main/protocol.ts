import { protocol, net } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

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

    // Serve with correct MIME type — net.fetch(fileURL) doesn't always set it
    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType = MIME_TYPES[ext];

    const fileUrl = pathToFileURL(resolvedPath).toString();
    if (mimeType) {
      return net.fetch(fileUrl).then((response) => {
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: { ...Object.fromEntries(response.headers.entries()), 'Content-Type': mimeType },
        });
      });
    }

    return net.fetch(fileUrl);
  });
}
