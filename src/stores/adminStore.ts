import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient, clearTokens } from '../lib/apiClient';
import { api } from '../services/api';
import { ZONES } from '../constants/zones';

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
  role: string;
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

  // Zone Scoping
  activeZone: ZoneOption | null;
  availableZones: ZoneOption[];
  isAllZones: boolean;

  // Church Scoping (supports multiple churches/subgroups)
  activeChurch: ChurchOption | null;
  userChurches: ChurchOption[];

  // Role Mode: 'org' (HQ/Zonal) or 'church' (Local Church Choir)
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

const STATIC_CONFIG_ZONES: ZoneOption[] = ZONES.map((z: any) => ({
  id: z.id,
  name: z.name,
  invitationCode: z.invitationCode,
}));

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
      // 1. Fetch current profile
      const meRes = await api.auth.me().catch(() => null);
      if (!meRes || !meRes.data) {
        set({ adminUser: null, isAuthenticated: false, loading: false });
        return;
      }

      const raw = meRes.data;
      const rawRole = (raw.role || '').toLowerCase().trim();

      // 2. Concurrently fetch verified memberships, user churches, and organizations from DB
      const [membersMineRes, churchesMineRes, orgsRes] = await Promise.all([
        api.organizations.getMine().catch(() => null),
        api.churches.mine().catch(() => null),
        api.organizations.getAll().catch(() => null),
      ]);

      const dbZones: any[] = Array.isArray(orgsRes?.data) ? orgsRes.data : [];

      // 3. Extract all user memberships (exactly like rehearsalhubv2 loadZoneMemberships)
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

      // 4. Resolve verified user zones (ONLY zones the user actually belongs to)
      const userZones: ZoneOption[] = [];
      for (const mem of allMemberships) {
        const zId =
          mem.organizationId ||
          mem.organization_id ||
          mem.zoneId ||
          mem.zone_id ||
          mem.hqGroupId ||
          mem.hq_group_id ||
          mem.zoneCode ||
          mem.zone_code ||
          mem.id;
        const orgName =
          mem.organization?.name ||
          mem.organizationName ||
          mem.zoneName ||
          mem.hqGroupName ||
          mem.name ||
          zId;
        const orgCode =
          mem.organization?.slug ||
          mem.organization?.code ||
          mem.zoneCode ||
          mem.invitationCode ||
          zId;

        if (zId) {
          const matched =
            dbZones.find(
              (z: any) =>
                String(z.id) === String(zId) ||
                (z.invitationCode && String(z.invitationCode).toLowerCase() === String(zId).toLowerCase()) ||
                (z.name && String(z.name).toLowerCase() === String(orgName).toLowerCase())
            ) ||
            STATIC_CONFIG_ZONES.find(
              (z: any) =>
                String(z.id) === String(zId) ||
                (z.invitationCode && String(z.invitationCode).toLowerCase() === String(zId).toLowerCase()) ||
                (z.name && String(z.name).toLowerCase() === String(orgName).toLowerCase())
            ) || { id: String(zId), name: orgName, invitationCode: orgCode };

          if (!userZones.some(z => String(z.id) === String(matched.id))) {
            userZones.push({
              id: matched.id,
              name: matched.name,
              invitationCode: matched.invitationCode || matched.id,
              role: mem.role || 'member',
            });
          }
        }
      }

      const isHqUser =
        rawRole === 'hq_admin' ||
        rawRole === 'admin' ||
        rawRole === 'super_admin' ||
        rawRole === 'boss' ||
        rawRole === 'org_admin' ||
        Boolean(raw.hasHqAccess || raw.has_hq_access);

      // If user is HQ admin, ensure HQ Zone ('zone-001') is included
      if (isHqUser && !userZones.some(z => z.id === 'zone-001')) {
        userZones.unshift({
          id: 'zone-001',
          name: 'Your Loveworld Singers',
          invitationCode: 'ZONE001',
          role: 'hq_admin',
        });
      }

      // If no zones extracted from memberships, fallback to raw.zoneId
      if (userZones.length === 0 && raw.zoneId) {
        const fallback =
          STATIC_CONFIG_ZONES.find(z => z.id === raw.zoneId || z.invitationCode === raw.zoneId) || {
            id: raw.zoneId,
            name: raw.zoneId,
            invitationCode: raw.zoneId,
          };
        userZones.push(fallback);
      }

      // 5. Resolve user churches (support MULTIPLE churches)
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

      // Also inspect memberships for church/group associations
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

      // Also inspect profile church info
      if (raw.churchId && !userChurches.some(c => c.id === raw.churchId)) {
        userChurches.push({
          id: raw.churchId,
          name: raw.churchName || raw.church || 'Local Church Choir',
        });
      } else if (raw.church && userChurches.length === 0) {
        userChurches.push({
          id: 'church-primary',
          name: raw.church,
        });
      }

      // 6. Determine roles
      const isZoneAdmin = isHqUser || rawRole === 'zone_admin' || rawRole === 'zone_coordinator';
      const isChurchAdmin =
        isZoneAdmin ||
        rawRole === 'church_coordinator' ||
        rawRole === 'subgroup_admin' ||
        rawRole === 'subgroup_coordinator' ||
        rawRole === 'group_admin' ||
        rawRole === 'coordinator' ||
        userChurches.some(c => {
          const r = (c.role || '').toLowerCase();
          return r.includes('coordinator') || r.includes('admin') || r.includes('leader');
        });

      const isPureChurchAdmin = isChurchAdmin && !isHqUser && !isZoneAdmin;
      const hasDualRole = (isHqUser || isZoneAdmin) && (isChurchAdmin || userChurches.length > 0);

      // 7. Resolve default active zone (NEVER null by default)
      const currentActiveZone = get().activeZone;
      const defaultZone =
        (currentActiveZone && userZones.find(z => z.id === currentActiveZone.id)) ||
        userZones.find(z => z.id === raw.zoneId) ||
        userZones[0] || {
          id: 'zone-001',
          name: 'Your Loveworld Singers',
          invitationCode: 'ZONE001',
        };

      // 8. Resolve default active church
      const currentActiveChurch = get().activeChurch;
      const defaultChurch =
        (currentActiveChurch && userChurches.find(c => c.id === currentActiveChurch.id)) ||
        userChurches[0] ||
        null;

      // 9. Initial role mode
      const currentRoleMode = get().activeRoleMode;
      const activeRoleMode = isPureChurchAdmin ? 'church' : currentRoleMode || 'org';
      const isChurchMode = activeRoleMode === 'church';

      // 10. Seed Tenant Scope Headers for API client
      apiClient.setMobileTenantScope({
        zoneId: defaultZone.id,
        zoneCode: defaultZone.invitationCode,
        scope: isChurchMode ? 'global' : 'zone',
      });

      const adminUser: AdminUser = {
        id: raw.id,
        email: raw.email,
        name: raw.name || raw.firstName || (raw.email ? raw.email.split('@')[0] : 'Administrator'),
        role: rawRole || (isHqUser ? 'hq_admin' : isZoneAdmin ? 'zone_admin' : 'coordinator'),
        zoneId: defaultZone.id,
        isHQAdmin: isHqUser,
        isZoneAdmin,
        isChurchAdmin,
        hasDualRole,
        churchId: defaultChurch?.id,
        churchName: defaultChurch?.name,
        userChurches,
      };

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
    const { adminUser, isChurchMode } = get();
    if (!zone) {
      // Only HQ admin can choose to view across all zones
      if (adminUser?.isHQAdmin) {
        set({ activeZone: null, isAllZones: true });
        apiClient.setMobileTenantScope({
          zoneId: null,
          zoneCode: null,
          scope: 'global',
        });
      }
      return;
    }

    set({ activeZone: zone, isAllZones: false });
    apiClient.setMobileTenantScope({
      zoneId: zone.id,
      zoneCode: zone.invitationCode,
      scope: isChurchMode ? 'global' : 'zone',
    });
  },

  switchChurch: (church: ChurchOption) => {
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
  },

  setRoleMode: (mode: 'org' | 'church') => {
    const { activeZone } = get();
    const isChurchMode = mode === 'church';
    set({ activeRoleMode: mode, isChurchMode });
    apiClient.setMobileTenantScope({
      zoneId: activeZone?.id ?? null,
      zoneCode: activeZone?.invitationCode ?? null,
      scope: isChurchMode ? 'global' : (activeZone ? 'zone' : 'global'),
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
