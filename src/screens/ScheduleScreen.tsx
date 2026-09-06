import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
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
  const { activeZone, isAllZones, isChurchMode, activeChurch } = useZoneContext();
  const [programs, setPrograms] = useState<ScheduleProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    try {
      const result = await api.schedule.getAll(activeZone?.id);
      setPrograms(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      console.error('[Schedule] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  useEffect(() => {
    setLoading(true);
    fetchPrograms();
  }, [fetchPrograms]);

  const active = programs.filter((p) => !p.isArchived);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title={isChurchMode ? "Church Schedule" : "Schedule Manager"} />
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
          <View style={[styles.cardIcon, { backgroundColor: item.isArchived ? '#f1f5f9' : '#f5f3ff' }]}>
            <Ionicons
              name={item.isArchived ? 'archive-outline' : 'calendar-outline'}
              size={20}
              color={item.isArchived ? '#94a3b8' : '#7c3aed'}
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
            color="#94a3b8"
          />
        </View>

        {isOpen && (
          <View style={styles.detail}>
            {Array.isArray(item.days) && item.days.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Day Schedules ({item.days.length})</Text>
                {item.days.slice(0, 3).map((d: any, idx: number) => (
                  <Text key={idx} style={styles.detailItem} numberOfLines={1}>
                    • {d.dayName || d.date || `Day ${idx + 1}`}: {d.notes || d.theme || 'Rehearsal Session'}
                  </Text>
                ))}
                {item.days.length > 3 && (
                  <Text style={styles.detailMore}>+{item.days.length - 3} more days</Text>
                )}
              </View>
            )}

            {Array.isArray(item.newSongs) && item.newSongs.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Assigned Songs ({item.newSongs.length})</Text>
                {item.newSongs.slice(0, 3).map((s: any, idx: number) => (
                  <Text key={idx} style={styles.detailItem} numberOfLines={1}>
                    • {typeof s === 'string' ? s : s.title || s.name || `Song ${idx + 1}`}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Schedule Manager" />
      <FlatList
        data={programs}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPrograms(); }} tintColor={Colors.accent} />
        }
        ListHeaderComponent={
          active.length > 0 ? (
            <Text style={styles.sectionLabel}>Active Rehearsal Schedules ({active.length})</Text>
          ) : null
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={36} color="#cbd5e1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No schedule programs found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },

  sectionLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 4,
  },

  list: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: { color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardMeta: { color: '#64748b', fontSize: 12 },
  archivedBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  archivedText: { color: '#64748b', fontSize: 11, fontWeight: '700' },

  detail: {
    padding: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  detailSection: { gap: 4 },
  detailLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailItem: { color: '#334155', fontSize: 13, lineHeight: 18 },
  detailMore: { color: '#94a3b8', fontSize: 12, fontStyle: 'italic' },
});
