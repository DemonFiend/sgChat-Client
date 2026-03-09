// Thin typed wrapper over the Electron IPC API proxy.
// All REST calls go: renderer → IPC → main process → server (with JWT injection).

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

const electronAPI = (window as any).electronAPI;

async function request<T = any>(method: string, path: string, body?: any): Promise<T> {
  const res: ApiResponse<T> = await electronAPI.api.request(method, path, body);
  if (!res.ok) {
    throw new ApiError(res.error || `Request failed (${res.status})`, res.status, res.data);
  }
  return res.data;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T = any>(path: string, body?: any) => request<T>('PUT', path, body),
  patch: <T = any>(path: string, body?: any) => request<T>('PATCH', path, body),
  delete: <T = any>(path: string, body?: any) => request<T>('DELETE', path, body),

  upload: async <T = any>(path: string, file: File, extraFields?: Record<string, string>): Promise<T> => {
    const buffer = await file.arrayBuffer();
    const res: ApiResponse<T> = await electronAPI.api.upload(path, buffer, file.name, file.type, extraFields);
    if (!res.ok) {
      throw new ApiError(res.error || 'Upload failed', res.status, res.data);
    }
    return res.data;
  },
};
