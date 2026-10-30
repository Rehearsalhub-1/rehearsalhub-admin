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

export interface LinkedAccountItem {
  id: string;
  email: string;
  name: string;
  role: string;
  zoneId?: string | null;
  churchId?: string | null;
  zoneName?: string | null;
  churchName?: string | null;
  isCurrent: boolean;
}

interface AdminStore {
  session: AdminSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  linkedAccounts: LinkedAccountItem[];
  bootstrap: () => Promise<void>;
  setMode: (mode: 'zone' | 'church') => Promise<void>;
  setChurch: (churchId: string) => Promise<void>;
  fetchLinkedAccounts: () => Promise<LinkedAccountItem[]>;
  switchAccount: (targetUserId: string) => Promise<void>;
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
  linkedAccounts: [],

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
          'zone_admin', 'zone_coordinator', 'hq_admin', 'admin', 'super_admin',
        ]);
        const adminChurchMemberships = memberships.filter(m =>
          Boolean(m.groupId || m.subgroupId || m.group?.id || m.subgroup?.id) &&
          churchAdminRoles.has(String(m.role || '').toLowerCase())
        );

        const churchMap = new Map<string, { id: string; name: string }>();
        const addChurchOption = (idRaw: any, nameRaw: any) => {
          const cid = String(idRaw || '').trim();
          if (!cid) return;
          const cname = String(nameRaw || 'Church Choir').trim() || 'Church Choir';
          if (!churchMap.has(cid)) {
            churchMap.set(cid, { id: cid, name: cname });
          }
        };

        if (Array.isArray(raw.churches)) {
          for (const c of raw.churches) {
            addChurchOption(c?.id || c?.churchId || c?.groupId, c?.name || c?.churchName || c?.groupName);
          }
        }
        for (const m of adminChurchMemberships) {
          addChurchOption(
            m.groupId || m.subgroupId || m.group?.id || m.subgroup?.id,
            m.group?.name || m.subgroup?.name || m.groupName || m.subgroupName
          );
        }
        if (Array.isArray(raw.rawData?.churches)) {
          for (const c of raw.rawData.churches) {
            addChurchOption(c?.id || c?.churchId || c?.groupId, c?.name || c?.churchName || c?.groupName);
          }
        }
        if (raw.churchId || raw.rawData?.churchId) {
          addChurchOption(
            raw.churchId || raw.rawData?.churchId,
            raw.churchName || raw.church || raw.rawData?.church || 'Church Choir'
          );
        }

        // Also query /subgroups/coordinated to ensure all coordinated churches are discovered
        try {
          const coordRes = await apiClient.get<{ success: boolean; data: any[] }>('/subgroups/coordinated');
          if (Array.isArray(coordRes?.data)) {
            for (const g of coordRes.data) {
              addChurchOption(g?.id, g?.name);
            }
          }
        } catch {}

        const churches = Array.from(churchMap.values());

        const churchMem = churches.find(church => church.id === get().session?.churchId) || churches[0];
        const churchId =
          churchMem?.id ||
          raw.churchId ||
          raw.rawData?.churchId ||
          null;
        const churchName =
          churchMem?.name ||
          raw.churchName ||
          raw.church ||
          raw.rawData?.church ||
          null;

        const hasZoneRole =
          role === 'hq_admin' ||
          role === 'zone_admin' ||
          memberships.some(m => {
            const r = String(m.role || '').toLowerCase();
            return r === 'zone_admin' || r === 'zone_coordinator' || r === 'hq_admin' || r === 'admin' || r === 'super_admin';
          });
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
    let targetChurchId = session.churchId;
    let targetChurchName = session.churchName;
    if (mode === 'church' && (!targetChurchId || targetChurchId === '')) {
      if (session.churches.length > 0) {
        targetChurchId = session.churches[0].id;
        targetChurchName = session.churches[0].name;
      }
    }
    const updated: AdminSession = {
      ...session,
      mode,
      churchId: mode === 'church' ? targetChurchId : session.churchId,
      churchName: mode === 'church' ? targetChurchName : session.churchName,
    };
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[AdminStore] setMode: SecureStore write failed:', err);
    }
    syncScopeFromSession(updated);
    apiClient.clearCache();
    set({ session: updated });
  },

  setChurch: async (churchId: string) => {
    const { session } = get();
    if (!session) return;
    const church = session.churches.find(item => item.id === churchId);
    const updated: AdminSession = {
      ...session,
      mode: 'church',
      churchId: church ? church.id : churchId,
      churchName: church ? church.name : (session.churchName || 'Church Choir'),
    };
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[AdminStore] setChurch: SecureStore write failed:', err);
    }
    syncScopeFromSession(updated);
    apiClient.clearCache();
    set({ session: updated });
  },

  fetchLinkedAccounts: async () => {
    try {
      const res = await apiClient.get<any>('/auth/linked-accounts');
      const rawList: any[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.accounts)
        ? res.data.accounts
        : Array.isArray(res?.accounts)
        ? res.accounts
        : [];
      if (rawList.length > 0) {
        const normalized: LinkedAccountItem[] = rawList.map((acc: any) => ({
          id: String(acc.id),
          email: acc.email || '',
          name: acc.name || [acc.firstName, acc.lastName].filter(Boolean).join(' ') || acc.email || 'Admin',
          role: acc.role || 'member',
          zoneId: acc.zoneId || acc.zoneCode || null,
          churchId: acc.churchId || null,
          zoneName: acc.zoneName || acc.zoneCode || null,
          churchName: acc.churchName || acc.church || null,
          isCurrent: Boolean(acc.isCurrent),
        }));
        set({ linkedAccounts: normalized });
        return normalized;
      }
    } catch (err) {
      console.warn('[AdminStore] fetchLinkedAccounts error:', err);
    }
    return [];
  },

  switchAccount: async (targetUserId: string) => {
    set({ loading: true });
    try {
      const res = await apiClient.post<{ success: boolean; data?: { accessToken: string; refreshToken: string; user: any }; error?: string }>(
        '/auth/switch-account',
        { targetUserId }
      );
      if (res?.data?.accessToken && res?.data?.refreshToken) {
        await apiClient.storeTokens(
          res.data.accessToken,
          res.data.refreshToken,
          res.data.user?.id || targetUserId
        );
        await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
        await get().bootstrap();
      } else {
        throw new Error(res?.error || 'Failed to switch account');
      }
    } catch (err: any) {
      console.error('[AdminStore] switchAccount failed:', err);
      throw err;
    } finally {
      set({ loading: false });
    }
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
