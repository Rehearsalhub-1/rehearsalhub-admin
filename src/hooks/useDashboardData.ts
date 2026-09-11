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
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setError(null);

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
        : session.role === 'hq_admin' && (!session.zoneId || session.zoneId === 'hq')
        ? `/members/hq`
        : session.zoneId
        ? `/members/zone/${session.zoneId}`
        : `/members/hq`;

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
          ? membersRes.data.slice(0, 5).map((u: any) => {
              const userObj = u.user || u.profile || {};
              const rawFirstName =
                u.firstName ||
                u.first_name ||
                userObj.firstName ||
                userObj.first_name ||
                (u.displayName ? u.displayName.split(' ')[0] : '') ||
                (u.userName ? u.userName.split(' ')[0] : '') ||
                (u.name ? u.name.split(' ')[0] : '') ||
                (userObj.name ? userObj.name.split(' ')[0] : '');

              const rawLastName =
                u.lastName ||
                u.last_name ||
                userObj.lastName ||
                userObj.last_name ||
                (u.displayName ? u.displayName.split(' ').slice(1).join(' ') : '') ||
                (u.userName ? u.userName.split(' ').slice(1).join(' ') : '') ||
                (u.name ? u.name.split(' ').slice(1).join(' ') : '') ||
                (userObj.name ? userObj.name.split(' ').slice(1).join(' ') : '');

              const email =
                u.email ||
                u.userEmail ||
                userObj.email ||
                userObj.userEmail ||
                '';

              const first_name = rawFirstName || (email ? email.split('@')[0] : 'Singer');
              const last_name = rawLastName || '';

              return {
                id: u.userId || userObj.id || u.id,
                first_name,
                last_name,
                email,
                designation: u.voicePart || u.designation || userObj.voicePart || '',
                role: u.role || 'member',
                church:
                  u.church ||
                  u.churchName ||
                  u.group?.name ||
                  u.subgroup?.name ||
                  u.subGroup?.name ||
                  userObj.group?.name ||
                  '',
                is_active:
                  u.status !== 'INACTIVE' &&
                  u.status !== 'inactive' &&
                  u.is_active !== false &&
                  u.isActive !== false,
              };
            })
          : []
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to load dashboard data';
      console.error('[useDashboardData]', msg);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.zoneId, session?.churchId, session?.mode, session?.role]);

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

  return { stats, recentPrograms, members, loading, refreshing, refetch, error };
}
