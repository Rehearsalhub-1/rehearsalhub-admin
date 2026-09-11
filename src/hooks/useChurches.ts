import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { customAlert } from '../context/AlertContext';

export interface Church {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  zoneName?: string;
  coordinatorName?: string;
  coordinatorEmail?: string;
  memberCount?: number;
  status?: 'active' | 'pending' | 'rejected';
  createdAt?: string;
}

export function useChurches() {
  const { activeZone } = useZoneContext();
  const { adminUser } = useAuth();

  const [churches, setChurches] = useState<Church[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const effectiveZoneId = activeZone?.id;
      const churchesRes = await api.churches.getAll(effectiveZoneId).catch(() => ({ data: [] as Church[] }));
      const churchList = Array.isArray(churchesRes.data) ? churchesRes.data : [];
      setChurches(churchList.filter(c => c.status === 'active' || !c.status));
      setPendingRequests([]);
    } catch (e) {
      console.error('[useChurches] fetch:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const createChurch = useCallback(async (name: string, code: string): Promise<boolean> => {
    try {
      await api.churches.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        zoneId: activeZone?.id || adminUser?.zoneId,
      });
      customAlert('Success', 'New church added to directory.');
      fetch();
      return true;
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to create church');
      return false;
    }
  }, [activeZone?.id, adminUser?.zoneId, fetch]);

  const approveChurch = useCallback(async (churchId: string) => {
    try {
      await api.churches.approve(churchId);
      customAlert('Approved', 'Church approved and activated.');
      fetch();
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to approve church');
    }
  }, [fetch]);

  const rejectChurch = useCallback((churchId: string) => {
    customAlert('Reject Request', 'Reject this church creation request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.churches.reject(churchId, 'Declined by coordinator');
            fetch();
          } catch (e: any) {
            customAlert('Error', e.message || 'Failed to reject');
          }
        },
      },
    ]);
  }, [fetch]);

  const assignCoordinator = useCallback(async (churchId: string, identifier: string): Promise<boolean> => {
    try {
      await api.churches.addCoordinator(churchId, { identifier });
      customAlert('Assigned', 'Church Coordinator appointed successfully.');
      fetch();
      return true;
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to appoint coordinator');
      return false;
    }
  }, [fetch]);

  return {
    churches,
    pendingRequests,
    loading,
    refreshing,
    refetch,
    createChurch,
    approveChurch,
    rejectChurch,
    assignCoordinator,
  };
}
