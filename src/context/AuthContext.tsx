import React, { createContext, useContext, useEffect } from 'react';
import { useAdminStore, AdminUser, ChurchOption as ChurchInfo } from '../stores/adminStore';
import { onSessionExpired } from '../lib/apiClient';

export type { AdminUser, ChurchInfo };

interface AuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const adminUser = useAdminStore(s => s.adminUser);
  const loading = useAdminStore(s => s.loading);
  const isAuthenticated = useAdminStore(s => s.isAuthenticated);
  const signOut = useAdminStore(s => s.signOut);
  const refreshUser = useAdminStore(s => s.refreshUser);
  const bootstrap = useAdminStore(s => s.bootstrap);

  useEffect(() => {
    bootstrap();

    // Listen for session expiration events from apiClient
    const unsub = onSessionExpired(() => {
      console.log('[AuthContext] Session expired notification received. Resetting admin state.');
      signOut();
    });

    return () => unsub();
  }, []);

  const value: AuthContextType = {
    adminUser,
    loading,
    isAdmin: isAuthenticated,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context) return context;
  const state = useAdminStore.getState();
  return {
    adminUser: state.adminUser,
    loading: state.loading,
    isAdmin: state.isAuthenticated,
    signOut: state.signOut,
    refreshUser: state.refreshUser,
  };
};
