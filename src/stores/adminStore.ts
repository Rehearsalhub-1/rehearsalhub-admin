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

      const isHqUser =
        rawRole === 'hq_admin' ||
        rawRole === 'admin' ||
        rawRole === 'super_admin' ||
        rawRole === 'boss' ||
        rawRole === 'org_admin' ||
        Boolean(raw.hasHqAccess || raw.has_hq_access);

      // 4. Resolve the admin's zones
      // Rule: Zonal admins are locked to ONE zone (can admin multiple churches).
      // HQ Admins are locked to Loveworld Singers HQ (their own choir at LCA). HQ is a real zone.
      let userZones: ZoneOption[];
      if (isHqUser) {
        const hqZone =
          dbZones.find((z: any) => z.isHq || z.id === 'zone-001' || z.region === 'Headquarters') ||
          STATIC_CONFIG_ZONES.find((z: any) => z.id === 'zone-001') || {
            id: 'zone-001',
            name: 'Loveworld Singers HQ',
            invitationCode: 'ZONE001',
            role: 'hq_admin',
          };
        userZones = [
          {
            id: hqZone.id,
            name: hqZone.name || 'Loveworld Singers HQ',
            invitationCode: hqZone.invitationCode || 'ZONE001',
            role: 'hq_admin',
          },
        ];
      } else {
        const adminMem = allMemberships.find(m => {
          const r = (m.role || '').toLowerCase();
          return r.includes('admin') || r.includes('coordinator') || r.includes('leader');
        });
        const targetZoneId = adminMem?.organizationId || adminMem?.zoneId || raw.zoneId || 'zone-001';
        const matched =
          dbZones.find((z: any) => z.id === targetZoneId || z.invitationCode === targetZoneId) ||
          STATIC_CONFIG_ZONES.find((z: any) => z.id === targetZoneId || z.invitationCode === targetZoneId) || {
            id: targetZoneId,
            name: targetZoneId || 'Your Zone',
            invitationCode: targetZoneId || '',
          };
        const lockedZone: ZoneOption = {
          id: matched.id,
          name: matched.name,
          invitationCode: matched.invitationCode || matched.id,
          role: adminMem?.role || 'zone_admin',
        };
        userZones = [lockedZone];
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

      // 7. Resolve default active zone
      const currentActiveZone = get().activeZone;
      const defaultZone =
        (currentActiveZone && userZones.find(z => z.id === currentActiveZone.id)) ||
        userZones[0] ||
        null;
      const isAllZones = false;

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
        zoneId: defaultZone?.id || null,
        zoneCode: defaultZone?.invitationCode || null,
        scope: isChurchMode ? 'global' : 'zone',
      });

      const adminUser: AdminUser = {
        id: raw.id,
        email: raw.email,
        name: raw.name || raw.firstName || (raw.email ? raw.email.split('@')[0] : 'Administrator'),
        role: rawRole || (isHqUser ? 'hq_admin' : isZoneAdmin ? 'zone_admin' : 'coordinator'),
        zoneId: defaultZone?.id || null,
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
    const { isChurchMode, availableZones } = get();
    const targetZone = (zone && availableZones.find(z => z.id === zone.id)) || availableZones[0] || null;
    if (!targetZone) return;

    set({ activeZone: targetZone, isAllZones: false });
    apiClient.setMobileTenantScope({
      zoneId: targetZone.id,
      zoneCode: targetZone.invitationCode,
      scope: isChurchMode ? 'global' : 'zone',
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
      churchId: church.id,
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
