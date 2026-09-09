import React, { useEffect } from 'react';
import { useAdminStore, AdminUser, ChurchOption as ChurchInfo } from '../stores/adminStore';
import { onSessionExpired } from '../lib/apiClient';

export type { AdminUser, ChurchInfo };

export interface AuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * Direct hook into useAdminStore — ONE SINGLE SOURCE OF TRUTH (Zero Context Overhead)
 */
export function useAuth(): AuthContextType {
  const adminUser = useAdminStore(s => s.adminUser);
  const loading = useAdminStore(s => s.loading);
  const isAuthenticated = useAdminStore(s => s.isAuthenticated);
  const signOut = useAdminStore(s => s.signOut);
  const refreshUser = useAdminStore(s => s.refreshUser);

  return {
    adminUser,
    loading,
    isAdmin: isAuthenticated,
    signOut,
    refreshUser,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const bootstrap = useAdminStore(s => s.bootstrap);
  const signOut = useAdminStore(s => s.signOut);

  useEffect(() => {
    bootstrap();
    const unsub = onSessionExpired(() => {
      signOut();
    });
    return () => unsub();
  }, [bootstrap, signOut]);

  return <>{children}</>;
}

