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
