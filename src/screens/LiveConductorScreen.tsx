import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import { useWebSocket } from '../hooks/useWebSocket';

// Pure helper — exported for property-based testing
export function setActiveSong<T extends { id: string; isActive?: boolean }>(songs: T[], targetId: string): T[] {
  return songs.map(s => ({ ...s, isActive: s.id === targetId }));
}

interface LiveSong {
  id: string;
  title?: string;
  key?: string;
  isActive?: boolean;
}

interface Program {
  id: string;
  name?: string;
}

export default function LiveConductorScreen({ route, navigation }: any) {
  const program: Program = route.params?.program || {};

  const [songs, setSongs] = useState<LiveSong[]>([]);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState(false);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: LiveSong[] }>(
        `/songs/praise-night?praiseNightId=${encodeURIComponent(program.id)}`
      );
      const data = Array.isArray(res?.data) ? res.data : [];
      setSongs(data);
      const active = data.find(s => s.isActive);
      if (active) setActiveSongId(active.id);
    } catch (e) {
      console.error('[LiveConductor] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [program.id]);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  // Real-time updates — when any song's isActive changes via WS broadcast
  useWebSocket('song', 'all', (data: unknown) => {
    const event = data as { id?: string; isActive?: boolean };
    if (event?.isActive && event?.id) {
      setActiveSongId(event.id);
      setSongs(prev => setActiveSong(prev, event.id!));
    }
  }, true);

  async function handleSetActive(song: LiveSong) {
    if (song.id === activeSongId) return;
    const prev = activeSongId;
    setActiveSongId(song.id);
    setSongs(p => setActiveSong(p, song.id));
    setSetting(true);
    try {
      await apiClient.patch(`/songs/praise-night/${song.id}`, { isActive: true });
    } catch (e: any) {
      // Revert on failure
      setActiveSongId(prev);
      setSongs(p => prev ? setActiveSong(p, prev) : p.map(s => ({ ...s, isActive: false })));
      Alert.alert('Error', e.message || 'Failed to set active song.');
    } finally {
      setSetting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Conductor</Text>
        </View>
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>🎙 Live Conductor</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{program.name}</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.instructionBanner}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.info} style={{ marginRight: 6 }} />
        <Text style={styles.instructionText}>Tap a song to broadcast it live to all singers' phones</Text>
      </View>

      <FlatList
        data={songs}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="musical-notes-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No songs in this program</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.id === activeSongId;
          return (
            <TouchableOpacity
              style={[styles.songCard, isActive && styles.songCardActive]}
              onPress={() => handleSetActive(item)}
              activeOpacity={0.85}
              disabled={setting}
            >
              <View style={styles.songCardLeft}>
                <View style={[styles.songIcon, isActive && styles.songIconActive]}>
                  {isActive ? (
                    <Ionicons name="radio" size={18} color="#fff" />
                  ) : (
                    <Ionicons name="musical-note" size={18} color={Colors.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.songTitle, isActive && styles.songTitleActive]} numberOfLines={1}>
                    {item.title || 'Untitled'}
                  </Text>
                  {item.key ? <Text style={[styles.songMeta, isActive && { color: Colors.success + 'cc' }]}>Key: {item.key}</Text> : null}
                </View>
              </View>
              {isActive && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>● LIVE</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  loadingHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10, backgroundColor: Colors.background },
  backBtn: { padding: 4 },
  headerTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  headerSub: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.danger + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.danger + '40' },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.danger, marginRight: 5 },
  liveText: { color: Colors.danger, fontSize: 11, fontWeight: '800' },
  instructionBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.info + '10', borderBottomWidth: 1, borderBottomColor: Colors.info + '20' },
  instructionText: { color: Colors.info, fontSize: 12, fontWeight: '600', flex: 1 },
  songCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  songCardActive: { borderColor: Colors.success, borderWidth: 2, backgroundColor: Colors.success + '08' },
  songCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  songIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  songIconActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  songTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  songTitleActive: { color: Colors.success },
  songMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  liveBadge: { backgroundColor: Colors.success + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: Colors.success + '60' },
  liveBadgeText: { color: Colors.success, fontSize: 11, fontWeight: '800' },
});
