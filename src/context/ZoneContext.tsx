import { useAdminStore } from '../stores/adminStore';

export interface ChurchOption {
  id: string;
  name: string;
}

export interface ZoneOption {
  id: string;
  name: string;
  invitationCode?: string;
}

/**
 * Legacy compat shim — screens that import from ZoneContext continue to work.
 * All values now derive from the single AdminSession in adminStore.
 */
export function useZoneContext() {
  const session = useAdminStore(s => s.session);

  return {
    activeZone: session
      ? { id: session.zoneId, name: session.zoneName, invitationCode: '' }
      : null,
    availableZones: session
      ? [{ id: session.zoneId, name: session.zoneName, invitationCode: '' }]
      : [],
    isAllZones: false,
    activeChurch: session?.churchId
      ? { id: session.churchId, name: session.churchName || '' }
      : null,
    userChurches: session?.churchId
      ? [{ id: session.churchId, name: session.churchName || '' }]
      : [],
    isChurchMode: session?.mode === 'church',
    activeRoleMode: (session?.mode === 'church' ? 'church' : 'org') as 'church' | 'org',
    // No-ops — mode changes go through adminStore.setMode()
    setActiveZone: () => {},
    switchZone: () => {},
    switchChurch: () => {},
    toggleRoleMode: () => {},
    setRoleMode: () => {},
  };
}

export function ZoneProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
