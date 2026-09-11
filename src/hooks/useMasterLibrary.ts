import { useState, useCallback, useEffect } from 'react';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { MasterSong } from '../components/MasterSongDetailModal';
import { ZoneSong } from '../components/ZoneSongFormModal';
import { useWebSocket } from './useWebSocket';

export type { MasterSong };

export function useMasterLibrary(activeDomainTab: 'master' | 'zone') {
  const { activeZone } = useZoneContext();

  const [masterSongs, setMasterSongs] = useState<MasterSong[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [zoneSongs, setZoneSongs] = useState<ZoneSong[]>([]);
  const [zoneSongsLoading, setZoneSongsLoading] = useState(false);

  // ── Fetch master songs ─────────────────────────────────────────────────────
  const fetchMasterSongs = useCallback(async () => {
    try {
      const result = await api.songs.getMasterSongs();
      setMasterSongs(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      console.warn('[useMasterLibrary] fetchMasterSongs:', e);
      setMasterSongs([]);
    } finally {
      setMasterLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterSongs();
  }, [fetchMasterSongs]);

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
    fetchMasterSongs();
  }, [fetchMasterSongs]);

  useWebSocket('songs', 'all', () => {
    fetchMasterSongs();
    if (activeDomainTab === 'zone') fetchZoneSongs();
  }, true);

  // ── Optimistic mutators (used by screen action handlers) ──────────────────
  const upsertMasterSong = useCallback((song: MasterSong) => {
    setMasterSongs(prev => {
      const exists = prev.some(s => s.id === song.id);
      return exists ? prev.map(s => (s.id === song.id ? { ...s, ...song } : s)) : [song, ...prev];
    });
  }, []);

  const removeMasterSong = useCallback((id: string) => {
    setMasterSongs(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleHideMasterSong = useCallback((id: string) => {
    setMasterSongs(prev =>
      prev.map(s => (s.id === id ? { ...s, isHidden: !s.isHidden } : s))
    );
  }, []);

  const removeZoneSong = useCallback((id: string) => {
    setZoneSongs(prev => prev.filter(s => s.id !== id));
  }, []);

  return {
    masterSongs,
    masterLoading,
    refreshing,
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
