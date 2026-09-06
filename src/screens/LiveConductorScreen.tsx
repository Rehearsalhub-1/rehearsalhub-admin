import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';

export function setActiveSong<T extends { id: string; isActive?: boolean }>(songs: T[], targetId: string): T[] {
  return songs.map(s => ({ ...s, isActive: s.id === targetId }));
}

interface LiveSong {
  id: string;
  title?: string;
  key?: string;
  tempo?: string;
  leadSinger?: string;
  conductor?: string;
  isActive?: boolean;
  isHeard?: boolean;
}

interface Program {
  id: string;
  name?: string;
  location?: string;
  date?: string;
}

export default function LiveConductorScreen({ route, navigation }: any) {
  const program: Program = route.params?.program || {};

  const [songs, setSongs] = useState<LiveSong[]>([]);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSongs = useCallback(async () => {
    try {
      const res = await api.songs.getPraiseNightSongs(program.id);
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

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // Real-time WebSocket sync: when any song's isActive changes
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
      await api.songs.setActiveSong(song.id);
    } catch (e: any) {
      // Revert on failure
      setActiveSongId(prev);
      setSongs(p => (prev ? setActiveSong(p, prev) : p.map(s => ({ ...s, isActive: false }))));
      Alert.alert('Broadcast Error', e.message || 'Failed to broadcast song to choir.');
    } finally {
      setSetting(false);
    }
  }

  const activeSong = useMemo(() => {
    return songs.find(s => s.id === activeSongId) || null;
  }, [songs, activeSongId]);

  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const q = searchQuery.toLowerCase();
    return songs.filter(
      s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q) ||
        (s.leadSinger || '').toLowerCase().includes(q)
    );
  }, [songs, searchQuery]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Stage Conductor</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accentBright} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Stage Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            🎙 Live Stage Conductor
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {program.name || 'Rehearsal Program'}
          </Text>
        </View>
        <Badge label="LIVE ON AIR" variant="live" pulse={true} size="md" />
      </View>

      {/* Hero: Active Live Song Spotlight */}
      {activeSong ? (
        <View style={styles.spotlightWrapper}>
          <GradientCard variant="glow" style={styles.spotlightCard}>
            <View style={styles.spotlightTop}>
              <Badge label="BROADCASTING TO CHOIR" variant="live" size="sm" pulse={true} />
              {activeSong.tempo ? <Badge label={`${activeSong.tempo} BPM`} variant="tempo" size="sm" /> : null}
            </View>

            <Text style={styles.spotlightTitle} numberOfLines={2}>
              {activeSong.title || 'Untitled Song'}
            </Text>

            <View style={styles.spotlightMetaRow}>
              {activeSong.key ? <Badge label={`Key of ${activeSong.key}`} variant="key" size="sm" /> : null}
              {activeSong.leadSinger ? (
                <Badge label={`Lead: ${activeSong.leadSinger}`} variant="lead" size="sm" />
              ) : null}
            </View>

            <View style={styles.spotlightFooter}>
              <Ionicons name="wifi" size={14} color="#34d399" style={{ marginRight: 6 }} />
              <Text style={styles.spotlightFooterText}>
                All connected singers are locked to this song
              </Text>
            </View>
          </GradientCard>
        </View>
      ) : (
        <View style={styles.spotlightWrapper}>
          <GradientCard variant="glass" style={styles.spotlightCard}>
            <Text style={styles.noActiveTitle}>No Song Currently Live</Text>
            <Text style={styles.noActiveSubtitle}>
              Tap any song in the setlist below to broadcast its lyrics, audio, and conductor cues to all singers.
            </Text>
          </GradientCard>
        </View>
      )}

      {/* Setlist List Header with Search */}
      <View style={styles.setlistHeader}>
        <Text style={styles.setlistHeading}>Setlist Queue ({songs.length})</Text>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search setlist by title, key, or singer..."
        />
      </View>

      {/* Song Queue */}
      <FlatList
        data={filteredSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
            title={searchQuery ? 'No matching songs' : 'Empty Rehearsal Program'}
            description={
              searchQuery
                ? 'Try a different search query'
                : 'Add songs to this program to begin live rehearsal conduction.'
            }
          />
        }
        renderItem={({ item, index }) => {
          const isActive = item.id === activeSongId;
          return (
            <GradientCard
              variant={isActive ? 'accent' : 'surface'}
              style={styles.songCard}
              onPress={() => handleSetActive(item)}
            >
              <View style={styles.songCardInner}>
                <View style={styles.songIndexBox}>
                  <Text style={[styles.songIndexText, isActive && styles.songIndexTextActive]}>
                    #{index + 1}
                  </Text>
                </View>

                <View style={styles.songDetails}>
                  <Text style={[styles.songTitle, isActive && styles.songTitleActive]} numberOfLines={1}>
                    {item.title || 'Untitled Song'}
                  </Text>

                  <View style={styles.songBadgesRow}>
                    {item.key ? <Badge label={item.key} variant="key" size="sm" /> : null}
                    {item.tempo ? <Badge label={`${item.tempo} BPM`} variant="tempo" size="sm" /> : null}
                    {item.leadSinger ? (
                      <Text style={styles.leadSingerText} numberOfLines={1}>
                        🎤 {item.leadSinger}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.songActionBox}>
                  {isActive ? (
                    <View style={styles.activeBroadcastPill}>
                      <Ionicons name="radio" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.activeBroadcastText}>LIVE</Text>
                    </View>
                  ) : (
                    <View style={styles.tapToBroadcastPill}>
                      <Ionicons name="play" size={12} color={Colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.tapToBroadcastText}>Go Live</Text>
                    </View>
                  )}
                </View>
              </View>
            </GradientCard>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  spotlightWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  spotlightCard: {
    borderRadius: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  spotlightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spotlightTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  spotlightMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  spotlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  spotlightFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34d399',
  },
  noActiveTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  noActiveSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  setlistHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  setlistHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  songCard: {
    borderRadius: 16,
  },
  songCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songIndexBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  songIndexText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  songIndexTextActive: {
    color: '#ffffff',
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  songTitleActive: {
    color: '#ffffff',
  },
  songBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  leadSingerText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  songActionBox: {
    marginLeft: 10,
  },
  activeBroadcastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  activeBroadcastText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tapToBroadcastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tapToBroadcastText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
});
