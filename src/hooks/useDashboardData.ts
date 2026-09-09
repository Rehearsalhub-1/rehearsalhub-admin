import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';

export interface DashboardStats {
  totalMembers: number;
  activePrograms: number;
  totalSongs: number;
  pendingSongs: number;
}

export interface DashboardMemberPreview {
  id: string;
  first_name: string;
  last_name: string;
  designation: string;
  role: string;
  church: string;
  is_active: boolean;
}

const INITIAL_STATS: DashboardStats = {
  totalMembers: 0,
  activePrograms: 0,
  totalSongs: 0,
  pendingSongs: 0,
};

export function useDashboardData() {
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [recentPrograms, setRecentPrograms] = useState<any[]>([]);
  const [members, setMembers] = useState<DashboardMemberPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const zoneId = isChurchMode ? undefined : activeZone?.id;
      const churchId = isChurchMode ? activeChurch?.id : undefined;

      const [statsRes, programsRes, membersRes] = await Promise.all([
        api.dashboard.getStats(zoneId, churchId).catch(() => null),
        api.programs
          .getAll(
            isChurchMode && churchId
              ? { groupId: churchId, subGroupId: churchId, includeChurch: true }
              : { zoneId, includeChurch: true }
          )
          .catch(() => ({ data: [] })),
        (isChurchMode && churchId
          ? api.churches.getMembers(churchId)
          : api.members.getDirectory(zoneId, 10)
        ).catch(() => ({ data: [] })),
      ]);

      if (statsRes) {
        setStats({
          totalMembers: statsRes.totalMembers ?? 0,
          activePrograms: statsRes.activePrograms ?? 0,
          totalSongs: statsRes.totalSongs ?? 0,
          pendingSongs: statsRes.pendingSongs ?? 0,
        });
      }

      setRecentPrograms(Array.isArray(programsRes?.data) ? programsRes.data.slice(0, 4) : []);

      if (Array.isArray(membersRes?.data)) {
        setMembers(
          membersRes.data.slice(0, 5).map((u: any) => ({
            id: u.id || u.userId,
            first_name: u.firstName || u.first_name || (u.name || '').split(' ')[0] || 'Singer',
            last_name: u.lastName || u.last_name || (u.name || '').split(' ').slice(1).join(' ') || '',
            designation: u.voicePart || u.designation || '',
            role: u.role || 'member',
            church: isChurchMode ? (activeChurch?.name || '') : (u.church || u.churchName || ''),
            is_active: u.is_active !== false,
          }))
        );
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.warn('[useDashboardData] fetch error:', err);
      setRecentPrograms([]);
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  // Reset stale data and re-fetch immediately when scope switches
  const lastScopeRef = useRef<string>('');
  useEffect(() => {
    const scopeKey = `${activeZone?.id ?? ''}:${isChurchMode ? (activeChurch?.id ?? '') : ''}`;
    if (lastScopeRef.current !== '' && lastScopeRef.current !== scopeKey) {
      setStats(INITIAL_STATS);
      setRecentPrograms([]);
      setMembers([]);
      setLoading(true);
    }
    lastScopeRef.current = scopeKey;
    fetch();
  }, [fetch]);

  // Re-fetch when screen regains focus (e.g. returning from MoreScreen after scope switch)
  useFocusEffect(
    useCallback(() => {
      fetch();
    }, [fetch])
  );

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  return { stats, recentPrograms, members, loading, refreshing, refetch };
}
