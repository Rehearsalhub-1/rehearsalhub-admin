import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient, clearTokens, SessionExpiredError } from '../lib/apiClient';
import { api } from '../services/api';

// No hardcoded zones: zones are dynamically fetched from the live database
export interface ZoneOption {
  id: string;
  name: string;
  invitationCode: string;
  role?: string;
}

export interface ChurchOption {
  id: string;
  name: string;
  code?: string;
  role?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: 'hq_admin' | 'zone_admin' | 'church_coordinator';
  zoneId: string | null;
  isHQAdmin: boolean;
  isZoneAdmin: boolean;
  isChurchAdmin: boolean;
  hasDualRole: boolean;
  churchId?: string;
  churchName?: string;
  userChurches: ChurchOption[];
}

interface AdminState {
  adminUser: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;

  // Active Context Scoping
  activeZone: ZoneOption | null;
  availableZones: ZoneOption[];
  isAllZones: boolean;

  // Church Scope (for dual-role coordinators and church admins)
  activeChurch: ChurchOption | null;
  userChurches: ChurchOption[];
  activeRoleMode: 'org' | 'church';
  isChurchMode: boolean;

  // Actions
  bootstrap: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchZone: (zone: ZoneOption | null) => void;
  switchChurch: (church: ChurchOption) => void;
  setRoleMode: (mode: 'org' | 'church') => void;
  toggleRoleMode: () => void;
  signOut: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  adminUser: null,
  isAuthenticated: false,
  loading: true,

  activeZone: null,
  availableZones: [],
  isAllZones: false,

  activeChurch: null,
  userChurches: [],
  activeRoleMode: 'org',
  isChurchMode: false,

  bootstrap: async () => {
    set({ loading: true });
    try {
      const token = await SecureStore.getItemAsync('jwt');
      if (!token) {
        set({
          adminUser: null,
          isAuthenticated: false,
          loading: false,
          activeZone: null,
          availableZones: [],
          activeChurch: null,
          userChurches: [],
          isAllZones: false,
        });
        return;
      }
      await get().refreshUser();
    } catch (err) {
      console.warn('[AdminStore] Bootstrap error:', err);
      set({ loading: false });
    }
  },

  refreshUser: async () => {
    try {
      set({ loading: true });

      // 0. Load cached session first for instant offline startup
      try {
        const cachedRaw = await SecureStore.getItemAsync('admin_cached_session');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.adminUser && !get().adminUser) {
            set({
              adminUser: cached.adminUser,
              isAuthenticated: true,
              loading: false,
              activeZone: cached.activeZone ?? null,
              availableZones: cached.availableZones ?? [],
              activeChurch: cached.activeChurch ?? null,
              userChurches: cached.userChurches ?? [],
              activeRoleMode: cached.activeRoleMode ?? 'org',
              isChurchMode: cached.isChurchMode ?? false,
            });
            if (cached.activeZone || cached.activeChurch) {
              apiClient.setMobileTenantScope({
                zoneId: cached.activeZone?.id ?? null,
                zoneCode: cached.activeZone?.invitationCode ?? null,
                churchId: cached.isChurchMode ? (cached.activeChurch?.id ?? null) : null,
                scope: cached.isChurchMode ? 'church' : (cached.activeZone ? 'zone' : 'global'),
              });
            }
          }
        }
      } catch {}

      // 1. Fetch authenticated user profile
      let meRes: any = null;
      try {
        meRes = await api.auth.me();
      } catch (authErr) {
        if (authErr instanceof SessionExpiredError) {
          await SecureStore.deleteItemAsync('admin_cached_session').catch(() => {});
          await clearTokens();
          set({ adminUser: null, isAuthenticated: false, loading: false });
          return;
        }
        set({ loading: false });
        return;
      }

      if (!meRes || !meRes.data) {
        set({ adminUser: null, isAuthenticated: false, loading: false });
        return;
      }

