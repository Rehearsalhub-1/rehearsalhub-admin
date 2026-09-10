import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient, clearTokens, SessionExpiredError } from '../lib/apiClient';

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
  isHQ: boolean;
  isDualRole: boolean;
}

interface AdminStore {
  session: AdminSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  bootstrap: () => Promise<void>;
  setMode: (mode: 'zone' | 'church') => void;
  signOut: () => Promise<void>;
}

const SESSION_KEY = 'admin_session_v2';

export const useAdminStore = create<AdminStore>((set, get) => ({
  session: null,
  isAuthenticated: false,
  loading: true,

  bootstrap: async () => {
    set({ loading: true });
    try {
      const token = await SecureStore.getItemAsync('jwt');
      if (!token) {
        set({ session: null, isAuthenticated: false, loading: false });
        return;
      }

      // Fast restore from cache for instant UI
      try {
        const cached = await SecureStore.getItemAsync(SESSION_KEY);
        if (cached) {
          const s: AdminSession = JSON.parse(cached);
          set({ session: s, isAuthenticated: true, loading: false });
        }
      } catch {}

      // Live fetch from /auth/me
      const meRes = await apiClient.get<{ success: boolean; data: any }>('/auth/me');
      if (!meRes?.data) {
        set({ session: null, isAuthenticated: false, loading: false });
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
        raw.zoneId ||
        'zone-001';
      const zoneName =
        primaryMem?.organization?.name ||
        primaryMem?.zoneName ||
        raw.zoneName ||
        'Your Zone';

      // Church membership if any
      const churchMem = memberships.find(m => m.groupId || m.group?.id);
      const churchId =
        churchMem?.groupId ||
        churchMem?.group?.id ||
        raw.churchId ||
        null;
      const churchName =
        churchMem?.group?.name ||
        churchMem?.groupName ||
        raw.churchName ||
        null;

      const hasZoneRole = role === 'hq_admin' || role === 'zone_admin';
      const hasChurchRole = role === 'church_admin' || Boolean(churchId);
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
        isHQ,
        isDualRole,
      };

      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
      set({ session, isAuthenticated: true, loading: false });
    } catch (err: any) {
      if (err instanceof SessionExpiredError) {
        await clearTokens();
        await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
        set({ session: null, isAuthenticated: false, loading: false });
        return;
      }
      console.warn('[AdminStore] bootstrap error:', err);
      set({ loading: false });
    }
  },

  setMode: (mode) => {
    const { session } = get();
    if (!session) return;
    const updated: AdminSession = { ...session, mode };
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updated)).catch(() => {});
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
    set({ session: null, isAuthenticated: false, loading: false });
  },
}));

/** Convenience hook — use anywhere */
export function useSession(): AdminSession | null {
  return useAdminStore(s => s.session);
}
