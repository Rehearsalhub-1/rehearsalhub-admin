import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';
import ZoneHeader from '../components/ZoneHeader';
import DashboardHeroCarousel from '../components/DashboardHeroCarousel';
import { api } from '../services/api';
import { StatTile, Badge } from '../components/ui';

interface DashboardStats {
  totalSongs: number;
  pendingSongs: number;
  totalMembers: number;
  activePrograms: number;
}

export default function DashboardScreen({ navigation }: any) {
  const { adminUser } = useAuth();
  const { activeZone, isAllZones, isChurchMode, activeChurch } = useZoneContext();

  const [stats, setStats] = useState<DashboardStats>({
    totalSongs: 0,
    pendingSongs: 0,
    totalMembers: 0,
    activePrograms: 0,
  });

  const [recentPrograms, setRecentPrograms] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const progOptions = isChurchMode && activeChurch?.id
        ? { groupId: activeChurch.id, subGroupId: activeChurch.id, includeChurch: true }
        : { zoneId: activeZone?.id || 'zone-001' };

      const [statsRes, progRes, memRes] = await Promise.all([
        api.dashboard.getStats(activeZone?.id || 'zone-001', isChurchMode ? activeChurch?.id : undefined).catch(() => ({
          totalSongs: 0,
          pendingSongs: 0,
          totalMembers: 0,
          activePrograms: 0,
        })),
        api.programs.getAll(progOptions).catch(() => ({ data: [] })),
        isChurchMode && activeChurch?.id
          ? api.churches.getMembers(activeChurch.id).catch(() => ({ data: [] }))
          : api.members.getDirectory(activeZone?.id || 'zone-001').catch(() => ({ data: [] })),
      ]);

      setStats({
        totalSongs: statsRes.totalSongs || 0,
        pendingSongs: statsRes.pendingSongs || 0,
        totalMembers: statsRes.totalMembers || (Array.isArray(memRes?.data) ? memRes.data.length : 0),
        activePrograms: statsRes.activePrograms || (Array.isArray(progRes?.data) ? progRes.data.length : 0),
      });

      const progList = Array.isArray(progRes?.data) ? progRes.data : [];
      setRecentPrograms(progList.slice(0, 5));

      const memList = Array.isArray(memRes?.data) ? memRes.data : [];
      setMembers(memList);
    } catch (e) {
      console.error('[Dashboard] Error loading data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  useEffect(() => {
    setLoading(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const inviteCode = activeZone?.invitationCode || '';
  const inviteLink = inviteCode ? `https://singers.loveworld.org/pages/join-zone?code=${inviteCode}` : '';

  const handleShareInvite = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        title: 'Join Choir Rehearsal Hub',
        message: `Join our choir on Loveworld Singers Rehearsal Hub: ${inviteLink}`,
      });
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter members by search input
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 6);
    const q = memberSearch.toLowerCase();
    return members.filter((m: any) => {
      const name = `${m.first_name || m.firstName || ''} ${m.last_name || m.lastName || ''}`.toLowerCase();
      const email = String(m.email || '').toLowerCase();
      const des = String(m.designation || m.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || des.includes(q);
    }).slice(0, 6);
  }, [members, memberSearch]);

  const liveMetricsLabel = isChurchMode
    ? `${activeChurch?.name || 'Church Choir'} Live Overview`
    : isAllZones
    ? 'Aggregated Global HQ Metrics'
    : `${activeZone?.name || 'Zonal Hub'} Live Metrics`;

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Admin Console" showBack={false} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* 1. Sleek Action Toolbar matching Web Admin */}
        <View style={styles.toolbar}>
          <View style={styles.liveIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveMetricsText} numberOfLines={1}>
              {liveMetricsLabel}
            </Text>
          </View>

          <View style={styles.toolbarActions}>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={loadDashboardData}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons
                name="refresh"
                size={14}
                color="#64748b"
                style={loading ? styles.spinning : undefined}
              />
              <Text style={styles.toolBtnText}>Sync</Text>
            </TouchableOpacity>

            {inviteLink ? (
              <TouchableOpacity
                style={[styles.toolBtn, styles.inviteBtn]}
                onPress={handleShareInvite}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={copiedLink ? 'checkmark' : 'share-social-outline'}
                  size={14}
                  color="#7c3aed"
                />
                <Text style={styles.inviteBtnText}>{copiedLink ? 'Sent' : 'Join Link'}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => navigation.navigate('PraiseNight')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.primaryActionBtnText}>Program</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Compact Visual Hero Carousel */}
        <DashboardHeroCarousel />

        {/* 3. Admin 4 KPI Cards Grid (Matching Web Admin Portal) */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <StatTile
              label={isChurchMode ? 'Choir Members' : 'Zone Members'}
              value={stats.totalMembers}
              icon="people"
              color="#4f46e5"
              badgeLabel={isChurchMode ? 'ROSTER' : 'DIRECTORY'}
              subtitle={isChurchMode ? 'Church choir singers' : 'Registered singers'}
              loading={loading}
              onPress={() => navigation.navigate('Members')}
            />
            <StatTile
              label={isChurchMode ? 'Church Programs' : 'Programs'}
              value={stats.activePrograms}
              icon="calendar"
              color="#7c3aed"
              badgeLabel="PROGRAMS"
              subtitle={isChurchMode ? 'Rehearsals & services' : 'Active & archived'}
              loading={loading}
              onPress={() => navigation.navigate('PraiseNight')}
            />
          </View>

          <View style={styles.kpiRow}>
            <StatTile
              label="Ministered Songs"
              value={stats.totalSongs}
              icon="musical-notes"
              color="#d97706"
              badgeLabel="SONGS"
              subtitle="Catalog repertoire"
              loading={loading}
              onPress={() => navigation.navigate('MasterLibrary')}
            />
            {isChurchMode ? (
              <StatTile
                label="Attendance"
                value={stats.totalMembers > 0 ? stats.totalMembers : 'Active'}
                icon="calendar-number"
                color="#059669"
                badgeLabel="CHECK-IN"
                subtitle="Rehearsal turnout"
                loading={loading}
                onPress={() => navigation.navigate('Attendance')}
              />
            ) : (
              <StatTile
                label="Submissions"
                value={stats.pendingSongs}
                icon="sparkles"
                color="#e11d48"
                badgeLabel={stats.pendingSongs > 0 ? 'ACTION' : 'UP TO DATE'}
                subtitle="Awaiting review"
                loading={loading}
                onPress={() => navigation.navigate('Songs')}
              />
            )}
          </View>
        </View>

        {/* 3. Quick Admin Actions Launchpad (Matching Web Admin Launchpad) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flash-outline" size={16} color="#7c3aed" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Quick Admin Actions</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('More')}
              style={styles.viewAllBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>All Modules</Text>
              <Ionicons name="chevron-forward" size={12} color="#7c3aed" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.launchpadGrid}>
            <TouchableOpacity
              style={styles.launchpadItem}
              onPress={() => navigation.navigate('PraiseNight')}
              activeOpacity={0.75}
            >
              <View style={[styles.launchpadIconBox, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
              </View>
              <Text style={styles.launchpadLabel} numberOfLines={1}>Programs</Text>
              <Text style={styles.launchpadSub} numberOfLines={1}>Manage sets</Text>
            </TouchableOpacity>

            {!isChurchMode ? (
              <TouchableOpacity
                style={styles.launchpadItem}
                onPress={() => navigation.navigate('Songs')}
                activeOpacity={0.75}
              >
                <View style={[styles.launchpadIconBox, { backgroundColor: '#fff1f2' }]}>
                  <Ionicons name="cloud-upload-outline" size={20} color="#e11d48" />
                </View>
                <Text style={styles.launchpadLabel} numberOfLines={1}>Submissions</Text>
                <Text style={styles.launchpadSub} numberOfLines={1}>{stats.pendingSongs} pending</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.launchpadItem}
                onPress={() => navigation.navigate('Schedule')}
                activeOpacity={0.75}
              >
                <View style={[styles.launchpadIconBox, { backgroundColor: '#f5f3ff' }]}>
                  <Ionicons name="list-outline" size={20} color="#7c3aed" />
                </View>
                <Text style={styles.launchpadLabel} numberOfLines={1}>Schedule</Text>
                <Text style={styles.launchpadSub} numberOfLines={1}>Weekly plans</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.launchpadItem}
              onPress={() => navigation.navigate('MasterLibrary')}
              activeOpacity={0.75}
            >
              <View style={[styles.launchpadIconBox, { backgroundColor: '#fffbeb' }]}>
                <Ionicons name="musical-notes-outline" size={20} color="#d97706" />
              </View>
              <Text style={styles.launchpadLabel} numberOfLines={1}>Ministered</Text>
              <Text style={styles.launchpadSub} numberOfLines={1}>Catalog</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.launchpadItem}
              onPress={() => navigation.navigate('Members')}
              activeOpacity={0.75}
            >
              <View style={[styles.launchpadIconBox, { backgroundColor: '#eef2ff' }]}>
                <Ionicons name="people-outline" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.launchpadLabel} numberOfLines={1}>{isChurchMode ? 'Choir' : 'Singers'}</Text>
              <Text style={styles.launchpadSub} numberOfLines={1}>View roster</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.launchpadItem}
              onPress={() => navigation.navigate('Attendance')}
              activeOpacity={0.75}
            >
              <View style={[styles.launchpadIconBox, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="calendar-number-outline" size={20} color="#059669" />
              </View>
              <Text style={styles.launchpadLabel} numberOfLines={1}>Attendance</Text>
              <Text style={styles.launchpadSub} numberOfLines={1}>QR Check-in</Text>
            </TouchableOpacity>

            {!isChurchMode ? (
              <TouchableOpacity
                style={styles.launchpadItem}
                onPress={() => navigation.navigate('Churches')}
                activeOpacity={0.75}
              >
                <View style={[styles.launchpadIconBox, { backgroundColor: '#f0f9ff' }]}>
                  <Ionicons name="business-outline" size={20} color="#0284c7" />
                </View>
                <Text style={styles.launchpadLabel} numberOfLines={1}>Churches</Text>
                <Text style={styles.launchpadSub} numberOfLines={1}>Chapters</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.launchpadItem}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.75}
              >
                <View style={[styles.launchpadIconBox, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="notifications-outline" size={20} color="#d97706" />
                </View>
                <Text style={styles.launchpadLabel} numberOfLines={1}>Broadcast</Text>
                <Text style={styles.launchpadSub} numberOfLines={1}>Push alerts</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.launchpadItem}
              onPress={() => navigation.navigate('Calendar')}
              activeOpacity={0.75}
            >
              <View style={[styles.launchpadIconBox, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="calendar-outline" size={20} color="#2563eb" />
              </View>
              <Text style={styles.launchpadLabel} numberOfLines={1}>Calendar</Text>
              <Text style={styles.launchpadSub} numberOfLines={1}>Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.launchpadItem}
              onPress={() => navigation.navigate('MediaLibrary')}
              activeOpacity={0.75}
            >
              <View style={[styles.launchpadIconBox, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="folder-open-outline" size={20} color="#4338ca" />
              </View>
              <Text style={styles.launchpadLabel} numberOfLines={1}>Media</Text>
              <Text style={styles.launchpadSub} numberOfLines={1}>R2 Assets</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Recent Programs Section (Matching Web Admin Layout) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Programs</Text>
              <Text style={styles.sectionSubtitle}>Most recent rehearsal setlists</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('PraiseNight')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={12} color="#7c3aed" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {recentPrograms.length > 0 ? (
            <View style={styles.listContainer}>
              {recentPrograms.map((prog, idx) => {
                const isActive = Boolean(prog.is_active || prog.isActive || prog.status === 'ongoing');
                const initial = (prog.name || 'P').charAt(0).toUpperCase();
                const dateStr = prog.date || 'Scheduled';

                return (
                  <TouchableOpacity
                    key={prog.id || idx}
                    style={styles.programRow}
                    onPress={() => navigation.navigate('ProgramSongs', { program: prog })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.programInitialBox}>
                      <Text style={styles.programInitialText}>{initial}</Text>
                    </View>

                    <View style={styles.programDetails}>
                      <Text style={styles.programName} numberOfLines={1}>
                        {prog.name || 'Rehearsal Program'}
                      </Text>
                      <View style={styles.programMetaRow}>
                        <Ionicons name="time-outline" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                        <Text style={styles.programMetaText}>{dateStr}</Text>
                        {prog.category ? (
                          <Text style={styles.programCategoryText}>• {prog.category}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.programStatusBadge}>
                      <Badge
                        label={isActive ? 'Active' : 'Archived'}
                        variant={isActive ? 'ongoing' : 'draft'}
                        size="sm"
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No programs found</Text>
              <Text style={styles.emptySubtitle}>
                Create a rehearsal program to sync with mobile apps
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate('PraiseNight')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionBtnText}>Create Program</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 5. Members Quick Directory Preview (Matching Web Admin Layout) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Members</Text>
              <Text style={styles.sectionSubtitle}>{members.length} total registered</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('Members')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>All</Text>
              <Ionicons name="arrow-forward" size={12} color="#7c3aed" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Quick Search */}
          <View style={styles.memberSearchBox}>
            <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.memberSearchInput}
              placeholder="Search singers..."
              placeholderTextColor="#94a3b8"
              value={memberSearch}
              onChangeText={setMemberSearch}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.listContainer}>
            {filteredMembers.map((m, idx) => {
              const name = `${m.first_name || m.firstName || ''} ${m.last_name || m.lastName || ''}`.trim() || m.display_name || 'Member';
              const roleDisplay = m.designation || m.role || 'Singer';
              const isHqRole = m.administration === 'hq_admin' || m.role === 'hq_admin';
              const initial = name.charAt(0).toUpperCase();

              return (
                <View key={m.id || idx} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{initial}</Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.memberRole} numberOfLines={1}>{roleDisplay}</Text>
                  </View>

                  <Badge
                    label={isHqRole ? 'HQ Admin' : 'Active'}
                    variant={isHqRole ? 'alto' : 'ongoing'}
                    size="sm"
                  />
                </View>
              );
            })}

            {filteredMembers.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={28} color="#cbd5e1" />
                <Text style={styles.emptySubtitle}>No singers match your search</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981', // emerald-500
    marginRight: 6,
  },
  liveMetricsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569', // slate-600
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  inviteBtn: {
    borderColor: '#ddd6fe',
    backgroundColor: '#faf5ff',
  },
  inviteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    gap: 3,
  },
  primaryActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  kpiGrid: {
    gap: 12,
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  launchpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  launchpadItem: {
    alignItems: 'center',
    width: '23%',
  },
  launchpadIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  launchpadLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  launchpadSub: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 1,
  },
  listContainer: {
    gap: 10,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  programInitialBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  programInitialText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  programDetails: {
    flex: 1,
    minWidth: 0,
  },
  programName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  programMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programMetaText: {
    fontSize: 11,
    color: '#64748b',
  },
  programCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed',
    marginLeft: 4,
  },
  programStatusBadge: {
    marginLeft: 8,
  },
  memberSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 12,
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    height: '100%',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  memberRole: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
  emptyActionBtn: {
    marginTop: 12,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  spinning: {
    transform: [{ rotate: '45deg' }],
  },
});

