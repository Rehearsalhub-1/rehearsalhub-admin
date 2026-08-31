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
  const [availableZones, setAvailableZones] = useState<ZoneOption[]>([]);
  const [verifiedAdminZoneId, setVerifiedAdminZoneId] = useState<string | null>(null);

  // Build the zone list from the static config (for display purposes)
  const allConfigZones: ZoneOption[] = ZONES.map((z: any) => ({
    id: z.id,
    name: z.name,
    invitationCode: z.invitationCode,
  }));

  useEffect(() => {
    if (!adminUser) {
      setActiveZoneState(null);
      setAvailableZones([]);
      setVerifiedAdminZoneId(null);
      apiClient.setMobileTenantScope({ zoneId: null, zoneCode: null, scope: 'global' });
      return;
    }

    const initZone = async () => {
      try {
        // Fetch the admin's actual memberships from the API
        // This is the DB-verified scope — more trustworthy than JWT zoneId
        const res = await apiClient.get<{ success: boolean; data: { zoneMembers: any[]; hqMembers: any[] } }>('/members/mine');

        if (adminUser.isHQAdmin) {
          // HQ admin — can view all zones but not switch org scope
          setAvailableZones(allConfigZones);
          setActiveZoneState(null); // null = global view for HQ
          setVerifiedAdminZoneId(null);
          apiClient.setMobileTenantScope({ zoneId: null, zoneCode: null, scope: 'global' });
        } else {
          // Zone admin — find their ONE admin zone from memberships
          const zoneMembers = Array.isArray(res?.data?.zoneMembers) ? res.data.zoneMembers : [];

          // Find the membership where role is admin/coordinator
          const adminMembership = zoneMembers.find(m => {
            const r = (m.role || '').toLowerCase();
            return r === 'zone_admin' || r === 'zone_coordinator' || r === 'admin';
          });

          const verifiedZoneId = adminMembership?.zoneId || adminMembership?.organizationId || adminUser.zoneId;

          if (!verifiedZoneId) {
            console.warn('[ZoneProvider] Could not verify admin zone from DB — using JWT fallback');
          }

          // LOCK to their ONE admin zone
          const theirZone = allConfigZones.find(
            z => z.id === verifiedZoneId || z.invitationCode === verifiedZoneId
          );

          const lockedZone = theirZone ?? {
            id: verifiedZoneId || adminUser.zoneId || '',
            name: adminUser.zoneId || 'Your Zone',
            invitationCode: adminUser.zoneId || '',
          };

          setVerifiedAdminZoneId(lockedZone.id);
          setActiveZoneState(lockedZone);
          // Zone admins only see their own zone in the picker
          setAvailableZones([lockedZone]);

          apiClient.setMobileTenantScope({
            zoneId: lockedZone.id,
            zoneCode: lockedZone.invitationCode,
            scope: 'zone',
          });
        }
      } catch (err) {
        console.warn('[ZoneProvider] Failed to verify zone from API, using JWT fallback:', err);
        // Fallback to JWT claim
        if (adminUser.isHQAdmin) {
          setAvailableZones(allConfigZones);
          setActiveZoneState(null);
          apiClient.setMobileTenantScope({ zoneId: null, zoneCode: null, scope: 'global' });
        } else {
          const fallbackZone = allConfigZones.find(
            z => z.id === adminUser.zoneId || z.invitationCode === adminUser.zoneId
          );
          if (fallbackZone) {
            setActiveZoneState(fallbackZone);
            setAvailableZones([fallbackZone]);
            setVerifiedAdminZoneId(fallbackZone.id);
            apiClient.setMobileTenantScope({
              zoneId: fallbackZone.id,
              zoneCode: fallbackZone.invitationCode,
              scope: 'zone',
            });
          }
        }
      }
    };

    initZone();
  }, [adminUser?.id]);

  const setActiveZone = (zone: ZoneOption | null) => {
    // HARD RULE: zone admins CANNOT switch zones. Ever.
    if (!adminUser?.isHQAdmin) {
      console.warn('[ZoneProvider] Zone switch blocked — only HQ admins can switch zones');
      return;
    }
    // HQ admins can switch for viewing purposes
    setActiveZoneState(zone);
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