      const raw = meRes.data;
      const rawRole = (raw.role || '').toLowerCase().trim();

      // 2. Fetch verified data
      const [membersMineRes, churchesMineRes, orgsRes] = await Promise.all([
        api.organizations.getMine().catch(() => null),
        api.churches.mine().catch(() => null),
        api.organizations.getAll().catch(() => null),
      ]);

      // Filter out any legacy 'zone-boss' or 'Central Admin' from live database organizations
      const rawDbZones: any[] = Array.isArray(orgsRes?.data) ? orgsRes.data : [];
      const dbZones: any[] = rawDbZones.filter(
        (z: any) => z && z.id !== 'zone-boss' && (z.name || '').toLowerCase() !== 'central admin' && z.code !== 'BOSS101'
      );

      // 3. Extract user memberships and strip any legacy 'zone-boss' references
      let allMemberships: any[] = [];
      if (membersMineRes?.data) {
        if (Array.isArray(membersMineRes.data.memberships)) {
          allMemberships = membersMineRes.data.memberships;
        } else if (Array.isArray(membersMineRes.data)) {
          allMemberships = membersMineRes.data;
        } else {
          allMemberships = [
            ...(membersMineRes.data.zoneMembers || []),
            ...(membersMineRes.data.hqMembers || []),
          ];
        }
      }

      allMemberships = allMemberships.filter((m: any) => {
        const orgId = m.organizationId || m.zoneId || m.organization?.id;
        const orgName = m.organization?.name || m.zoneName;
        return orgId !== 'zone-boss' && (orgName || '').toLowerCase() !== 'central admin';
      });

      // 4. Resolve user churches (support multiple churches)
      const userChurches: ChurchOption[] = [];
      const rawGroups = Array.isArray(churchesMineRes?.data) ? churchesMineRes.data : [];
      rawGroups.forEach((g: any) => {
        if (g && g.id && !userChurches.some(c => c.id === g.id)) {
          userChurches.push({
            id: g.id,
            name: g.name || 'Church Choir',
            code: g.code,
            role: g.role,
          });
        }
      });

      // Inspect memberships for church/group associations
      allMemberships.forEach((m: any) => {
        const group = m.group || (m.groupId ? { id: m.groupId, name: m.groupName } : null);
        if (group && group.id && !userChurches.some(c => c.id === group.id)) {
          userChurches.push({
            id: group.id,
            name: group.name || 'Church Choir',
            code: group.code,
            role: m.role,
          });
        }
      });

      if (raw.churchId && !userChurches.some(c => c.id === raw.churchId)) {
        userChurches.push({
          id: raw.churchId,
          name: raw.churchName || raw.church || 'Local Church Choir',
        });
      }

      // 5. DETERMINE STRICTLY ONE OF THE THREE ROLES
      const hqMem = allMemberships.find((m: any) => {
        const orgId = m.organizationId || m.zoneId || m.organization?.id;
        return orgId === 'zone-001' || m.organization?.isHq || m.hasHqAccess;
      });

      const isHqUser = Boolean(
        rawRole === 'hq_admin' ||
        rawRole === 'super_admin' ||
        raw.hasHqAccess ||
        raw.has_hq_access ||
        hqMem
      );

      const isPureChurchRole =
        rawRole === 'church_coordinator' ||
        rawRole === 'church_admin' ||
        rawRole === 'group_admin' ||
        rawRole === 'subgroup_admin' ||
        rawRole === 'subgroup_coordinator';

      const isZoneAdminUser = !isHqUser && !isPureChurchRole && (
        rawRole === 'zone_admin' ||
        rawRole === 'zone_coordinator' ||
        rawRole === 'org_admin' ||
        rawRole === 'admin' ||
        allMemberships.some((m: any) => {
          const r = (m.role || '').toLowerCase();
          return (r.includes('admin') || r.includes('coord') || r.includes('leader')) && !m.groupId;
        })
      );

