import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { isHQGroup } from '../constants/zones';

export interface Program {
  id: string;
  name: string;
  date: string;
  category: string;
  status?: string;
  location: string;
  scope?: string;
  zoneId?: string;
  organizationId?: string;
  groupId?: string;
  subGroupId?: string;
  pageCategory?: string;
  songs?: any[];
  songIds?: any[];
  bannerImage?: string;
  bannerKey?: string;
  description?: string;
}

export function usePrograms() {
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      if (isChurchMode) {
        const churchId = activeChurch?.id;
        const [programsRes, songsRes] = await Promise.all([
          churchId
            ? api.programs.getAll({ groupId: churchId, subGroupId: churchId, includeChurch: true }).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          api.songs.getZoneSongs(activeZone?.id).catch(() => ({ data: [] })),
        ]);
        setPrograms(Array.isArray(programsRes?.data) ? programsRes.data : []);
        setAllSongs(Array.isArray(songsRes?.data) ? songsRes.data : []);
        return;
      }

      const resolvedZoneId = activeZone?.id || 'zone-001';
      const isHQ = isHQGroup(resolvedZoneId);

      let programsRes: any = await api.programs.getAll(isHQ ? undefined : resolvedZoneId).catch(() => null);

      // Fallback to global if zone query returned empty
      if (!programsRes?.success || !Array.isArray(programsRes.data) || programsRes.data.length === 0) {
        try {
          const fallback = await api.programs.getAll().catch(() => null);
          if (fallback?.success && Array.isArray(fallback.data) && fallback.data.length > 0) {
            programsRes = fallback;
          }
        } catch {}
      }

      const songsRes = await api.songs.getZoneSongs(activeZone?.id).catch(() => ({ data: [] }));

      let list: any[] = [];
      if (programsRes?.success && Array.isArray(programsRes.data)) list = programsRes.data;
      else if (Array.isArray(programsRes)) list = programsRes;
      else if (Array.isArray(programsRes?.data)) list = programsRes.data;

      // Exclude subgroup programs when not in church mode
      list = list.filter((p: any) => p.scope !== 'subgroup' && !p.subGroupId && !p.groupId && !p.sub_group_id);

      setPrograms(list);
      setAllSongs(Array.isArray(songsRes?.data) ? songsRes.data : []);
    } catch (e) {
      console.error('[usePrograms] fetch error:', e);
      setPrograms([]);
      setAllSongs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isChurchMode, activeChurch?.id, activeZone?.id]);

  // Reset stale data and re-fetch on scope change
  const lastScopeRef = useRef<string>('');
  useEffect(() => {
    const scopeKey = `${activeZone?.id ?? ''}:${isChurchMode ? (activeChurch?.id ?? '') : ''}`;
    if (lastScopeRef.current !== '' && lastScopeRef.current !== scopeKey) {
      setPrograms([]);
      setAllSongs([]);
      setLoading(true);
    }
    lastScopeRef.current = scopeKey;
    fetch();
  }, [fetch]);

  // Re-fetch on tab focus
  useFocusEffect(
    useCallback(() => {
      fetch();
    }, [fetch])
  );

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  /** Optimistically add or update a program in local state after a save */
  const upsertProgram = useCallback((saved: Program) => {
    setPrograms(prev => {
      const exists = prev.some(p => p.id === saved.id);
      return exists ? prev.map(p => (p.id === saved.id ? { ...p, ...saved } : p)) : [saved, ...prev];
    });
  }, []);

  /** Optimistically remove a program from local state */
  const removeProgram = useCallback((id: string) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
  }, []);

  return { programs, allSongs, loading, refreshing, refetch, upsertProgram, removeProgram };
}
