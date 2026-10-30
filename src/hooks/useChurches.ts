import { useState, useCallback, useEffect } from 'react';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { customAlert } from '../context/AlertContext';
import { useAdminStore } from '../stores/adminStore';

export interface Church {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  zoneName?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  coordinatorEmail?: string;
  coordinators?: Array<{ id: string; name: string; email: string }>;
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
  const createChurch = useCallback(async (name: string, code?: string, coordinatorEmail?: string): Promise<boolean> => {
    try {
      const cleanName = name.trim();
      const slug = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'CHURCH';
      const autoCode = (code && code.trim()) ? code.trim().toUpperCase() : `${slug}-${Math.floor(100 + Math.random() * 900)}`;

      const res = await api.churches.create({
        name: cleanName,
        code: autoCode,
        zoneId: activeZone?.id || adminUser?.zoneId,
      });

      const newChurchId = res?.data?.id || res?.data?.subGroupId;
      if (newChurchId && coordinatorEmail && coordinatorEmail.trim()) {
        await api.churches.addCoordinator(newChurchId, { identifier: coordinatorEmail.trim().toLowerCase() }).catch(() => {});
      }

      customAlert('Success', 'New church created successfully.');
      fetch();
      useAdminStore.getState().bootstrap().catch(() => {});
      return true;
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to create church');
      return false;
    }
  }, [activeZone?.id, adminUser?.zoneId, fetch]);

  const updateChurch = useCallback(async (churchId: string, name: string): Promise<boolean> => {
    try {
      const cleanName = name.trim();
      if (!cleanName) return false;
      await api.churches.update(churchId, { name: cleanName });
      customAlert('Updated', 'Church name updated successfully.');
      fetch();
      useAdminStore.getState().bootstrap().catch(() => {});
      return true;
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to update church');
      return false;
    }
  }, [fetch]);

  const deleteChurch = useCallback((churchId: string, churchName?: string, onDeleted?: () => void) => {
    customAlert(
      'Delete Church',
      `Are you sure you want to permanently delete "${churchName || 'this church'}"? All singers in this church will remain in the zone directory, and church-specific programs will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Church',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.churches.delete(churchId);
              customAlert('Deleted', `"${churchName || 'Church'}" has been deleted.`);
              fetch();
              useAdminStore.getState().bootstrap().catch(() => {});
              if (onDeleted) onDeleted();
            } catch (e: any) {
              customAlert('Error', e.message || 'Failed to delete church');
            }
          },
        },
      ]
    );
  }, [fetch]);

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
      useAdminStore.getState().bootstrap().catch(() => {});
      return true;
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to appoint coordinator');
      return false;
    }
  }, [fetch]);

  const removeCoordinator = useCallback(async (churchId: string, userId?: string): Promise<boolean> => {
    try {
      await api.churches.removeCoordinator(churchId, userId);
      customAlert('Removed', 'Church Coordinator removed.');
      fetch();
      useAdminStore.getState().bootstrap().catch(() => {});
      return true;
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to remove coordinator');
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
    updateChurch,
    deleteChurch,
    approveChurch,
    rejectChurch,
    assignCoordinator,
    removeCoordinator,
  };
}
