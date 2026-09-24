import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { apiClient } from '../lib/apiClient';
import { MasterSong } from '../components/MasterSongDetailModal';
import { ZoneSong } from '../components/ZoneSongFormModal';
import { useWebSocket } from './useWebSocket';

export type { MasterSong };

const PAGE_SIZE = 50;

export function useMasterLibrary(activeDomainTab: 'master' | 'zone', searchQuery: string = '') {
  const { activeZone } = useZoneContext();

  const [masterSongs, setMasterSongs] = useState<MasterSong[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(1);
  const inFlightRef = useRef(false);

  const [zoneSongs, setZoneSongs] = useState<ZoneSong[]>([]);
  const [zoneSongsLoading, setZoneSongsLoading] = useState(false);

  // ── Fetch master songs ─────────────────────────────────────────────────────
  const fetchMasterSongs = useCallback(async (reset: boolean = false) => {
    if (inFlightRef.current && !reset) return;
    inFlightRef.current = true;

    const targetPage = reset ? 1 : pageRef.current;
    if (reset) {
      pageRef.current = 1;
    } else {
      setLoadingMore(true);
    }

    const currentSearch = searchQuery.trim();

    try {
      const searchParam = currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : '';
      const limit = currentSearch ? 100 : PAGE_SIZE;
      const result = await api.songs.getMasterSongs(`limit=${limit}&page=${targetPage}${searchParam}`);
      const newSongs: MasterSong[] = Array.isArray(result?.data) ? result.data : [];

      if (reset) {
        setMasterSongs(newSongs);
        pageRef.current = 2;
      } else {
        setMasterSongs(prev => {
          const existingIds = new Set(prev.map(s => String(s.id)));
          const uniqueNew = newSongs.filter(s => !existingIds.has(String(s.id)));
          return [...prev, ...uniqueNew];
        });
        pageRef.current += 1;
      }

      setHasMore(newSongs.length === (currentSearch ? 100 : PAGE_SIZE));
    } catch (e) {
      console.warn('[useMasterLibrary] fetchMasterSongs:', e);
      if (reset) setMasterSongs([]);
    } finally {
      inFlightRef.current = false;
      setMasterLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchMasterSongs(true);
  }, [searchQuery, fetchMasterSongs]);

  // ── Fetch zone songs (lazy — only when zone tab is active) ─────────────────
  const fetchZoneSongs = useCallback(async () => {
    setZoneSongsLoading(true);
    try {
      const result = await api.songs.getZoneSongs(activeZone?.id);
      setZoneSongs(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      console.warn('[useMasterLibrary] fetchZoneSongs:', e);
    } finally {
      setZoneSongsLoading(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    if (activeDomainTab === 'zone') {
      fetchZoneSongs();
    }
  }, [activeDomainTab, fetchZoneSongs]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetchMasterSongs(true);
  }, [fetchMasterSongs]);

  const loadMore = useCallback(() => {
    if (!hasMore || inFlightRef.current || masterLoading || loadingMore) return;
    fetchMasterSongs(false);
  }, [hasMore, masterLoading, loadingMore, fetchMasterSongs]);

  useWebSocket('songs', 'all', useCallback((rawData: any) => {
    // Apply the WebSocket update in-place instead of re-fetching all 50 songs.
    // Only trigger a full refetch if it's a bulk/programmatic reload signal
    // (no id = broadcast signal, not a single song update).
    const update = (rawData as any)?.data || rawData;
    if (!update || typeof update !== 'object' || !update.id) {
      // Bulk signal — do a background refetch
      fetchMasterSongs(true);
      if (activeDomainTab === 'zone') fetchZoneSongs();
      return;
    }

    // Single song update — patch in-place
    if (update.deleted || update.isDeleted) {
      setMasterSongs(prev => prev.filter(s => s.id !== String(update.id)));
      return;
    }
    setMasterSongs(prev => {
      const idx = prev.findIndex(s => s.id === String(update.id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...update };
        return next;
      }
      // New song added — prepend
      return [update as MasterSong, ...prev];
    });
  }, [fetchMasterSongs, fetchZoneSongs, activeDomainTab]), true);

  // ── Optimistic mutators (used by screen action handlers) ──────────────────
  const upsertMasterSong = useCallback((song: MasterSong) => {
    setMasterSongs(prev => {
      const exists = prev.some(s => s.id === song.id);
      return exists ? prev.map(s => (s.id === song.id ? { ...s, ...song } : s)) : [song, ...prev];
    });
  }, []);

  const removeMasterSong = useCallback(async (id: string) => {
    const previous = masterSongs.find(s => s.id === id);
    const previousIndex = masterSongs.findIndex(s => s.id === id);
    if (!previous) return;
    // Optimistic remove
    setMasterSongs(prev => prev.filter(s => s.id !== id));
    try {
      await apiClient.delete(`/master-songs/${id}`);
    } catch (err: any) {
      // Rollback — re-insert at original position
      setMasterSongs(prev => {
        const next = [...prev];
        next.splice(previousIndex, 0, previous);
        return next;
      });
      Alert.alert('Delete Failed', err?.message || 'Could not delete song. Please try again.');
    }
  }, [masterSongs]);

  const toggleHideMasterSong = useCallback(async (id: string) => {
    const previous = masterSongs.find(s => s.id === id);
    if (!previous) return;
    const nextHidden = !previous.isHidden;
    // Optimistic update
    setMasterSongs(prev =>
      prev.map(s => (s.id === id ? { ...s, isHidden: nextHidden } : s))
    );
    try {
      await apiClient.patch(`/master-songs/${id}`, { isHidden: nextHidden });
    } catch (err: any) {
      // Rollback on failure
      setMasterSongs(prev =>
        prev.map(s => (s.id === id ? { ...s, isHidden: previous.isHidden } : s))
      );
      Alert.alert('Error', err?.message || 'Failed to update song visibility. Please try again.');
    }
  }, [masterSongs]);

  const removeZoneSong = useCallback((id: string) => {
    setZoneSongs(prev => prev.filter(s => s.id !== id));
  }, []);

  return {
    masterSongs,
    masterLoading,
    loadingMore,
    refreshing,
    hasMore,
    loadMore,
    zoneSongs,
    zoneSongsLoading,
    refetch,
    fetchZoneSongs,
    upsertMasterSong,
    removeMasterSong,
    toggleHideMasterSong,
    removeZoneSong,
  };
}
