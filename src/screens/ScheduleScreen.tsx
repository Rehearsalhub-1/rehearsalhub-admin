import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';

interface ScheduleProgram {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  zoneId: string;
  isArchived: boolean;
  days?: any[];
  weeks?: any[];
  newSongs?: any[];
}

export default function ScheduleScreen() {
  const { activeZone, isAllZones } = useZoneContext();
  const [programs, setPrograms] = useState<ScheduleProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const result = await apiClient.get<{ success: boolean; data: ScheduleProgram[] }>(`/schedule${zoneParam}`);
      setPrograms(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      console.error('[Schedule] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchPrograms();
  }, [fetchPrograms]);

  const active = programs.filter((p) => !p.isArchived);
  const archived = programs.filter((p) => p.isArchived);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Schedule" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: ScheduleProgram }) => {
    const isOpen = expanded === item.id;
    const newSongCount = Array.isArray(item.newSongs) ? item.newSongs.length : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpanded(isOpen ? null : item.id)}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Ionicons
              name={item.isArchived ? 'archive-outline' : 'calendar-outline'}
              size={20}
              color={item.isArchived ? Colors.textMuted : Colors.accentBright}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name || 'Unnamed Schedule'}</Text>
            <Text style={styles.cardMeta}>
              {isAllZones && item.zoneId ? `Zone: ${item.zoneId} · ` : ''}
              {newSongCount > 0 ? `${newSongCount} new songs · ` : ''}
              {item.updatedAt ? `Updated ${new Date(item.updatedAt).toLocaleDateString()}` : '—'}
            </Text>
          </View>
          {item.isArchived && (
            <View style={styles.archivedBadge}>
              <Text style={styles.archivedText}>Archived</Text>
            </View>
          )}
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textMuted}
          />
        </View>

        {isOpen && (
          <View style={styles.detail}>
            {newSongCount > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>New Songs ({newSongCount})</Text>
                {(item.newSongs || []).slice(0, 5).map((s: any, i: number) => (
                  <Text key={i} style={styles.detailItem}>• {typeof s === 'string' ? s : s.title || s.id || 'Unknown'}</Text>
                ))}
                {newSongCount > 5 && (
                  <Text style={styles.detailMore}>+{newSongCount - 5} more</Text>
                )}
              </View>
            )}
            {Array.isArray(item.days) && item.days.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Days Scheduled</Text>
                <Text style={styles.detailItem}>{item.days.map((d: any) => d.name || d).join(', ')}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Schedule" />
      <FlatList
        data={[...active, ...archived]}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPrograms(); }} tintColor={Colors.accent} />
        }
        ListHeaderComponent={
          active.length > 0 ? (
            <Text style={styles.sectionLabel}>Active ({active.length})</Text>
          ) : null
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No schedule programs found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 4,
  },

  list: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardMeta: { color: Colors.textMuted, fontSize: 12 },
  archivedBadge: {
    backgroundColor: Colors.textMuted + '22',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  archivedText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },

  detail: {
    padding: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 12,
  },
  detailSection: { gap: 4 },
  detailLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailItem: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  detailMore: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
});
