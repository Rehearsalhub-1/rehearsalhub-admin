import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ZONES } from '../constants/zones';
import { apiClient } from '../lib/apiClient';

export interface ZoneOption {
  id: string;
  name: string;
  invitationCode: string;
}

interface ZoneContextType {
  /** The zone the admin is currently "acting as". null = All Zones (HQ admin only). */
  activeZone: ZoneOption | null;
  /** All available zones for the zone picker (HQ admin sees all; zone admin sees only theirs). */
  availableZones: ZoneOption[];
  /** true when HQ admin is viewing across all zones */
  isAllZones: boolean;
  setActiveZone: (zone: ZoneOption | null) => void;
}

const ZoneContext = createContext<ZoneContextType>({
  activeZone: null,
  availableZones: [],
  isAllZones: true,
  setActiveZone: () => {},
});

export function ZoneProvider({ children }: { children: React.ReactNode }) {
  const { adminUser } = useAuth();
  const [activeZone, setActiveZoneState] = useState<ZoneOption | null>(null);

  // Build the zone list the admin can pick from
  const availableZones: ZoneOption[] = ZONES.map((z: any) => ({
    id: z.id,
    name: z.name,
    invitationCode: z.invitationCode,
  }));

  useEffect(() => {
    if (!adminUser) {
      setActiveZoneState(null);
      // Clear scope on logout
      apiClient.setMobileTenantScope({ zoneId: null, zoneCode: null, scope: 'global' });
      return;
    }
    if (adminUser.isHQAdmin) {
      // HQ admin defaults to "All Zones" (null = no filter)
      setActiveZoneState(null);
      apiClient.setMobileTenantScope({ zoneId: null, zoneCode: null, scope: 'global' });
    } else {
      // Zone admin is locked to their own zone
      const their = availableZones.find(
        (z) => z.id === adminUser.zoneId || z.invitationCode === adminUser.zoneId,
      );
      setActiveZoneState(their ?? null);
      if (their) {
        // Immediately lock the API client to this zone
        apiClient.setMobileTenantScope({ zoneId: their.id, zoneCode: their.invitationCode, scope: 'zone' });
      }
    }
  }, [adminUser?.id]);

  const setActiveZone = (zone: ZoneOption | null) => {
    // Only HQ admins can switch zones; zone admins are locked
    if (!adminUser?.isHQAdmin) return;
    setActiveZoneState(zone);
    // ── Update API client scope so all future requests carry correct headers
    apiClient.setMobileTenantScope({
      zoneId: zone?.id ?? null,
      zoneCode: zone?.invitationCode ?? null,
      scope: zone ? 'zone' : 'global',
    });
  };

  const isAllZones = adminUser?.isHQAdmin === true && activeZone === null;

  return (
    <ZoneContext.Provider value={{ activeZone, availableZones, isAllZones, setActiveZone }}>
      {children}
    </ZoneContext.Provider>
  );
}

export const useZoneContext = () => useContext(ZoneContext);
