import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { apiClient } from '../lib/apiClient';
import { MasterSong } from '../components/MasterSongDetailModal';
import { ZoneSong } from '../components/ZoneSongFormModal';
import { useWebSocket } from './useWebSocket';

export type { MasterSong };

const PAGE_SIZE = 50;

export function useMasterLibrary(activeDomainTab: 'master' | 'zone') {
  const { activeZone } = useZoneContext();

  const [masterSongs, setMasterSongs] = useState<MasterSong[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [zoneSongs, setZoneSongs] = useState<ZoneSong[]>([]);
  const [zoneSongsLoading, setZoneSongsLoading] = useState(false);

  // ── Fetch master songs ─────────────────────────────────────────────────────
  const fetchMasterSongs = useCallback(async (reset: boolean = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const result = await api.songs.getMasterSongs(`limit=${PAGE_SIZE}&page=${currentPage}`);
      const newSongs: MasterSong[] = Array.isArray(result?.data) ? result.data : [];

      if (reset) {
        setMasterSongs(newSongs);
        setPage(1);
      } else {
        setMasterSongs(prev => [...prev, ...newSongs]);
        setPage(prev => prev + 1);
      }

      setHasMore(newSongs.length === PAGE_SIZE);
    } catch (e) {
      console.warn('[useMasterLibrary] fetchMasterSongs:', e);
      if (reset) setMasterSongs([]);
    } finally {
      setMasterLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    fetchMasterSongs(true);
  }, []);

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
    fetchMasterSongs(false);
  }, [fetchMasterSongs]);

  useWebSocket('songs', 'all', () => {
    fetchMasterSongs(true);
    if (activeDomainTab === 'zone') fetchZoneSongs();
  }, true);

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