      let canonicalRole: 'hq_admin' | 'zone_admin' | 'church_coordinator';
      if (isHqUser) {
        canonicalRole = 'hq_admin';
      } else if (isZoneAdminUser) {
        canonicalRole = 'zone_admin';
      } else {
        canonicalRole = 'church_coordinator';
      }

      // 6. Resolve User's Zone directly from Live Database (Identical to rehearsalhubv2)
      const userZones: ZoneOption[] = [];
      for (const mem of allMemberships) {
        const zId = mem.organizationId || mem.organization_id || mem.zoneId || mem.zone_id || mem.id;
        const orgName = mem.organization?.name || mem.zoneName || zId;
        const orgCode = mem.organization?.invitationCode || mem.organization?.code || mem.zoneCode || zId;

        if (zId && zId !== 'zone-boss') {
          const matched = dbZones.find((z: any) =>
            String(z.id) === String(zId) ||
            (z.invitationCode && String(z.invitationCode).toLowerCase() === String(zId).toLowerCase()) ||
            (z.name && String(z.name).toLowerCase() === String(orgName).toLowerCase())
          ) || { id: String(zId), name: orgName, invitationCode: orgCode };

          if (!userZones.some(z => String(z.id) === String(matched.id))) {
            userZones.push({
              id: matched.id,
              name: matched.name || 'Your Zone',
              invitationCode: matched.invitationCode || matched.code || 'ZONE',
              role: canonicalRole,
            });
          }
        }
      }

      // If user profile has a direct zone or is HQ user, ensure that zone is in userZones
      if (userZones.length === 0) {
        const fallbackZone =
          (raw.zoneId && dbZones.find((z: any) => z.id === raw.zoneId)) ||
          (isHqUser ? dbZones.find((z: any) => z.isHq || z.id === 'zone-001') : null) ||
          dbZones[0] || {
            id: 'zone-001',
            name: 'Loveworld Singers HQ',
            invitationCode: 'ZONE001',
            role: canonicalRole,
          };
        userZones.push({
          id: fallbackZone.id,
          name: fallbackZone.name || 'Your Zone',
          invitationCode: fallbackZone.invitationCode || fallbackZone.code || 'ZONE',
          role: canonicalRole,
        });
      }

      // 7. Resolve default active zone & church
      const currentActiveZone = get().activeZone;
      const defaultZone =
        (currentActiveZone && userZones.find(z => z.id === currentActiveZone.id)) ||
        userZones[0];

      const currentActiveChurch = get().activeChurch;
      const defaultChurch =
        (currentActiveChurch && userChurches.find(c => c.id === currentActiveChurch.id)) ||
        userChurches[0] ||
        null;

      // If HQ Admin, HQ NEVER does church (HQ handles official ministry repertoire & rehearsals only)
      if (canonicalRole === 'hq_admin') {
        userChurches.length = 0;
      }

      const isPureChurchAdmin = canonicalRole === 'church_coordinator';
      const isZoneAdmin = canonicalRole === 'zone_admin';
      const isChurchAdmin = isPureChurchAdmin || (isZoneAdmin && userChurches.length > 0);
      const hasDualRole = isZoneAdmin && userChurches.length > 0;

      // Initial role mode:
      // If HQ Admin -> ALWAYS 'org' (Zone) mode
      // If pure church admin -> 'church' mode
      // If zone admin with church -> keep current mode or default to 'org' (Zone) mode
      const currentRoleMode = get().activeRoleMode;
      const activeRoleMode = canonicalRole === 'hq_admin'
        ? 'org'
        : isPureChurchAdmin
        ? 'church'
        : currentRoleMode || 'org';
      const isChurchMode = activeRoleMode === 'church';

