import * as SecureStore from 'expo-secure-store';

const BASE_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? '')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync('jwt');
}

async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync('refreshToken');
}

async function getUserId(): Promise<string | null> {
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
// No individual screen ever needs to build ?zoneId= query params.

interface MobileActiveScope {
  zoneId: string | null;
  zoneCode?: string | null;
  scope: 'global' | 'zone';
}

let _mobileTenantScope: MobileActiveScope = { zoneId: null, zoneCode: null, scope: 'global' };

export function setMobileTenantScope(scope: MobileActiveScope): void {
  _mobileTenantScope = scope;
}

export function getMobileTenantScope(): MobileActiveScope {
  return _mobileTenantScope;
}
// ────────────────────────────────────────────────────────────────────────────

async function refreshSession(): Promise<string> {
  const [refreshToken, userId] = await Promise.all([getRefreshToken(), getUserId()]);

  if (!refreshToken || !userId) {
    throw new SessionExpiredError();
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, userId }),
  });

  if (!res.ok) {
    await clearTokens();
    throw new SessionExpiredError();
  }

  const body = await res.json();
  await storeTokens(body.data.accessToken, body.data.refreshToken, userId);
  return body.data.accessToken;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // ── TENANT SCOPE HEADERS (same pattern as web client) ────────────────────
  const scope = getMobileTenantScope();
  if (scope.zoneId) {
    headers['x-zone-id'] = scope.zoneId;
  }
  if (scope.zoneCode) {
    headers['x-zone-code'] = scope.zoneCode;
  }
  headers['x-scope'] = scope.scope;
  // ─────────────────────────────────────────────────────────────────────────

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 && !retried) {
    const newToken = await refreshSession();
    const retryRes = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}`, ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (retryRes.status === 401) {
      await clearTokens();
      throw new SessionExpiredError();
    }
    return retryRes.json() as Promise<T>;
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  /** Call this when user switches zones in ZoneContext. All future requests carry correct headers. */
  setMobileTenantScope,
};
