import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useWebSocket } from '../hooks/useWebSocket';

interface Song {
  id: string;
  title: string;
  writer: string;
  leadSinger?: string;
  status: string;
  zoneName: string;
  zoneId?: string;
  createdAt: string;
  notes?: string;
  key?: string;
  lyrics?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:  Colors.warning,
  approved: Colors.success,
  rejected: Colors.danger,
};

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;

export default function SubmittedSongsScreen({ navigation }: any) {
  const { activeZone, isAllZones } = useZoneContext();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const result = await apiClient.get<{ success: boolean; data: Song[] }>(`/submitted-songs${zoneParam}`);
      setSongs(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      console.error('[SubmittedSongs] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchSongs();
  }, [fetchSongs]);

  // Live updates
  useWebSocket('submitted-songs', 'all', () => { fetchSongs(); }, true);

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    try {
      await apiClient.patch(`/submitted-songs/${id}`, { status });
      setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (e) {
      Alert.alert('Error', 'Failed to update status.');
    }
  }

  const filtered = songs.filter((s) => {
    const matchStatus = filter === 'all' || s.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.title?.toLowerCase().includes(q) ||
      s.writer?.toLowerCase().includes(q) ||
      s.zoneName?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Submitted Songs" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Submitted Songs" />

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const count = songs.filter((s) => f === 'all' || s.status === f).length;
          const isPending = f === 'pending' && count > 0;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
              </Text>
              {isPending && filter !== f && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title, writer, or zone..."
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSongs(); }} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No songs in this view</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOpen = expanded === item.id;
          const statusColor = STATUS_COLORS[item.status] || Colors.textMuted;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setExpanded(isOpen ? null : item.id)}
              activeOpacity={0.75}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.songTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                  <Text style={styles.songMeta}>
                    {item.writer || '—'}
                    {item.leadSinger ? ` · ${item.leadSinger}` : ''}
                    {isAllZones && item.zoneName ? ` · ${item.zoneName}` : ''}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.badge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                    <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.textMuted}
                  />
                </View>
              </View>

              {isOpen && (
                <View style={styles.detail}>
                  {item.notes ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>{item.notes}</Text>
                    </View>
                  ) : null}
                  {item.key ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Key</Text>
                      <Text style={styles.detailValue}>{item.key}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={styles.viewSheetBtn}
                    onPress={() => navigation.navigate('SongDetail', { song: item })}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="document-text-outline" size={14} color={Colors.accentBright} style={{ marginRight: 6 }} />
                    <Text style={styles.viewSheetText}>View Full Sheet & AudioLab</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.accentBright} style={{ marginLeft: 'auto' as any }} />
                  </TouchableOpacity>

                  {item.status === 'pending' && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: Colors.success + '20', borderColor: Colors.success }]}
                        onPress={() => updateStatus(item.id, 'approved')}
                      >
                        <Ionicons name="checkmark" size={15} color={Colors.success} style={{ marginRight: 4 }} />
                        <Text style={[styles.actionText, { color: Colors.success }]}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: Colors.danger + '20', borderColor: Colors.danger }]}
                        onPress={() => updateStatus(item.id, 'rejected')}
                      >
                        <Ionicons name="close" size={15} color={Colors.danger} style={{ marginRight: 4 }} />
                        <Text style={[styles.actionText, { color: Colors.danger }]}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: Colors.accent,
  },
  filterText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    paddingRight: 10,
  },
  songTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  songMeta: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  detail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    width: 90,
  },
  detailValue: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  viewSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  viewSheetText: {
    color: Colors.accentBright,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
