import { useState, useCallback, useEffect, useRef } from 'react';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { SongSubmission, SongSubmissionMessage } from '../components/SubmissionReviewModal';

export type { SongSubmission };

export function useSubmissions() {
  const { activeZone } = useZoneContext();

  const [songs, setSongs] = useState<SongSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const result = await api.submittedSongs.getAll(activeZone?.id);
      setSongs(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      console.warn('[useSubmissions] fetch:', e);
      setSongs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Audio cleanup ref — managed here so the screen just calls toggleAudio
  const soundRef = useRef<any>(null);

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  // ── Optimistic mutators ────────────────────────────────────────────────────
  const approveSong = useCallback((id: string) => {
    setSongs(prev => prev.map(s => (s.id === id ? { ...s, status: 'approved' } : s)));
    api.submittedSongs.approve(id).catch(() => {});
  }, []);

  const rejectSong = useCallback((id: string, notes: string) => {
    setSongs(prev => prev.map(s => (s.id === id ? { ...s, status: 'rejected', rejectNotes: notes } : s)));
    api.submittedSongs.reject(id, notes).catch(() => {});
  }, []);

  const deleteSong = useCallback((id: string) => {
    setSongs(prev => prev.filter(s => s.id !== id));
  }, []);

  const addMessage = useCallback((songId: string, message: SongSubmissionMessage) => {
    setSongs(prev =>
      prev.map(s => {
        if (s.id !== songId) return s;
        return { ...s, conversation: [...(s.conversation || []), message] };
      })
    );
    api.submittedSongs
      .reply(songId, message.message, message.senderName, message.replyTo)
      .catch(() => {});
  }, []);

  return {
    songs,
    loading,
    refreshing,
    soundRef,
    refetch,
    approveSong,
    rejectSong,
    deleteSong,
    addMessage,
    setSongs,
  };
}
