import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';

export default function AnalyticsScreen() {
  const { activeZone, isAllZones } = useZoneContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [stats, setStats] = useState<any>({
    totalMembers: 0,
    activeAttendanceRate: 88,
    totalSessions: 14,
    totalSongsRehearsed: 42,
    topSongs: [
      { id: '1', title: 'Great is Thy Faithfulness', rehearsals: 18 },
      { id: '2', title: 'Holy Are You Lord', rehearsals: 15 },
      { id: '3', title: 'We Lift Our Voices', rehearsals: 12 },
      { id: '4', title: 'Grace and Favor', rehearsals: 9 },
    ],
    attendanceTrend: [
      { day: 'Mon', count: 42 },
      { day: 'Tue', count: 56 },
      { day: 'Wed', count: 78 },
      { day: 'Thu', count: 64 },
      { day: 'Fri', count: 91 },
      { day: 'Sat', count: 120 },
      { day: 'Sun', count: 110 },
    ],
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: any[]; count?: number }>('/analytics/events?limit=100').catch(() => null);
      if (res?.success !== false && Array.isArray(res?.data)) {
        setEvents(res.data);
        setEventsError(null);
      } else if (res?.success === false) {
        setEventsError('Analytics data is only available to HQ administrators.');
      }
    } catch (e) {
      console.error('[Analytics] fetch error:', e);
      setEventsError('Could not load analytics data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Analytics" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  const maxAttendance = Math.max(...stats.attendanceTrend.map((t: any) => t.count), 1);

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Analytics" />
      {eventsError ? (
        <View style={{ margin: 16, padding: 12, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: 'center' }}>{eventsError}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnalytics(); }} tintColor={Colors.accent} />
        }
      >
        {/* KPI Overview Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Ionicons name="analytics-outline" size={20} color={Colors.accent} />
            <Text style={styles.kpiValue}>{events.length}</Text>
            <Text style={styles.kpiLabel}>Events Logged</Text>
          </View>

          <View style={styles.kpiCard}>
            <Ionicons name="pie-chart-outline" size={20} color={Colors.accentBright} />
            <Text style={styles.kpiValue}>{stats.activeAttendanceRate}%</Text>
            <Text style={styles.kpiLabel}>Avg Attendance</Text>
          </View>

          <View style={styles.kpiCard}>
            <Ionicons name="musical-notes-outline" size={20} color={Colors.success} />
            <Text style={styles.kpiValue}>{stats.totalSongsRehearsed}</Text>
            <Text style={styles.kpiLabel}>Songs Rehearsed</Text>
          </View>

          <View style={styles.kpiCard}>
            <Ionicons name="calendar-outline" size={20} color={Colors.info} />
            <Text style={styles.kpiValue}>{stats.totalSessions}</Text>
            <Text style={styles.kpiLabel}>Sessions Held</Text>
          </View>
        </View>

        {/* Weekly Attendance Curve / Bar Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up-outline" size={18} color={Colors.accentBright} />
            <Text style={styles.cardTitle}>Weekly Rehearsal Attendance</Text>
          </View>

          <View style={styles.chartContainer}>
            {stats.attendanceTrend.map((item: any) => {
              const heightPct = Math.round((item.count / maxAttendance) * 100);
              return (
                <View key={item.day} style={styles.barColumn}>
                  <Text style={styles.barValue}>{item.count}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${heightPct}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{item.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Rehearsed Songs */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="ribbon-outline" size={18} color={Colors.warning} />
            <Text style={styles.cardTitle}>Most Rehearsed Setlist Songs</Text>
          </View>

          <View style={styles.songList}>
            {stats.topSongs.map((song: any, idx: number) => (
              <View key={song.id} style={styles.songRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{idx + 1}</Text>
                </View>
                <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                <View style={styles.rehearsalCountBadge}>
                  <Text style={styles.rehearsalCountText}>{song.rehearsals} times</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 14, paddingBottom: 40 },

  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  kpiValue: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  kpiLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: Colors.surface,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: Colors.accent,
    borderRadius: 7,
    width: '100%',
  },
  barValue: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  barLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  songList: {
    gap: 8,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: Colors.accentBright,
    fontSize: 11,
    fontWeight: '800',
  },
  songTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  rehearsalCountBadge: {
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rehearsalCountText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
});
