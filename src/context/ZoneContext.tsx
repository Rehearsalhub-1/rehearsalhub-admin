import React from 'react';
import { useAdminStore, ZoneOption, ChurchOption } from '../stores/adminStore';

export type { ZoneOption, ChurchOption };

export interface ZoneContextType {
  activeZone: ZoneOption | null;
  availableZones: ZoneOption[];
  isAllZones: boolean;
  setActiveZone: (zone: ZoneOption | null) => void;
  switchZone: (zone: ZoneOption | null) => void;
  activeRoleMode: 'org' | 'church';
  isChurchMode: boolean;
  activeChurch: ChurchOption | null;
  userChurches: ChurchOption[];
  switchChurch: (church: ChurchOption) => void;
  toggleRoleMode: () => void;
  setRoleMode: (mode: 'org' | 'church') => void;
}

/**
 * Direct hook into useAdminStore — ONE SINGLE SOURCE OF TRUTH (Zero Context Overhead)
 */
export function useZoneContext(): ZoneContextType {
  const activeZone = useAdminStore(s => s.activeZone);
  const availableZones = useAdminStore(s => s.availableZones);
  const isAllZones = useAdminStore(s => s.isAllZones);
  const switchZone = useAdminStore(s => s.switchZone);
  const activeRoleMode = useAdminStore(s => s.activeRoleMode);
  const isChurchMode = useAdminStore(s => s.isChurchMode);
  const activeChurch = useAdminStore(s => s.activeChurch);
  const userChurches = useAdminStore(s => s.userChurches);
  const switchChurch = useAdminStore(s => s.switchChurch);
  const toggleRoleMode = useAdminStore(s => s.toggleRoleMode);
  const setRoleMode = useAdminStore(s => s.setRoleMode);

  return {
    activeZone,
    availableZones,
    isAllZones,
    setActiveZone: switchZone,
    switchZone,
    activeRoleMode,
    isChurchMode,
    activeChurch,
    userChurches,
    switchChurch,
    toggleRoleMode,
    setRoleMode,
  };
}

export function ZoneProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
