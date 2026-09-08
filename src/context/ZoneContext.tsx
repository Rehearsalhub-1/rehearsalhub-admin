import React, { createContext, useContext } from 'react';
import { useAdminStore, ZoneOption, ChurchOption } from '../stores/adminStore';

export type { ZoneOption, ChurchOption };

export interface ZoneContextType {
  /** The zone the admin is currently "acting as". */
  activeZone: ZoneOption | null;
  /** Verified zones the admin belongs to (from /members/mine). */
  availableZones: ZoneOption[];
  /** true when HQ admin explicitly selects global all-zones view */
  isAllZones: boolean;
  setActiveZone: (zone: ZoneOption | null) => void;
  switchZone: (zone: ZoneOption | null) => void;

  /** Active UI role mode: 'org' (HQ/Zonal) or 'church' (Local church choir) */
  activeRoleMode: 'org' | 'church';
  isChurchMode: boolean;
  activeChurch: ChurchOption | null;
  userChurches: ChurchOption[];
  switchChurch: (church: ChurchOption) => void;
  toggleRoleMode: () => void;
  setRoleMode: (mode: 'org' | 'church') => void;
}

const ZoneContext = createContext<ZoneContextType | null>(null);

export function ZoneProvider({ children }: { children: React.ReactNode }) {
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

  const value: ZoneContextType = {
    activeZone,
    availableZones,
    isAllZones,
    setActiveZone: switchZone,
    switchZone: switchZone,
    activeRoleMode,
    isChurchMode,
    activeChurch,
    userChurches,
    switchChurch,
    toggleRoleMode,
    setRoleMode,
  };

  return <ZoneContext.Provider value={value}>{children}</ZoneContext.Provider>;
}

export const useZoneContext = (): ZoneContextType => {
  const context = useContext(ZoneContext);
  if (context) return context;
  // Fallback direct read from Zustand if outside provider
  const state = useAdminStore.getState();
  return {
    activeZone: state.activeZone,
    availableZones: state.availableZones,
    isAllZones: state.isAllZones,
    setActiveZone: state.switchZone,
    switchZone: state.switchZone,
    activeRoleMode: state.activeRoleMode,
    isChurchMode: state.isChurchMode,
    activeChurch: state.activeChurch,
    userChurches: state.userChurches,
    switchChurch: state.switchChurch,
    toggleRoleMode: state.toggleRoleMode,
    setRoleMode: state.setRoleMode,
  };
};
