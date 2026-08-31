import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, clearTokens, SessionExpiredError } from '../lib/apiClient';

const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'hq_admin',
  'zone_admin',
  'zone_coordinator',
  'church_coordinator',
  'subgroup_coordinator',
  'subgroup_admin',
];

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  zoneId: string | null;
  isHQAdmin: boolean;
  isZoneAdmin: boolean;
}

interface AuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  adminUser: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
  refreshUser: async () => {},
});

function mapAdminUser(data: { id: string; email: string; name?: string; role: string; zoneId: string | null }): AdminUser {
  const role = (data.role || '').toLowerCase();
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    zoneId: data.zoneId,
    isHQAdmin: role === 'hq_admin' || role === 'super_admin',
    isZoneAdmin: role === 'zone_admin' || role === 'admin' || role === 'zone_coordinator',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchCurrentUser() {
    try {
      const jwt = await SecureStore.getItemAsync('jwt');
      if (!jwt) {
        setAdminUser(null);
        return;
      }

      const result = await apiClient.get<{
        success: boolean;
        data?: { id: string; email: string; role: string; zoneId: string | null };
      }>('/auth/me');

      if (result.success && result.data) {
        if (!ADMIN_ROLES.includes(result.data.role)) {
          await clearTokens();
          setAdminUser(null);
          return;
        }

        // Verify the admin has an actual active admin membership in the DB
        // This catches cases where JWT role is stale after demotion
        try {
          const membershipRes = await apiClient.get<{ success: boolean; data: any }>('/members/mine');
          const zoneMembers = Array.isArray(membershipRes?.data?.zoneMembers) ? membershipRes.data.zoneMembers : [];
          const hqMembers = Array.isArray(membershipRes?.data?.hqMembers) ? membershipRes.data.hqMembers : [];

          const hasAdminMembership = [...zoneMembers, ...hqMembers].some(m => {
            const r = (m.role || '').toLowerCase();
            return r === 'zone_admin' || r === 'zone_coordinator' || r === 'hq_admin' || r === 'admin' || r === 'super_admin' || r === 'subgroup_admin' || r === 'church_coordinator';
          });

          // HQ admins might be in hqMembers without explicit admin role — check hasHqAccess
          const hasHqMembership = hqMembers.length > 0;

          const isHqRole = result.data.role === 'hq_admin' || result.data.role === 'admin' || result.data.role === 'super_admin';

          if (!hasAdminMembership && !hasHqMembership && !isHqRole) {
            // JWT says admin but DB says no active admin membership
            // Could mean role was revoked — log warning but don't block (JWT still valid)
            console.warn('[AuthContext] Admin role claimed but no admin membership found in DB');
            // Still allow access — the API will enforce scope on each request
          }
        } catch (membershipErr) {
          // Non-blocking — if membership check fails, continue with JWT role
          console.warn('[AuthContext] Could not verify membership:', membershipErr);
        }

        setAdminUser(mapAdminUser(result.data));
      } else {
        await clearTokens();
        setAdminUser(null);
      }
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        setAdminUser(null);
      } else {
        console.warn('[AuthContext] fetchCurrentUser failed:', err);
        setAdminUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  async function signOut() {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      await clearTokens();
      setAdminUser(null);
    }
  }

  const isAdmin = !!adminUser && ADMIN_ROLES.includes(adminUser.role);

  return (
    <AuthContext.Provider value={{ adminUser, loading, isAdmin, signOut, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
