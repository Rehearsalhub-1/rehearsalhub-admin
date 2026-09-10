import React, { useEffect } from 'react';
import { useAdminStore } from '../stores/adminStore';
import { onSessionExpired } from '../lib/apiClient';

export function useAuth() {
  const session = useAdminStore(s => s.session);
  const loading = useAdminStore(s => s.loading);
  const signOut = useAdminStore(s => s.signOut);
  const refreshUser = useAdminStore(s => s.bootstrap);

  return {
    adminUser: session
      ? {
          id: session.userId,
          email: session.email,
          name: session.name,
          role: session.role,
          isHQAdmin: session.isHQ,
          isZoneAdmin: session.role === 'zone_admin',
          isChurchAdmin: session.role === 'church_admin',
          zoneId: session.zoneId,
          churchId: session.churchId,
        }
      : null,
    session,
    loading,
    isAdmin: Boolean(session),
    signOut,
    refreshUser,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const bootstrap = useAdminStore(s => s.bootstrap);
  const signOut = useAdminStore(s => s.signOut);

  useEffect(() => {
    bootstrap();
    const unsub = onSessionExpired(() => { signOut(); });
    return () => unsub();
  }, []);

  return <>{children}</>;
}
