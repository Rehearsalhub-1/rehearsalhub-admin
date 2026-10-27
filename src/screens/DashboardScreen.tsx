import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';
import ZoneHeader from '../components/ZoneHeader';
import { useDashboardData } from '../hooks/useDashboardData';

export default function DashboardScreen({ navigation }: any) {
  const { adminUser } = useAuth();
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();
  const { stats, recentPrograms, refreshing, refetch } = useDashboardData();

  const rawZoneName = activeZone?.name;
  const cleanZoneName =
    rawZoneName && rawZoneName.toLowerCase() !== 'central admin'
      ? rawZoneName
      : 'Assigned Zone';

  const liveScopeTitle = isChurchMode
    ? `${activeChurch?.name || 'Church Choir'}`
    : `${cleanZoneName}`;

  // Find live or latest upcoming program for spotlight card
  const liveProgram = recentPrograms.find(p => p.status === 'ongoing' || p.category === 'ongoing') || recentPrograms[0];
  const isLiveNow = Boolean(liveProgram && (liveProgram.status === 'ongoing' || liveProgram.category === 'ongoing'));

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Admin Dashboard" showBack={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.accent} colors={[Colors.accent]} />
        }
      >
        {/* ── 1. CALM GREETING & CONSOLE HEADER ───────────────────────── */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingName}>
            Welcome, {adminUser?.name ? adminUser.name.split(' ')[0] : 'Director'} 👋
          </Text>
          <View style={styles.scopeBadgeRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveScopeText} numberOfLines={1}>
              {liveScopeTitle} • Executive Portal
            </Text>
          </View>
        </View>

        {/* ── 2. REHEARSAL LIVE SPOTLIGHT (HERO COMMAND CARD) ─────────── */}
        {liveProgram ? (
          <TouchableOpacity
            style={[styles.spotlightCard, isLiveNow && styles.spotlightCardActive]}
            onPress={() => navigation.navigate('ProgramSongs', { program: liveProgram })}
            activeOpacity={0.88}
          >
            <View style={styles.spotlightHeader}>
              <View style={[styles.spotlightBadge, isLiveNow && styles.spotlightBadgeLive]}>
                <View style={[styles.spotlightDot, isLiveNow && styles.spotlightDotLive]} />
                <Text style={[styles.spotlightBadgeText, isLiveNow && styles.spotlightBadgeTextLive]}>
                  {isLiveNow ? 'IN PROGRESS' : 'NEXT REHEARSAL'}
                </Text>
              </View>
              <Text style={styles.spotlightDate}>{liveProgram.date || 'Scheduled'}</Text>
            </View>

            <Text style={styles.spotlightTitle} numberOfLines={1}>
              {liveProgram.name}
            </Text>

            <View style={styles.spotlightFooter}>
              <View style={styles.spotlightMeta}>
                <Ionicons name="location-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={styles.spotlightMetaText} numberOfLines={1}>
                  {liveProgram.location || 'Main Auditorium'}
                </Text>
              </View>

              <View style={[styles.spotlightActionBtn, isLiveNow && styles.spotlightActionBtnLive]}>
                <Text style={[styles.spotlightActionText, isLiveNow && styles.spotlightActionTextLive]}>
                  {isLiveNow ? 'Enter Setlist' : 'Open Setlist'}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={isLiveNow ? '#ffffff' : '#7c3aed'}
                  style={{ marginLeft: 5 }}
                />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.emptySpotlightCard}
            onPress={() => navigation.navigate('Programs')}
            activeOpacity={0.8}
          >
            <View style={styles.emptySpotlightIconWrap}>
              <Ionicons name="musical-notes-outline" size={24} color="#7c3aed" />
            </View>
            <Text style={styles.emptySpotlightTitle}>No Rehearsal in Progress</Text>
          </TouchableOpacity>
        )}

        {/* ── 3. ACTION QUEUE (Song Submissions Alert) ────────────────── */}
        {stats.pendingSongs > 0 && (
          <TouchableOpacity
            style={styles.actionQueueCard}
            onPress={() => navigation.navigate('SubmittedSongs')}
            activeOpacity={0.85}
          >
            <View style={styles.actionQueueLeft}>
              <View style={styles.actionQueueIconWrap}>
                <Ionicons name="notifications" size={16} color="#e11d48" />
              </View>
              <Text style={styles.actionQueueTitle}>
                {stats.pendingSongs} Song {stats.pendingSongs === 1 ? 'Submission' : 'Submissions'} Awaiting Review
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#e11d48" />
          </TouchableOpacity>
        )}

        {/* ── 4. QUICK ACTION STRIP (Focused Daily Tasks) ─────────────── */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.quickActionsStrip}>
          <TouchableOpacity
            style={styles.quickActionTile}
            onPress={() => navigation.navigate('Programs')}
            activeOpacity={0.75}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="add" size={20} color="#7c3aed" />
            </View>
            <Text style={styles.quickActionLabel}>New Setlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionTile}
            onPress={() => navigation.navigate('AttendanceTab')}
            activeOpacity={0.75}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="qr-code-outline" size={19} color="#059669" />
            </View>
            <Text style={styles.quickActionLabel}>Scan QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionTile}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.75}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#fffbeb' }]}>
              <Ionicons name="megaphone-outline" size={19} color="#d97706" />
            </View>
            <Text style={styles.quickActionLabel}>Broadcast</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionTile}
            onPress={() => navigation.navigate('MasterLibrary')}
            activeOpacity={0.75}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="library-outline" size={19} color="#2563eb" />
            </View>
            <Text style={styles.quickActionLabel}>Library</Text>
          </TouchableOpacity>
        </View>

        {/* ── 5. CLEAN METRICS OVERVIEW (2x2 Glance) ─────────────────── */}
        <Text style={styles.sectionLabel}>Ministry Overview</Text>
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('Members')}
            activeOpacity={0.75}
          >
            <View style={styles.metricTopRow}>
              <Text style={styles.metricValue}>{stats.totalMembers}</Text>
              <View style={[styles.metricIconWrap, { backgroundColor: '#eef2ff' }]}>
                <Ionicons name="people" size={16} color="#4f46e5" />
              </View>
            </View>
            <Text style={styles.metricLabel}>{isChurchMode ? 'Church Choir' : 'Zone Singers'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('Programs')}
            activeOpacity={0.75}
          >
            <View style={styles.metricTopRow}>
              <Text style={styles.metricValue}>{stats.activePrograms}</Text>
              <View style={[styles.metricIconWrap, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="calendar" size={16} color="#7c3aed" />
              </View>
            </View>
            <Text style={styles.metricLabel}>Rehearsal Sets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('MasterLibrary')}
            activeOpacity={0.75}
          >
            <View style={styles.metricTopRow}>
              <Text style={styles.metricValue}>{stats.totalSongs}</Text>
              <View style={[styles.metricIconWrap, { backgroundColor: '#fffbeb' }]}>
                <Ionicons name="musical-notes" size={16} color="#d97706" />
              </View>
            </View>
            <Text style={styles.metricLabel}>Ministered Songs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('SubmittedSongs')}
            activeOpacity={0.75}
          >
            <View style={styles.metricTopRow}>
              <Text style={[styles.metricValue, stats.pendingSongs > 0 && { color: '#e11d48' }]}>
                {stats.pendingSongs}
              </Text>
              <View style={[styles.metricIconWrap, { backgroundColor: stats.pendingSongs > 0 ? '#ffe4e6' : '#f1f5f9' }]}>
                <Ionicons
                  name="cloud-upload"
                  size={16}
                  color={stats.pendingSongs > 0 ? '#e11d48' : '#64748b'}
                />
              </View>
            </View>
            <Text style={styles.metricLabel}>Review Queue</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  greetingSection: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  scopeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  liveScopeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },

  /* Spotlight Hero Card */
  spotlightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  spotlightCardActive: {
    borderColor: '#ddd6fe',
    backgroundColor: '#faf5ff',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.08,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  spotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  spotlightBadgeLive: {
    backgroundColor: '#ede9fe',
  },
  spotlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748b',
    marginRight: 6,
  },
  spotlightDotLive: {
    backgroundColor: '#7c3aed',
  },
  spotlightBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
  },
  spotlightBadgeTextLive: {
    color: '#7c3aed',
  },
  spotlightDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  spotlightTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  spotlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotlightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  spotlightMetaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  spotlightActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  spotlightActionBtnLive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  spotlightActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  spotlightActionTextLive: {
    color: '#ffffff',
  },

  emptySpotlightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptySpotlightIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptySpotlightTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySpotlightSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },

  /* Action Queue */
  actionQueueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  actionQueueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  actionQueueIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ffe4e6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionQueueTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9f1239',
  },
  actionQueueSub: {
    fontSize: 11,
    color: '#be123c',
    marginTop: 1,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingLeft: 2,
  },

  /* Quick Actions Strip */
  quickActionsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },

  /* Metrics Grid */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  metricHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});
