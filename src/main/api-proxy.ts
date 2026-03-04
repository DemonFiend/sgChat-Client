import { net } from 'electron';
import { getServerUrl, getAccessToken } from './store';
import { refreshAccessToken } from './auth';
import {
  encrypt, decrypt, isEncryptedPayload,
  getSessionId, hasActiveSession, isExemptPath,
  handleSessionExpired,
} from './crypto';

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
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Encryption: add session header + encrypt body
    const cryptoActive = hasActiveSession() && !isExemptPath(path);
    let requestBody: string | undefined;

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      if (cryptoActive) {
        headers['X-Crypto-Session'] = getSessionId()!;
        requestBody = JSON.stringify(encrypt(body));
      } else {
        requestBody = JSON.stringify(body);
      }
    } else if (cryptoActive) {
      headers['X-Crypto-Session'] = getSessionId()!;
    }

    return net.fetch(`${serverUrl}${path}`, {
      method,
      headers,
      body: requestBody,
    });
  };

  try {
    let res = await doFetch(token);

    // Handle 401: check for CRYPTO_SESSION_EXPIRED before normal token refresh
    if (res.status === 401) {
      let handled = false;

      try {
        const cloned = res.clone();
        const errBody = await cloned.json();
        if (errBody.code === 'CRYPTO_SESSION_EXPIRED') {
          await handleSessionExpired();
          res = await doFetch(token);
          handled = true;
        }
      } catch {
        // Could not parse error body; fall through to token refresh
      }

      if (!handled && token) {
        try {
          const newToken = await refreshAccessToken();
          res = await doFetch(newToken);
        } catch {
          return { ok: false, status: 401, data: null, error: 'Authentication expired' };
        }
      }
    }

    const contentType = res.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await res.json();
      // Decryption: unwrap encrypted response
      if (isEncryptedPayload(data)) {
        data = decrypt(data);
      }
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: typeof data === 'object'
          ? data.message || data.error || `Request failed (${res.status})`
          : `Request failed (${res.status})`,
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
  const cryptoActive = hasActiveSession() && !isExemptPath(path);

  try {
    if (cryptoActive) {
      // Encrypted upload: base64-encode file, wrap, encrypt
      const filePayload = {
        _fileUpload: true,
        filename: fileName,
        mimetype: mimeType,
        data: fileBuffer.toString('base64'),
        fields: {},
      };

      const encryptedBody = JSON.stringify(encrypt(filePayload));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Crypto-Session': getSessionId()!,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await net.fetch(`${serverUrl}${path}`, {
        method: 'POST',
        headers,
        body: encryptedBody,
      });

      let data = await res.json().catch(() => null);
      if (isEncryptedPayload(data)) {
        data = decrypt(data);
      }

      if (!res.ok) {
        return { ok: false, status: res.status, data, error: data?.message || `Upload failed (${res.status})` };
      }
      return { ok: true, status: res.status, data };
    } else {
      // Existing multipart upload path (unchanged)
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
    }
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err.message || 'Upload error' };
  }
}
