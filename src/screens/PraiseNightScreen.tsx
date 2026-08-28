import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';

interface Program {
  id: string;
  name: string;
  date: string;
  category: string;
  status?: string;
  location: string;
  scope: string;
  zoneId: string;
  songs?: any[];
  songIds?: any[];
}

const STATUS_COLORS: Record<string, string> = {
  ongoing:         Colors.success,
  'pre-rehearsal': Colors.info,
  archive:         Colors.textMuted,
  archived:        Colors.textMuted,
  draft:           Colors.warning,
};

const TABS = ['all', 'ongoing', 'pre-rehearsal', 'archive'] as const;

export default function PraiseNightScreen() {
  const { activeZone, isAllZones } = useZoneContext();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<typeof TABS[number]>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const result = await apiClient.get<{ success: boolean; data: Program[] }>(`/programs${zoneParam}`);
      setPrograms(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      console.error('[PraiseNight] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchPrograms();
  }, [fetchPrograms]);

  async function handleStatusChange(program: Program, newStatus: string) {
    try {
      setActionLoadingId(program.id);
      await apiClient.patch(`/programs/${program.id}/status`, { status: newStatus });
      fetchPrograms();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDuplicate(program: Program) {
    Alert.alert(
      'Duplicate Setlist',
      `Create a copy of "${program.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            try {
              setActionLoadingId(program.id);
              await apiClient.post(`/programs/${program.id}/duplicate`, {
                newName: `${program.name} (Copy)`,
                newDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              });
              Alert.alert('Done', 'Program duplicated.');
              fetchPrograms();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to duplicate');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  }

  const filtered = programs.filter((p) => {
    const s = p.status || p.category || 'pre-rehearsal';
    if (selectedTab === 'all') return true;
    if (selectedTab === 'ongoing') return s === 'ongoing';
    if (selectedTab === 'pre-rehearsal') return s === 'pre-rehearsal' || s === 'upcoming';
    if (selectedTab === 'archive') return s === 'archive' || s === 'archived';
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Programs" />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Programs" />

      {/* Context banner */}
      {!isAllZones && activeZone && (
        <View style={styles.contextBanner}>
          <Ionicons name="location" size={13} color={Colors.info} style={{ marginRight: 6 }} />
          <Text style={styles.contextText}>{activeZone.name}</Text>
        </View>
      )}

      {/* Status filter tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const count = programs.filter((p) => {
            const s = p.status || p.category || 'pre-rehearsal';
            if (tab === 'all') return true;
            if (tab === 'ongoing') return s === 'ongoing';
            if (tab === 'pre-rehearsal') return s === 'pre-rehearsal' || s === 'upcoming';
            if (tab === 'archive') return s === 'archive' || s === 'archived';
            return false;
          }).length;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.activeTab]}
              onPress={() => setSelectedTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                {tab === 'pre-rehearsal' ? 'Upcoming' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPrograms(); }} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="musical-notes-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No programs in this view</Text>
          </View>
        }
        renderItem={({ item }) => {
          const currentStatus = item.status || item.category || 'pre-rehearsal';
          const catColor = STATUS_COLORS[currentStatus] || Colors.accent;
          const songCount = Array.isArray(item.songIds)
            ? item.songIds.length
            : Array.isArray(item.songs)
              ? item.songs.length
              : 0;
          const isLoading = actionLoadingId === item.id;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusDot, { backgroundColor: catColor }]} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name || 'Unnamed Program'}</Text>
                  <Text style={styles.cardMeta}>
                    {item.date || '—'} · {item.location || 'Unknown location'} · {songCount} song{songCount !== 1 ? 's' : ''}
                  </Text>
                  {isAllZones && item.zoneId ? (
                    <Text style={styles.cardZone}>Zone: {item.zoneId}</Text>
                  ) : null}
                </View>
                <View style={[styles.statusBadge, { borderColor: catColor }]}>
                  <Text style={[styles.statusBadgeText, { color: catColor }]}>{currentStatus}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                {currentStatus !== 'ongoing' && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnLive]}
                    onPress={() => handleStatusChange(item, 'ongoing')}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={Colors.success} />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="play" size={12} color={Colors.success} style={{ marginRight: 4 }} />
                        <Text style={styles.btnLiveText}>Set Live</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                {currentStatus === 'ongoing' && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnMuted]}
                    onPress={() => handleStatusChange(item, 'pre-rehearsal')}
                    disabled={isLoading}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="pause" size={12} color={Colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.btnMutedText}>Pause</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {currentStatus !== 'archive' && currentStatus !== 'archived' && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnMuted]}
                    onPress={() => handleStatusChange(item, 'archive')}
                    disabled={isLoading}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="archive-outline" size={12} color={Colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.btnMutedText}>Archive</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {(currentStatus === 'archive' || currentStatus === 'archived') && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnMuted]}
                    onPress={() => handleStatusChange(item, 'pre-rehearsal')}
                    disabled={isLoading}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="refresh-outline" size={12} color={Colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.btnMutedText}>Restore</Text>
                    </View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.btn, styles.btnDupe]}
                  onPress={() => handleDuplicate(item)}
                  disabled={isLoading}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="copy-outline" size={12} color={Colors.accentBright} style={{ marginRight: 4 }} />
                    <Text style={styles.btnDupeText}>Copy</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
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

  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.info + '15',
    borderBottomWidth: 1,
    borderBottomColor: Colors.info + '30',
  },
  contextText: { color: Colors.info, fontSize: 12, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.surface },
  activeTab: { backgroundColor: Colors.accent },
  tabText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  activeTabText: { color: '#fff', fontWeight: '700' },

  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  cardInfo: { flex: 1 },
  cardName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardMeta: { color: Colors.textMuted, fontSize: 12 },
  cardZone: { color: Colors.info, fontSize: 11, marginTop: 3, fontWeight: '600' },
  statusBadge: { borderWidth: 1, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  btn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  btnLive: { backgroundColor: Colors.success + '15', borderColor: Colors.success },
  btnLiveText: { color: Colors.success, fontSize: 12, fontWeight: '700' },
  btnMuted: { borderColor: Colors.border, backgroundColor: 'transparent' },
  btnMutedText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  btnDupe: { backgroundColor: Colors.accent + '15', borderColor: Colors.accent, marginLeft: 'auto' as any },
  btnDupeText: { color: Colors.accentBright, fontSize: 12, fontWeight: '700' },
});
