import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAdminStore } from '../stores/adminStore';

export interface DashboardStats {
  totalMembers: number;
  activePrograms: number;
  totalSongs: number;
  pendingSongs: number;
}

const EMPTY_STATS: DashboardStats = {
  totalMembers: 0,
  activePrograms: 0,
  totalSongs: 0,
  pendingSongs: 0,
};

export function useDashboardData() {
  const session = useAdminStore(s => s.session);

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [recentPrograms, setRecentPrograms] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session) return;

    // Scope by mode — ONE clear rule
    const statsQuery =
      session.mode === 'church' && session.churchId
        ? `?churchId=${session.churchId}`
        : `?zoneId=${session.zoneId}`;

    const programsUrl =
      session.mode === 'church' && session.churchId
        ? `/programs?groupId=${session.churchId}&includeChurch=true`
        : `/programs?zoneId=${session.zoneId}`;

    const membersUrl =
      session.mode === 'church' && session.churchId
        ? `/subgroups/${session.churchId}/members`
        : `/members/zone/${session.zoneId}`;

    try {
      const [statsRes, programsRes, membersRes] = await Promise.all([
        apiClient
          .get<{ success: boolean; data: DashboardStats }>(
            `/admin/dashboard/stats${statsQuery}`
          )
          .catch(() => null),
        apiClient
          .get<{ success: boolean; data: any[] }>(programsUrl)
          .catch(() => null),
        apiClient
          .get<{ success: boolean; data: any[] }>(membersUrl)
          .catch(() => null),
      ]);

      if (statsRes?.data) {
        setStats({
          totalMembers: statsRes.data.totalMembers ?? 0,
          activePrograms: statsRes.data.activePrograms ?? 0,
          totalSongs: statsRes.data.totalSongs ?? 0,
          pendingSongs: statsRes.data.pendingSongs ?? 0,
        });
      }

      setRecentPrograms(
        Array.isArray(programsRes?.data) ? programsRes.data.slice(0, 4) : []
      );

      setMembers(
        Array.isArray(membersRes?.data)
          ? membersRes.data.slice(0, 5).map((u: any) => ({
              id: u.userId || u.id,
              first_name:
                u.firstName || u.first_name || (u.name || '').split(' ')[0] || 'Singer',
              last_name:
                u.lastName || u.last_name || (u.name || '').split(' ').slice(1).join(' ') || '',
              designation: u.voicePart || u.designation || '',
              role: u.role || 'member',
              church: u.church || u.churchName || '',
              is_active: u.status !== 'INACTIVE' && u.is_active !== false,
            }))
          : []
      );
    } catch (err) {
      console.warn('[useDashboardData] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.zoneId, session?.churchId, session?.mode]);

  useEffect(() => {
    setStats(EMPTY_STATS);
    setRecentPrograms([]);
    setMembers([]);
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  return { stats, recentPrograms, members, loading, refreshing, refetch };
}
