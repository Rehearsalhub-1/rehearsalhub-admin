import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';
import ZoneHeader from '../components/ZoneHeader';
import { apiClient } from '../lib/apiClient';

interface Stats {
  totalSongs: number;
  pendingSongs: number;
  totalMembers: number;
  activePrograms: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  iconName: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
}

function StatCard({ label, value, color, iconName, loading }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statTop}>
        <View style={[styles.statIconContainer, { backgroundColor: `${color}18` }]}>
          <Ionicons name={iconName} size={18} color={color} />
        </View>
        {loading
          ? <ActivityIndicator size="small" color={color} />
          : <Text style={[styles.statValue, { color }]}>{value}</Text>
        }
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface QuickActionProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
}

function QuickAction({ label, iconName, onPress, badge }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.75}>
      <View style={{ position: 'relative', alignSelf: 'center' }}>
        <View style={styles.quickActionIconWrapper}>
          <Ionicons name={iconName} size={22} color={Colors.accentBright} />
        </View>
        {badge != null && badge > 0 && (
          <View style={styles.quickBadge}>
            <Text style={styles.quickBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const { adminUser } = useAuth();
  const { activeZone, isAllZones } = useZoneContext();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const [songsRes, membersRes, programsRes] = await Promise.all([
        apiClient.get<any>(`/submitted-songs${zoneParam}`).catch(() => null),
        apiClient.get<any>(`/profiles/directory${zoneParam}`).catch(() => null),
        apiClient.get<any>(`/programs${zoneParam}`).catch(() => null),
      ]);

      const songs: any[] = Array.isArray(songsRes?.data) ? songsRes.data : [];
      const members: any[] = Array.isArray(membersRes?.data) ? membersRes.data : [];
      const programs: any[] = Array.isArray(programsRes?.data) ? programsRes.data : [];

      setStats({
        totalSongs: songs.length,
        pendingSongs: songs.filter((s: any) => s.status === 'pending').length,
        totalMembers: members.length,
        activePrograms: programs.filter((p: any) => (p.status || p.category) === 'ongoing').length,
      });
    } catch (e) {
      console.error('[Dashboard] stats error:', e);
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoadingStats(true);
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const roleTitle = adminUser?.isHQAdmin
    ? 'HQ Admin'
    : (adminUser?.role || '').toLowerCase().includes('church') || (adminUser?.role || '').toLowerCase().includes('subgroup')
    ? 'Church Coordinator'
    : 'Zonal Coordinator';

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Dashboard" />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />
        }
      >
        {/* Welcome banner */}
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.adminName}>{adminUser?.name || adminUser?.email?.split('@')[0] || 'Coordinator'}</Text>
            <View style={styles.rolePill}>
              <Ionicons
                name={adminUser?.isHQAdmin ? 'shield-checkmark' : 'location'}
                size={12}
                color={Colors.accentBright}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.rolePillText}>{roleTitle}</Text>
            </View>
          </View>
          <View style={styles.zoneIndicator}>
            <Text style={styles.zoneIndicatorLabel}>Viewing</Text>
            <Text style={styles.zoneIndicatorValue} numberOfLines={1}>
              {isAllZones ? 'All Zones' : activeZone?.name ?? '—'}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Total Songs" value={stats?.totalSongs ?? 0} color={Colors.accent} iconName="musical-notes" loading={loadingStats} />
          <StatCard label="Pending Review" value={stats?.pendingSongs ?? 0} color={Colors.warning} iconName="document-text" loading={loadingStats} />
          <StatCard label="Members" value={stats?.totalMembers ?? 0} color={Colors.success} iconName="people" loading={loadingStats} />
          <StatCard label="Active Programs" value={stats?.activePrograms ?? 0} color={Colors.info} iconName="mic" loading={loadingStats} />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction
            label="Attendance"
            iconName="calendar-number-outline"
            onPress={() => navigation.navigate('Attendance')}
          />
          <QuickAction
            label="Churches"
            iconName="business-outline"
            onPress={() => navigation.navigate('Churches')}
          />
          <QuickAction
            label="Submissions"
            iconName="document-text-outline"
            badge={stats?.pendingSongs}
            onPress={() => navigation.navigate('Songs')}
          />
          <QuickAction
            label="Programs"
            iconName="musical-notes-outline"
            onPress={() => navigation.navigate('PraiseNight')}
          />
          <QuickAction
            label="Calendar"
            iconName="calendar-outline"
            onPress={() => navigation.navigate('Calendar')}
          />
          <QuickAction
            label="Members"
            iconName="people-outline"
            onPress={() => navigation.navigate('Members')}
          />
          <QuickAction
            label="Analytics"
            iconName="bar-chart-outline"
            onPress={() => navigation.navigate('Analytics')}
          />
          <QuickAction
            label="Media Lab"
            iconName="folder-open-outline"
            onPress={() => navigation.navigate('Media')}
          />
          <QuickAction
            label="Support Desk"
            iconName="chatbubbles-outline"
            onPress={() => navigation.navigate('SupportChat')}
          />
          <QuickAction
            label="Broadcast"
            iconName="notifications-outline"
            onPress={() => navigation.navigate('Notifications')}
          />
          <QuickAction
            label="Library"
            iconName="library-outline"
            onPress={() => navigation.navigate('MasterLibrary')}
          />
          <QuickAction
            label="Activity Logs"
            iconName="time-outline"
            onPress={() => navigation.navigate('ActivityLogs')}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  bannerLeft: { flex: 1 },
  greeting: { color: Colors.textMuted, fontSize: 13 },
  adminName: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 2, marginBottom: 8 },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentSubtle,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.accentDim,
  },
  rolePillText: { color: Colors.accentBright, fontSize: 12, fontWeight: '600' },
  zoneIndicator: {
    alignItems: 'flex-end',
    maxWidth: 120,
  },
  zoneIndicatorLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  zoneIndicatorValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 2, textAlign: 'right' },

  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: 20,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statIconContainer: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: 12 },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  quickAction: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: { color: Colors.textSecondary, fontSize: 11, textAlign: 'center', fontWeight: '600' },
  quickBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.warning,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  quickBadgeText: { color: '#000', fontSize: 10, fontWeight: '800' },
});
