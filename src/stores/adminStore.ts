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

      // 6. Resolve User's Zone directly from Live Database
      let userZones: ZoneOption[];
      if (canonicalRole === 'hq_admin') {
        const hqZone = dbZones.find((z: any) => z.isHq || z.id === 'zone-001') || {
          id: 'zone-001',
          name: 'Loveworld Singers HQ',
          invitationCode: 'ZONE001',
          role: 'hq_admin',
        };
        userZones = [
          {
            id: hqZone.id,
            name: hqZone.name || 'Loveworld Singers HQ',
            invitationCode: hqZone.invitationCode || hqZone.code || 'ZONE001',
            role: 'hq_admin',
          },
        ];
      } else {
        const adminMem = allMemberships.find((m: any) => {
          const r = (m.role || '').toLowerCase();
          const orgId = m.organizationId || m.zoneId || m.organization?.id;
          return (r.includes('admin') || r.includes('coord') || r.includes('leader')) && orgId !== 'zone-boss';
        });

        const anyMem = allMemberships.find((m: any) => {
          const orgId = m.organizationId || m.zoneId || m.organization?.id;
          return orgId && orgId !== 'zone-boss';
        });

        let targetZoneId =
          adminMem?.organizationId ||
          adminMem?.zoneId ||
          raw.zoneId ||
          raw.zone_id ||
          anyMem?.organizationId ||
          anyMem?.zoneId ||
          '';

        if (targetZoneId === 'zone-boss') {
          targetZoneId = '';
        }

        const matchedDbZone =
          (targetZoneId && dbZones.find((z: any) => z.id === targetZoneId || z.invitationCode === targetZoneId || z.code === targetZoneId)) ||
          dbZones[0] ||
          null;

        const resolvedZoneName =
          matchedDbZone?.name ||
          adminMem?.organization?.name ||
          adminMem?.zoneName ||
          raw.zoneName ||
          (targetZoneId ? `Zone (${targetZoneId})` : 'Your Zone');

        const resolvedZoneCode =
          matchedDbZone?.invitationCode ||
          matchedDbZone?.code ||
          adminMem?.organization?.invitationCode ||
          adminMem?.zoneCode ||
          raw.zoneCode ||
          targetZoneId ||
          'ZONE';

        const lockedZone: ZoneOption = {
          id: matchedDbZone?.id || targetZoneId || 'zone-001',
          name: resolvedZoneName,
          invitationCode: resolvedZoneCode,
          role: canonicalRole,
        };
        userZones = [lockedZone];
      }

      // 7. Resolve default active zone & church
      const currentActiveZone = get().activeZone;
      const defaultZone =
        (currentActiveZone && userZones.find(z => z.id === currentActiveZone.id)) ||
        userZones[0] ||
        null;

      const currentActiveChurch = get().activeChurch;
      const defaultChurch =
        (currentActiveChurch && userChurches.find(c => c.id === currentActiveChurch.id)) ||
        userChurches[0] ||
        null;

      const isPureChurchAdmin = canonicalRole === 'church_coordinator';
      const isZoneAdmin = canonicalRole === 'zone_admin';
      const isChurchAdmin = isPureChurchAdmin || userChurches.length > 0;
      const hasDualRole = isZoneAdmin && userChurches.length > 0;

      // Initial role mode
      const currentRoleMode = get().activeRoleMode;
      const activeRoleMode = isPureChurchAdmin ? 'church' : currentRoleMode || 'org';
      const isChurchMode = activeRoleMode === 'church';

      // Seed Tenant Scope Headers for API client
      apiClient.setMobileTenantScope({
        zoneId: defaultZone?.id || null,
        zoneCode: defaultZone?.invitationCode || null,
        churchId: isChurchMode ? (defaultChurch?.id ?? null) : null,
        scope: isChurchMode ? 'church' : (defaultZone ? 'zone' : 'global'),
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
    const { isChurchMode, availableZones } = get();
    const targetZone = (zone && availableZones.find(z => z.id === zone.id)) || availableZones[0] || null;
    if (!targetZone) return;

    set({ activeZone: targetZone, isAllZones: false });
    apiClient.setMobileTenantScope({
      zoneId: targetZone.id,
      zoneCode: targetZone.invitationCode,
      churchId: isChurchMode ? get().activeChurch?.id ?? null : null,
      scope: isChurchMode ? 'church' : 'zone',
    });
  },

  switchChurch: (church: ChurchOption) => {
    const { activeZone, isChurchMode } = get();
    set(state => ({
      activeChurch: church,
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
      churchId: isChurchMode ? church.id : null,
      scope: isChurchMode ? 'church' : 'zone',
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
