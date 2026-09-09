import * as SecureStore from 'expo-secure-store';

const BASE_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'https://rehearsalhub-api-production-6a17.up.railway.app')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const API_KEY = process.env.EXPO_PUBLIC_INTERNAL_API_KEY ?? '';

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

type SessionExpiredHandler = () => void;
let _sessionExpiredHandlers: SessionExpiredHandler[] = [];

export function onSessionExpired(handler: SessionExpiredHandler): () => void {
  _sessionExpiredHandlers.push(handler);
  return () => {
    _sessionExpiredHandlers = _sessionExpiredHandlers.filter(h => h !== handler);
  };
}

export function notifySessionExpired(): void {
  _sessionExpiredHandlers.forEach(h => {
    try { h(); } catch (e) { console.error('[apiClient] Session expired handler error:', e); }
  });
}

const apiGetCache = new Map<string, any>();

export function clearCache(): void {
  apiGetCache.clear();
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync('jwt');
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync('refreshToken');
}

export async function getUserId(): Promise<string | null> {
  return SecureStore.getItemAsync('userId');
}

export async function storeTokens(accessToken: string, refreshToken: string, userId: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync('jwt', accessToken),
    SecureStore.setItemAsync('refreshToken', refreshToken),
    SecureStore.setItemAsync('userId', userId),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync('jwt'),
    SecureStore.deleteItemAsync('refreshToken'),
    SecureStore.deleteItemAsync('userId'),
  ]);
}

// ── TENANT SCOPE STORE ───────────────────────────────────────────────────────
// ZoneContext writes here whenever the admin switches zones.
// The request function reads from here and injects headers on every request.

interface MobileActiveScope {
  zoneId: string | null;
  zoneCode?: string | null;
  churchId?: string | null;
  scope: 'global' | 'zone' | 'church';
}

let _mobileTenantScope: MobileActiveScope = { zoneId: null, zoneCode: null, churchId: null, scope: 'global' };

export function setMobileTenantScope(scope: MobileActiveScope): void {
  _mobileTenantScope = scope;
}

export function getMobileTenantScope(): MobileActiveScope {
  return _mobileTenantScope;
}
// ────────────────────────────────────────────────────────────────────────────

let _refreshPromise: Promise<string> | null = null;

async function refreshSession(): Promise<string> {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    try {
      const [refreshToken, userId] = await Promise.all([getRefreshToken(), getUserId()]);

      if (!refreshToken || !userId) {
        throw new SessionExpiredError();
      }

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({ refreshToken, userId }),
      });

      if (res.status === 401 || res.status === 403) {
        await clearTokens();
        throw new SessionExpiredError();
      }

      if (!res.ok) {
        throw new Error(`Server temporarily unavailable (${res.status})`);
      }

      const body = await res.json();
      if (body?.data?.accessToken) {
        await storeTokens(body.data.accessToken, body.data.refreshToken || refreshToken, userId);
        return body.data.accessToken;
      }
      throw new Error('Invalid refresh response');
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
  timeoutMs = 25000,
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // ── TENANT SCOPE HEADERS ──────────────────────────────────────────────────
  const scope = getMobileTenantScope();
  if (scope.zoneId) {
    headers['x-zone-id'] = scope.zoneId;
  }
  if (scope.zoneCode) {
    headers['x-zone-code'] = scope.zoneCode;
  }
  if (scope.churchId) {
    headers['x-church-id'] = scope.churchId;
  }
  headers['x-scope'] = scope.scope;
  // ─────────────────────────────────────────────────────────────────────────

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    clearTimeout(timeoutId);

    const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');

    if (res.status === 401 && !isAuthRoute && !retried) {
      try {
        const newToken = await refreshSession();
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), timeoutMs);

        const retryRes = await fetch(`${BASE_URL}${path}`, {
          method,
          headers: { ...headers, Authorization: `Bearer ${newToken}` },
          signal: retryController.signal,
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });

        clearTimeout(retryTimeoutId);

        if (retryRes.status === 401 || retryRes.status === 403) {
          await clearTokens();
          throw new SessionExpiredError();
        }

        let data: any = null;
        try {
          data = await retryRes.json();
        } catch {
          data = { success: retryRes.ok };
        }

        if (method === 'GET' && data?.success !== false) {
          apiGetCache.set(path, data);
        }
        return data as T;
      } catch (refreshErr) {
        if (refreshErr instanceof SessionExpiredError) {
          throw refreshErr;
        }
        console.warn(`[apiClient] Refresh attempt failed for ${path}:`, refreshErr);
        throw refreshErr;
      }
    }

    let json: any = null;
    const text = await res.text();
    if (text && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { success: res.ok, data: null };
      }
    } else {
      json = { success: res.ok, data: null };
    }

    if (method !== 'GET') {
      if (!res.ok || (json && json.success === false)) {
        const errMsg = json?.error || json?.message || `Request failed (${res.status})`;
        console.warn(`[apiClient] ${method} ${path} failed:`, errMsg);
        const err = new Error(errMsg);
        (err as any).status = res.status;
        (err as any).data = json;
        throw err;
      }
      apiGetCache.clear();
    } else if (json?.success !== false && json?.data !== undefined) {
      apiGetCache.set(path, json);
    }

    return json as T;
  } catch (netErr: any) {
    clearTimeout(timeoutId);
    if (netErr?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    if (method === 'GET' && apiGetCache.has(path)) {
      console.warn(`[apiClient] Network drop. Serving cached response for ${path}`);
      return apiGetCache.get(path) as T;
    }
    throw netErr;
  }
}

/** Multipart FormData upload for media files and assets */
async function uploadRequest<T>(
  path: string,
  formData: FormData,
  timeoutMs = 60000,
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'x-api-key': API_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const scope = getMobileTenantScope();
  if (scope.zoneId) headers['x-zone-id'] = scope.zoneId;
  if (scope.zoneCode) headers['x-zone-code'] = scope.zoneCode;
  if (scope.churchId) headers['x-church-id'] = scope.churchId;
  headers['x-scope'] = scope.scope;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: formData,
    });

    clearTimeout(timeoutId);

    const json = await res.json();
    if (!res.ok || json?.success === false) {
      throw new Error(json?.error || json?.message || 'Upload failed');
    }
    apiGetCache.clear();
    return json as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Upload timed out. Check your network connection.');
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, timeoutMs?: number) => request<T>('POST', path, body, false, timeoutMs),
  patch: <T>(path: string, body?: unknown, timeoutMs?: number) => request<T>('PATCH', path, body, false, timeoutMs),
  delete: <T>(path: string, body?: unknown, timeoutMs?: number) => request<T>('DELETE', path, body, false, timeoutMs),
  upload: <T>(path: string, formData: FormData, timeoutMs?: number) => uploadRequest<T>(path, formData, timeoutMs),
  storeTokens,
  clearTokens,
  clearCache,
  getBaseUrl: () => BASE_URL,
  setMobileTenantScope,
  getMobileTenantScope,
};

export { BASE_URL };
