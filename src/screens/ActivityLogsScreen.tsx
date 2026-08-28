import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';

interface ActivityLog {
  id: string;
  action: string;
  message: string;
  userName: string;
  section: string;
  timestamp: unknown;
  type: string;
}

function getLogIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'create': return 'add-circle-outline';
    case 'update': return 'create-outline';
    case 'delete': return 'trash-outline';
    case 'login':  return 'key-outline';
    default:       return 'clipboard-outline';
  }
}

export default function ActivityLogsScreen() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLogs() {
    try {
      const result = await apiClient.get<{ success: boolean; data: ActivityLog[] }>('/activity-logs');
      setLogs(Array.isArray(result.data) ? result.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchLogs(); }, []);

  function formatTime(ts: unknown): string {
    if (!ts) return '—';
    try {
      if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
        return (ts as { toDate: () => Date }).toDate().toLocaleString();
      }
      if (typeof ts === 'object' && ts !== null && '_seconds' in ts) {
        return new Date(Number((ts as { _seconds: number })._seconds) * 1000).toLocaleString();
      }
      if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
        return new Date(Number((ts as { seconds: number }).seconds) * 1000).toLocaleString();
      }
      return new Date(ts as string | number).toLocaleString();
    } catch { return '—'; }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={logs}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(); }} tintColor={Colors.accent} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name={getLogIcon(item.type)} size={18} color={Colors.accentBright} />
            </View>
            <View style={styles.info}>
              <Text style={styles.action}>{item.action || item.message || 'Activity'}</Text>
              <Text style={styles.meta}>
                {item.userName || 'Coordinator'} · {item.section || 'General'}
              </Text>
              <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="analytics-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No activity logs found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  list: { padding: 16, gap: 10, paddingBottom: 20 },
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  info: { flex: 1 },
  action: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  meta: { color: Colors.textSecondary, fontSize: 12, marginBottom: 2 },
  time: { color: Colors.textMuted, fontSize: 11 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
