import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useAuth } from '../context/AuthContext';
import MemberManagementModal, { Member } from '../components/MemberManagementModal';

export default function AnalyticsScreen({ navigation }: any) {
  const { adminUser } = useAuth();
  const isHQ = adminUser?.isHQAdmin === true;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState({
    totalSingers: 0,
    totalZones: 0,
    totalChurches: 0,
    globalAttendanceRate: 0,
  });
  const [zonesList, setZonesList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Member Management Drawer State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectMember = (raw: any) => {
    const names = (raw.userName || raw.name || '').trim().split(' ');
    const firstName = raw.firstName || names[0] || 'Singer';
    const lastName = raw.lastName || names.slice(1).join(' ') || '';

    const memberData: Member = {
      id: raw.id || raw.userId,
      membershipId: raw.membershipId || raw.id,
      first_name: firstName,
      last_name: lastName,
      email: raw.userEmail || raw.email || '',
      username: raw.username || raw.userName || '',
      alias: raw.alias || '',
      phone: raw.phone || '',
      church: raw.churchName || raw.church || '',
      zoneId: raw.zoneId || raw.organizationId || '',
      zoneName: raw.zoneName || raw.organization?.name || '',
      role: raw.role || 'member',
      isAdmin: raw.isAdmin || raw.role === 'zone_admin' || raw.role === 'church_admin',
      is_active: raw.is_active !== false,
      can_access_ongoing: true,
      can_access_pre_rehearsal: true,
      canAnnotate: true,
      canSeeArchive: true,
    };
    setSelectedMember(memberData);
    setModalVisible(true);
  };

  const handleSaveMember = async (updated: Member) => {
    try {
      if (updated.role) {
        await api.members.updateRole(updated.id, updated.role);
      }
      await api.members.updateProfile(updated.id, {
        role: updated.role,
        is_active: updated.is_active,
        church: updated.church,
        canSeeArchive: updated.canSeeArchive,
        can_access_archive: updated.can_access_archive,
        can_access_ongoing: updated.can_access_ongoing,
        can_access_pre_rehearsal: updated.can_access_pre_rehearsal,
        canAnnotate: updated.canAnnotate,
        hiddenFeatures: updated.hiddenFeatures,
      });
      // Update local search results
      setSearchResults(prev =>
        prev.map(m => ((m.id || m.userId) === updated.id ? { ...m, role: updated.role, churchName: updated.church } : m))
      );
      Alert.alert('Updated', `${updated.first_name}'s role and access passes were updated successfully.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (id: string) => {
    try {
      await api.members.removeFromZone(id);
      setSearchResults(prev => prev.filter(m => (m.id || m.userId) !== id));
      Alert.alert('Removed', 'Member was removed from their zone successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to remove member from zone.');
    }
  };

  const fetchGlobalData = useCallback(async () => {
    try {
      const [overviewRes, zonesRes] = await Promise.all([
        api.analytics.getOverview().catch(() => null),
        api.zones.getAll().catch(() => ({ data: [] })),
      ]);

      if (overviewRes?.data) {
        setOverview(overviewRes.data);
      }

      const rawZones = Array.isArray(zonesRes?.data) ? zonesRes.data : [];
      setZonesList(rawZones);
    } catch (e) {
      console.error('[GlobalOverview] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isHQ) {
      setLoading(true);
      fetchGlobalData();
    }
  }, [isHQ, fetchGlobalData]);

  // Global Member Search handler
  useEffect(() => {
    if (!isHQ) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.members.getGlobalMembers(searchQuery.trim());
        if (res?.data && Array.isArray(res.data)) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn('[GlobalOverview] Member search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isHQ]);

  // Restricted Access Guard for non-HQ admins
  if (!isHQ) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Executive Overview" />
        <View style={styles.centerNotice}>
          <View style={styles.noticeIconWrap}>
            <Ionicons name="shield-outline" size={44} color="#6366f1" />
          </View>
          <Text style={styles.noticeTitle}>HQ Leadership Only</Text>
          <Text style={styles.noticeSub}>
            The HQ Executive Overview provides ministry-wide aggregated metrics across all zones and churches. This console is strictly reserved for Loveworld Singers Headquarters leadership.
          </Text>
          <TouchableOpacity
            style={styles.noticeBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.noticeBackBtnText}>Back to Console</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="HQ Executive Overview" />
        <View style={styles.center}>
          <ActivityIndicator color="#4f46e5" size="large" />
          <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>Loading Ministry Metrics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="HQ Executive Overview" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchGlobalData();
            }}
            tintColor="#4f46e5"
          />
        }
      >
        {/* Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIcon}>
            <Ionicons name="earth" size={24} color="#4f46e5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Loveworld Singers HQ Overview</Text>
            <Text style={styles.bannerSub}>
              Aggregated personnel, zone distribution, and attendance metrics.
            </Text>
          </View>
        </View>

        {/* ── Worldwide KPI Cards (4 Cards) ───────────────────────────────── */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#eef2ff' }]}>
              <Ionicons name="people" size={20} color="#4f46e5" />
            </View>
            <Text style={styles.kpiValue}>{overview.totalSingers}</Text>
            <Text style={styles.kpiLabel}>Total Singers</Text>
            <Text style={styles.kpiMeta}>All zones combined</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#faf5ff' }]}>
              <Ionicons name="globe-outline" size={20} color="#7c3aed" />
            </View>
            <Text style={styles.kpiValue}>{overview.totalZones || zonesList.length}</Text>
            <Text style={styles.kpiLabel}>All Zones</Text>
            <Text style={styles.kpiMeta}>Active ministry regions</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="business-outline" size={20} color="#ea580c" />
            </View>
            <Text style={styles.kpiValue}>{overview.totalChurches}</Text>
            <Text style={styles.kpiLabel}>Church Choirs</Text>
            <Text style={styles.kpiMeta}>Local assemblies</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#059669" />
            </View>
            <Text style={styles.kpiValue}>{overview.globalAttendanceRate}%</Text>
            <Text style={styles.kpiLabel}>Overall Attendance</Text>
            <Text style={styles.kpiMeta}>Ministry-wide average</Text>
          </View>
        </View>

        {/* ── Member Search ────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="search" size={18} color="#4f46e5" />
            <Text style={styles.cardTitle}>All-Singers Lookup</Text>
          </View>
          <Text style={styles.cardDesc}>
            Search any singer across all zones and local church choirs.
          </Text>

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, or KingsChat..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searching && <ActivityIndicator size="small" color="#4f46e5" />}
          </View>

          {/* Search Results List */}
          {searchQuery.trim().length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.length === 0 && !searching ? (
                <Text style={styles.noResultsText}>No singers found matching "{searchQuery}"</Text>
              ) : (
                searchResults.map((member: any) => {
                  const initial = (member.userName || member.userEmail || 'S').charAt(0).toUpperCase();
                  return (
                    <TouchableOpacity
                      key={member.id || member.userId}
                      style={styles.memberResultRow}
                      onPress={() => handleSelectMember(member)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{initial}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.memberName}>{member.userName}</Text>
                          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                        </View>
                        <Text style={styles.memberEmail}>{member.userEmail || 'No email'}</Text>
                        <View style={styles.badgeRow}>
                          <View style={styles.zoneBadge}>
                            <Ionicons name="earth" size={10} color="#4f46e5" />
                            <Text style={styles.zoneBadgeText} numberOfLines={1}>
                              {member.zoneName || member.organization?.name || 'HQ Zone'}
                            </Text>
                          </View>
                          {member.churchName && (
                            <View style={styles.churchBadge}>
                              <Ionicons name="business" size={10} color="#d97706" />
                              <Text style={styles.churchBadgeText} numberOfLines={1}>
                                {member.churchName}
                              </Text>
                            </View>
                          )}
                          <View style={[styles.churchBadge, { backgroundColor: '#f3e8ff' }]}>
                            <Ionicons name="shield-checkmark" size={10} color="#7c3aed" />
                            <Text style={[styles.churchBadgeText, { color: '#7c3aed' }]}>
                              {member.role === 'church_admin' ? 'Church Admin' : member.role === 'zone_admin' ? 'Zone Admin' : 'Singer'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* ── Zone Breakdown Cards ────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="map-outline" size={18} color="#7c3aed" />
            <Text style={styles.cardTitle}>Regional Zones Breakdown ({zonesList.length})</Text>
          </View>
          <Text style={styles.cardDesc}>
            Summary of active zones, membership rosters, and local assemblies.
          </Text>

          <View style={styles.zoneGrid}>
            {zonesList.map((z: any) => {
              const memberCount = z._count?.memberships ?? 0;
              const churchCount = z._count?.groups ?? (z.groups?.length ?? 0);
              const isHqZone = z.isHq || z.id === 'zone-001' || z.region === 'Headquarters';

              return (
                <View key={z.id} style={[styles.zoneItem, isHqZone && styles.zoneItemHq]}>
                  <View style={styles.zoneTopRow}>
                    <View style={styles.zoneNameArea}>
                      <Text style={styles.zoneItemName} numberOfLines={1}>
                        {z.name}
                      </Text>
                      <Text style={styles.zoneRegion}>
                        {isHqZone ? '🏛️ Headquarters LCA' : (z.region ? `📍 ${z.region}` : 'Regional Zone')}
                      </Text>
                    </View>
                    {isHqZone && (
                      <View style={styles.hqPill}>
                        <Text style={styles.hqPillText}>HQ Core</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.zoneStatsRow}>
                    <View style={styles.zoneStat}>
                      <Ionicons name="people-outline" size={14} color="#4f46e5" />
                      <Text style={styles.zoneStatNumber}>{memberCount}</Text>
                      <Text style={styles.zoneStatLabel}>Singers</Text>
                    </View>
                    <View style={styles.zoneStatDivider} />
                    <View style={styles.zoneStat}>
                      <Ionicons name="business-outline" size={14} color="#ea580c" />
                      <Text style={styles.zoneStatNumber}>{churchCount}</Text>
                      <Text style={styles.zoneStatLabel}>Churches</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Global Member Management Modal */}
      <MemberManagementModal
        visible={modalVisible}
        member={selectedMember}
        onClose={() => {
          setModalVisible(false);
          setSelectedMember(null);
        }}
        onSave={handleSaveMember}
        onRemove={handleRemoveMember}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 14, paddingBottom: 40 },

  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  bannerSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  kpiMeta: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },

  resultsContainer: {
    marginTop: 12,
    gap: 8,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    paddingVertical: 12,
  },
  memberResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#4338ca',
    fontSize: 14,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  memberEmail: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  zoneBadgeText: {
    fontSize: 10,
    color: '#4338ca',
    fontWeight: '600',
  },
  churchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  churchBadgeText: {
    fontSize: 10,
    color: '#b45309',
    fontWeight: '600',
  },

  zoneGrid: {
    gap: 10,
  },
  zoneItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  zoneItemHq: {
    borderColor: '#c7d2fe',
    backgroundColor: '#faf5ff',
  },
  zoneTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  zoneNameArea: {
    flex: 1,
    marginRight: 8,
  },
  zoneItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  zoneRegion: {
    fontSize: 11,
    color: '#64748b',
  },
  hqPill: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hqPillText: {
    color: '#6d28d9',
    fontSize: 10,
    fontWeight: '800',
  },
  zoneStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 8,
  },
  zoneStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  zoneStatNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  zoneStatLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  zoneStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e2e8f0',
  },

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
    backgroundColor: '#eef2ff',
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
    backgroundColor: '#4f46e5',
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
