import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';

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

export default function ActivityLogsScreen({ navigation }: any) {
  const { isChurchMode } = useZoneContext();
  const { adminUser } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLogs() {
    try {
      const result = await api.activityLogs.getAll();
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

  if (isChurchMode && !adminUser?.isHQAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Activity Logs" showZonePicker={false} />
        <View style={styles.centerNotice}>
          <View style={styles.noticeIconWrap}>
            <Ionicons name="time-outline" size={44} color="#64748b" />
          </View>
          <Text style={styles.noticeTitle}>Zonal / HQ Audit Logs</Text>
          <Text style={styles.noticeSub}>
            System audit logs and administrator activity history are restricted to Zonal and HQ administrators.
          </Text>
          <TouchableOpacity
            style={styles.noticeBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.noticeBackBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Activity Logs" showZonePicker={false} />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Activity Logs" showZonePicker={false} />
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
              <Ionicons name={getLogIcon(item.type)} size={18} color="#7c3aed" />
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
            <Ionicons name="analytics-outline" size={36} color="#cbd5e1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No activity logs found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  action: { color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  meta: { color: '#475569', fontSize: 12, marginBottom: 2 },
  time: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  centerNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  noticeIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  noticeSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  noticeBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#64748b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  noticeBackBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

