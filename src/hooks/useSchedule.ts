import { useState, useCallback, useEffect } from 'react';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { ScheduleProgram } from '../screens/ScheduleScreen';

export function useSchedule() {
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [programs, setPrograms] = useState<ScheduleProgram[]>([]);
  const [activeProgramId, setActiveProgramId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const zoneId = isChurchMode ? undefined : activeZone?.id;
      const subGroupId = isChurchMode ? activeChurch?.id : undefined;
      const res = await api.schedule.getAll(zoneId, undefined, subGroupId);
      const data = Array.isArray(res?.data) ? res.data : [];
      setPrograms(data);
      if (data.length > 0) {
        setActiveProgramId(prev => {
          if (prev && data.some((p: ScheduleProgram) => p.id === prev)) return prev;
          const curr = data.find((p: ScheduleProgram) => p.isCurrent && !p.isArchived);
          if (curr) return curr.id;
          const firstActive = data.find((p: ScheduleProgram) => !p.isArchived);
          return firstActive ? firstActive.id : data[0].id;
        });
      } else {
        setActiveProgramId('');
      }
    } catch (e) {
      console.error('[useSchedule] fetch:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  const upsertProgram = useCallback((saved: ScheduleProgram) => {
    setPrograms(prev => {
      const exists = prev.some(p => p.id === saved.id);
      return exists ? prev.map(p => (p.id === saved.id ? { ...p, ...saved } : p)) : [saved, ...prev];
    });
  }, []);

  const removeProgram = useCallback((id: string) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
    setActiveProgramId(prev => {
      if (prev !== id) return prev;
      return '';
    });
  }, []);

  return {
    programs,
    activeProgramId,
    setActiveProgramId,
    loading,
    refreshing,
    refetch,
    upsertProgram,
    removeProgram,
  };
}