      // Seed Tenant Scope Headers for API client (Strictly ONE place at a time)
      apiClient.setMobileTenantScope({
        zoneId: defaultZone?.id || null,
        zoneCode: defaultZone?.invitationCode || null,
        churchId: isChurchMode ? (defaultChurch?.id ?? null) : null,
        scope: isChurchMode ? 'church' : 'zone',
      });

      const adminUser: AdminUser = {
        id: raw.id,
        email: raw.email,
        name: raw.name || raw.firstName || (raw.email ? raw.email.split('@')[0] : 'Administrator'),
        role: canonicalRole,
        zoneId: defaultZone?.id || null,
        isHQAdmin: canonicalRole === 'hq_admin',
        isZoneAdmin,
        isChurchAdmin,
        hasDualRole,
        churchId: defaultChurch?.id,
        churchName: defaultChurch?.name,
        userChurches,
      };

      // Persist session cache for seamless offline resilience
      SecureStore.setItemAsync(
        'admin_cached_session',
        JSON.stringify({
          adminUser,
          activeZone: defaultZone,
          availableZones: userZones,
          isAllZones: false,
          activeChurch: defaultChurch,
          userChurches,
          activeRoleMode,
          isChurchMode,
        })
      ).catch(() => {});

      set({
        adminUser,
        isAuthenticated: true,
        loading: false,
        activeZone: defaultZone,
        availableZones: userZones,
        isAllZones: false,
        activeChurch: defaultChurch,
        userChurches,
        activeRoleMode,
        isChurchMode,
      });
    } catch (err) {
      console.warn('[AdminStore] refreshUser error:', err);
      set({ loading: false });
    }
  },

  switchZone: (zone: ZoneOption | null) => {
    if (!zone) return;
    const { availableZones } = get();
    const targetZone = availableZones.find(z => z.id === zone.id) || zone;

    set({ activeZone: targetZone, isAllZones: false, activeRoleMode: 'org', isChurchMode: false });
    apiClient.setMobileTenantScope({
      zoneId: targetZone.id,
      zoneCode: targetZone.invitationCode,
      churchId: null,
      scope: 'zone',
    });
  },

  switchChurch: (church: ChurchOption) => {
    const { activeZone } = get();
    set(state => ({
      activeChurch: church,
      activeRoleMode: 'church',
      isChurchMode: true,
      isAllZones: false,
      adminUser: state.adminUser
        ? {
            ...state.adminUser,
            churchId: church.id,
            churchName: church.name,
          }
        : null,
    }));
    apiClient.setMobileTenantScope({
      zoneId: activeZone?.id ?? null,
      zoneCode: activeZone?.invitationCode ?? null,
      churchId: church.id,
      scope: 'church',
    });
  },

  setRoleMode: (mode: 'org' | 'church') => {
    const { activeZone, activeChurch } = get();
    const isChurchMode = mode === 'church';
    set({ activeRoleMode: mode, isChurchMode });
    apiClient.setMobileTenantScope({
      zoneId: activeZone?.id ?? null,
      zoneCode: activeZone?.invitationCode ?? null,
      churchId: isChurchMode ? (activeChurch?.id ?? null) : null,
      scope: isChurchMode ? 'church' : (activeZone ? 'zone' : 'global'),
    });
  },

  toggleRoleMode: () => {
    const { activeRoleMode, setRoleMode } = get();
    setRoleMode(activeRoleMode === 'church' ? 'org' : 'church');
  },

  signOut: async () => {
    try {
      const refreshToken = (await SecureStore.getItemAsync('refreshToken')) || undefined;
      await api.auth.logout(refreshToken).catch(() => {});
    } catch {}
    await SecureStore.deleteItemAsync('admin_cached_session').catch(() => {});
    await clearTokens();
    set({
      adminUser: null,
      isAuthenticated: false,
      loading: false,
      activeZone: null,
      availableZones: [],
      isAllZones: false,
      activeChurch: null,
      userChurches: [],
      activeRoleMode: 'org',
      isChurchMode: false,
    });
  },
}));
