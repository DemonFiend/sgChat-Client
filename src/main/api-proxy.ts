import { net } from 'electron';
import { getServerUrl, getAccessToken } from './store';
import { refreshAccessToken } from './auth';

interface ApiResponse {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
}

export async function apiRequest(
  method: string,
  path: string,
  body?: any
): Promise<ApiResponse> {
  const serverUrl = getServerUrl();
  if (!serverUrl) {
    return { ok: false, status: 0, data: null, error: 'No server URL configured' };
  }

  let token = getAccessToken();

  const doFetch = async (authToken: string): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return net.fetch(`${serverUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  try {
    let res = await doFetch(token);

    // Auto-refresh on 401
    if (res.status === 401 && token) {
      try {
        const newToken = await refreshAccessToken();
        res = await doFetch(newToken);
      } catch {
        return { ok: false, status: 401, data: null, error: 'Authentication expired' };
      }
    }

    const contentType = res.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: typeof data === 'object' ? data.message || data.error || `Request failed (${res.status})` : `Request failed (${res.status})`,
      };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err.message || 'Network error' };
  }
}

export async function apiUpload(
  path: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ApiResponse> {
  const serverUrl = getServerUrl();
  if (!serverUrl) {
    return { ok: false, status: 0, data: null, error: 'No server URL configured' };
  }

  const token = getAccessToken();

  try {
    // Build multipart form in Node.js
    const boundary = `----FormBoundary${Date.now()}`;
    const preamble = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
    const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`);
    const bodyBuffer = Buffer.concat([preamble, fileBuffer, epilogue]);

    const headers: Record<string, string> = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await net.fetch(`${serverUrl}${path}`, {
      method: 'POST',
      headers,
      body: bodyBuffer,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, data, error: data?.message || `Upload failed (${res.status})` };
    }
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err.message || 'Upload error' };
  }
}
