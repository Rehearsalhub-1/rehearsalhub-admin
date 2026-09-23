import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient, clearTokens, SessionExpiredError, setMobileTenantScope } from '../lib/apiClient';

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  role: 'hq_admin' | 'zone_admin' | 'church_admin';
  mode: 'zone' | 'church';
  zoneId: string;
  zoneName: string;
  churchId: string | null;
  churchName: string | null;
  churches: Array<{ id: string; name: string }>;
  isHQ: boolean;
  isDualRole: boolean;
}

function syncScopeFromSession(session: AdminSession | null) {
  if (!session) {
    setMobileTenantScope({ zoneId: null, zoneCode: null, churchId: null, scope: 'global' });
    return;
  }
  const isChurch = session.mode === 'church';
  setMobileTenantScope({
    zoneId: session.zoneId || null,
    churchId: isChurch ? session.churchId : null,
    scope: isChurch ? 'church' : (session.zoneId ? 'zone' : 'global'),
  });
}

interface AdminStore {
  session: AdminSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  bootstrap: () => Promise<void>;
  setMode: (mode: 'zone' | 'church') => Promise<void>;
  setChurch: (churchId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SESSION_KEY = 'admin_session_v2';

// Module-level Promise-based mutex: prevents concurrent bootstrap() executions.
// If a bootstrap is already in-flight, subsequent callers await it and return.
let _bootstrapPromise: Promise<void> | null = null;

export const useAdminStore = create<AdminStore>((set, get) => ({
  session: null,
  isAuthenticated: false,
  loading: true,

  bootstrap: async () => {
    // Mutex: if a bootstrap is already running, await it and return.
    if (_bootstrapPromise) {
      await _bootstrapPromise;
      return;
    }
    let resolve!: () => void;
    _bootstrapPromise = new Promise<void>(r => { resolve = r; });

    set({ loading: true });
    try {
      const token = await SecureStore.getItemAsync('jwt');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!token && !refreshToken) {
        syncScopeFromSession(null);
        set({ session: null, isAuthenticated: false, loading: false });
        return;
      }

      // Fast restore from cache for instant UI
      let hasCachedSession = false;
      try {
        const cached = await SecureStore.getItemAsync(SESSION_KEY);
        if (cached) {
          const s: AdminSession = JSON.parse(cached);
          const restored: AdminSession = { ...s, churches: s.churches || (s.churchId ? [{ id: s.churchId, name: s.churchName || 'Church' }] : []) };
          syncScopeFromSession(restored);
          set({ session: restored, isAuthenticated: true, loading: false });
          hasCachedSession = true;
        }
      } catch {}

      // Live fetch from /auth/me
      try {
        const meRes = await apiClient.get<{ success: boolean; data: any }>('/auth/me');
        if (!meRes?.data) {
          if (!hasCachedSession) {
            syncScopeFromSession(null);
            set({ session: null, isAuthenticated: false, loading: false });
          }
          return;
        }

        const raw = meRes.data;
        const rawRole = (raw.role || '').toLowerCase().trim();

        const isHQ =
          rawRole === 'hq_admin' ||
          rawRole === 'super_admin' ||
          Boolean(raw.hasHqAccess) ||
          Boolean(raw.has_hq_access);

        const isChurchOnly =
          rawRole === 'church_coordinator' ||
          rawRole === 'church_admin' ||
          rawRole === 'subgroup_admin' ||
          rawRole === 'subgroup_coordinator';

        let role: AdminSession['role'];
        if (isHQ) role = 'hq_admin';
        else if (isChurchOnly) role = 'church_admin';
        else role = 'zone_admin';

        // Extract memberships from /auth/me response
        const memberships: any[] = [];
        if (Array.isArray(raw.memberships)) {
          memberships.push(...raw.memberships);
        } else if (raw.legacyMemberships) {
          memberships.push(
            ...(raw.legacyMemberships.zoneMembers || []),
            ...(raw.legacyMemberships.hqMembers || [])
          );
        }

        // Primary zone from first active membership
        const primaryMem =
          memberships.find(m => m.status !== 'INACTIVE' && m.status !== 'inactive') ||
          memberships[0];
        const zoneId =
          primaryMem?.organizationId ||
          primaryMem?.zoneId ||
          raw.zoneId;

        if (!zoneId) {
          if (!hasCachedSession) {
            console.error('[AdminStore] No zoneId resolved — cannot build session');
            syncScopeFromSession(null);
            set({ session: null, isAuthenticated: false, loading: false });
          }
          return;
        }
        const zoneName =
          primaryMem?.organization?.name ||
          primaryMem?.zoneName ||
          raw.zoneName ||
          'Your Zone';

        // Only memberships with church-management roles can become admin workspaces.
        const churchAdminRoles = new Set([
          'church_admin', 'church_coordinator', 'subgroup_admin', 'subgroup_coordinator',
          'group_admin', 'group_coordinator', 'coordinator',
        ]);
        const adminChurchMemberships = memberships.filter(m =>
          churchAdminRoles.has(String(m.role || '').toLowerCase())
        );
        const churches = adminChurchMemberships
          .map(m => ({
            id: String(m.groupId || m.group?.id || ''),
            name: m.group?.name || m.groupName || 'Church',
          }))
          .filter((church, index, list) => church.id && list.findIndex(item => item.id === church.id) === index);
        const churchMem = churches.find(church => church.id === get().session?.churchId) || churches[0];
        const churchId =
          churchMem?.id ||
          raw.churchId ||
          null;
        const churchName =
          churchMem?.name ||
          raw.churchName ||
          null;

        const hasZoneRole = role === 'hq_admin' || role === 'zone_admin';
        const hasChurchRole = role === 'church_admin' || churches.length > 0;
        const isDualRole = hasZoneRole && hasChurchRole;

        // Preserve previously picked mode for dual-role accounts
        const currentMode = get().session?.mode;
        let mode: AdminSession['mode'];
        if (isDualRole && currentMode) {
          mode = currentMode;
        } else if (!hasZoneRole && role === 'church_admin') {
          mode = 'church';
        } else {
          mode = 'zone';
        }

        const session: AdminSession = {
          userId: raw.id,
          email: raw.email || '',
          name: raw.name || raw.firstName || raw.email?.split('@')[0] || 'Admin',
          role,
          mode,
          zoneId,
          zoneName,
          churchId,
          churchName,
          churches,
          isHQ,
          isDualRole,
        };

        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
        syncScopeFromSession(session);
        set({ session, isAuthenticated: true, loading: false });
      } catch (meErr: any) {
        if (meErr instanceof SessionExpiredError) {
          console.warn('[AdminStore] Session confirmed expired by server');
          await clearTokens();
          await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
          syncScopeFromSession(null);
          set({ session: null, isAuthenticated: false, loading: false });
          return;
        }
        if (!hasCachedSession) {
          console.error('[AdminStore] /auth/me failed with no cached session:', meErr);
          syncScopeFromSession(null);
          set({ session: null, isAuthenticated: false, loading: false });
        } else {
          console.warn('[AdminStore] /auth/me failed; keeping cached admin session:', meErr?.message || meErr);
          set({ loading: false });
        }
      }
    } catch (err: any) {
      if (err instanceof SessionExpiredError) {
        await clearTokens();
        await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
        syncScopeFromSession(null);
        set({ session: null, isAuthenticated: false, loading: false });
      } else {
        console.warn('[AdminStore] Unexpected bootstrap error, retaining state:', err);
        set({ loading: false });
      }
    } finally {
      _bootstrapPromise = null;
      resolve();
    }
  },

  setMode: async (mode) => {
    const { session } = get();
    if (!session) return;
    const updated: AdminSession = { ...session, mode };
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[AdminStore] setMode: SecureStore write failed:', err);
    }
    syncScopeFromSession(updated);
    set({ session: updated });
  },

  setChurch: async (churchId: string) => {
    const { session } = get();
    if (!session) return;
    const church = session.churches.find(item => item.id === churchId);
    if (!church) return;
    const updated: AdminSession = { ...session, mode: 'church', churchId: church.id, churchName: church.name };
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[AdminStore] setChurch: SecureStore write failed:', err);
    }
    syncScopeFromSession(updated);
    set({ session: updated });
  },

  signOut: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch {}
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    await clearTokens();
    syncScopeFromSession(null);
    set({ session: null, isAuthenticated: false, loading: false });
  },
}));

/** Convenience hook — use anywhere */
export function useSession(): AdminSession | null {
  return useAdminStore(s => s.session);
}
