import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAdminStore } from '../stores/adminStore';
import { useWebSocket } from './useWebSocket';

export interface Program {
  id: string;
  name: string;
  date: string;
  category: string;
  status?: string;
  stage?: string;
  isActive?: boolean;
  isArchived?: boolean;
  location?: string;
  organizationId?: string;
  groupId?: string;
  pageCategory?: string;
  songs?: any[];
  songIds?: any[];
  bannerImage?: string;
  description?: string;
}

export function usePrograms() {
  const session = useAdminStore(s => s.session);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setError(null);

    // ONE URL — scoped by mode, no client-side filtering
    const programsUrl =
      session.mode === 'church' && session.churchId
        ? `/programs?groupId=${session.churchId}&includeChurch=true`
        : `/programs?zoneId=${session.zoneId}`;

    const songsUrl = `/songs/zone?zoneId=${session.zoneId}`;

    try {
      const programsRes = await apiClient.get<{ success: boolean; data: any[] }>(programsUrl);
      setPrograms(Array.isArray(programsRes?.data) ? programsRes.data : []);

      // Non-blocking background fetch for zone song statistics
      apiClient.get<{ success: boolean; data: any[] }>(songsUrl)
        .then(songsRes => {
          if (Array.isArray(songsRes?.data)) setAllSongs(songsRes.data);
        })
        .catch(() => {});
    } catch (e: any) {
      const msg = e?.message || 'Failed to load programs';
      console.error('[usePrograms]', msg);
      setError(msg);
      setPrograms([]);
      setAllSongs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.zoneId, session?.churchId, session?.mode]);

  useEffect(() => {
    setPrograms([]);
    setAllSongs([]);
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  useWebSocket('programs', 'all', () => {
    fetchData();
  }, Boolean(session));

  const upsertProgram = useCallback((saved: Program) => {
    setPrograms(prev => {
      const exists = prev.some(p => p.id === saved.id);
      return exists
        ? prev.map(p => (p.id === saved.id ? { ...p, ...saved } : p))
        : [saved, ...prev];
    });
  }, []);

  const removeProgram = useCallback((id: string) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
  }, []);

  return { programs, allSongs, loading, refreshing, error, refetch, upsertProgram, removeProgram };
}
