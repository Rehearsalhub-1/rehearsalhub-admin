import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  zoneId: string;
}

interface AdminRequest {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  zoneId: string | null;
  zoneCode: string | null;
  status: string;
  reason: string | null;
  createdAt: string;
}

const TABS = ['all', 'coordinators', 'requests'] as const;

export default function MembersScreen() {
  const { adminUser } = useAuth();
  const { activeZone, isAllZones } = useZoneContext();
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isHQAdmin = !!adminUser?.isHQAdmin;
  const isZoneCoordinator = (adminUser?.role || '').toLowerCase().includes('zone');
  const canPromote = isHQAdmin || isZoneCoordinator;

  const loadData = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const [membersRes, requestsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: any[] }>(`/profiles/directory${zoneParam}`),
        isHQAdmin
          ? apiClient.get<{ success: boolean; data: AdminRequest[] }>('/members/admin-requests').catch(() => ({ success: true, data: [] }))
          : Promise.resolve({ success: true, data: [] }),
      ]);

      const memberList: Member[] = (Array.isArray(membersRes.data) ? membersRes.data : []).map((p) => ({
        id: p.id,
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        email: p.email || '',
        role: p.role || 'member',
        zoneId: p.zoneCode || '',
      }));

      setMembers(memberList);
      setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
    } catch (e) {
      console.error('[Members] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isHQAdmin]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  async function handleChangeRole(userId: string, newRole: string) {
    try {
      setActionLoading(true);
      await apiClient.patch(`/members/${userId}`, { role: newRole });
      Alert.alert('Role Updated', `Member role updated to ${formatRoleName(newRole)}`);
      setSelectedMember(null);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveRequest(requestId: string) {
    try {
      setActionLoading(true);
      await apiClient.post(`/members/admin-requests/${requestId}/approve`, {});
      Alert.alert('Approved', 'Coordinator access granted.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectRequest(requestId: string) {
    try {
      setActionLoading(true);
      await apiClient.post(`/members/admin-requests/${requestId}/reject`, {});
      Alert.alert('Rejected', 'Request declined.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  }

  function formatRoleName(role: string) {
    if (!role) return 'Singer';
    const r = role.toLowerCase();
    if (r === 'hq_admin' || r === 'super_admin') return 'HQ Admin';
    if (r === 'zone_admin' || r === 'zone_coordinator') return 'Zonal Coordinator';
    if (r === 'church_coordinator' || r === 'subgroup_coordinator' || r === 'subgroup_admin') return 'Church Coordinator';
    return 'Singer';
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.zoneId?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeTab === 'coordinators') {
      const r = (m.role || '').toLowerCase();
      return r.includes('admin') || r.includes('coordinator');
    }
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Members" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Members" />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          if (tab === 'requests' && !isHQAdmin) return null;
          const label =
            tab === 'all' ? `All (${members.length})`
            : tab === 'coordinators' ? 'Coordinators'
            : `Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}`;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{label}</Text>
              {tab === 'requests' && pendingCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar */}
      {activeTab !== 'requests' && (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email, or zone..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === 'requests' ? (
        <FlatList
          data={requests}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.accent} />}
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <View style={styles.requestTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{item.userName || item.userEmail || 'Unknown'}</Text>
                  <Text style={styles.memberEmail}>{item.userEmail || '—'}</Text>
                  {item.reason ? <Text style={styles.requestReason}>"{item.reason}"</Text> : null}
                  <Text style={styles.memberMeta}>Zone: {item.zoneCode || item.zoneId || '—'}</Text>
                </View>
                <View style={[styles.statusPill, {
                  backgroundColor: item.status === 'approved' ? Colors.success + '22'
                    : item.status === 'pending' ? Colors.warning + '22'
                    : Colors.textMuted + '22',
                  borderColor: item.status === 'approved' ? Colors.success
                    : item.status === 'pending' ? Colors.warning
                    : Colors.textMuted,
                }]}>
                  <Text style={[styles.statusPillText, {
                    color: item.status === 'approved' ? Colors.success
                      : item.status === 'pending' ? Colors.warning
                      : Colors.textMuted,
                  }]}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
              {item.status === 'pending' && (
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.success + '22', borderColor: Colors.success }]}
                    onPress={() => handleApproveRequest(item.id)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: Colors.success }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: Colors.border }]}
                    onPress={() => handleRejectRequest(item.id)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={Colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: Colors.textMuted }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No requests found</Text></View>}
        />
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.accent} />}
          renderItem={({ item }) => {
            const role = (item.role || '').toLowerCase();
            const isHQ = role === 'hq_admin' || role === 'super_admin';
            const isZone = role === 'zone_admin' || role === 'zone_coordinator';
            const isChurch = role === 'church_coordinator' || role === 'subgroup_coordinator' || role === 'subgroup_admin';
            return (
              <TouchableOpacity
                style={styles.memberCard}
                activeOpacity={canPromote ? 0.75 : 1}
                onPress={() => canPromote && setSelectedMember(item)}
              >
                <View style={[styles.avatar, { backgroundColor: isHQ ? Colors.accent + '30' : isZone ? Colors.info + '30' : Colors.surface }]}>
                  <Text style={[styles.avatarText, { color: isHQ ? Colors.accent : isZone ? Colors.info : Colors.textSecondary }]}>
                    {(item.firstName?.[0] || item.email?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
                  <Text style={styles.memberEmail}>{item.email || '—'}</Text>
                  {isAllZones && item.zoneId ? (
                    <Text style={styles.memberMeta}>Zone: {item.zoneId}</Text>
                  ) : null}
                </View>
                <View style={[
                  styles.rolePill,
                  isHQ ? styles.rolePillHQ : isZone ? styles.rolePillZone : isChurch ? styles.rolePillChurch : styles.rolePillMember,
                ]}>
                  <Text style={[
                    styles.rolePillText,
                    isHQ ? { color: Colors.accent } : isZone ? { color: Colors.info } : isChurch ? { color: '#38bdf8' } : { color: Colors.textMuted },
                  ]}>
                    {formatRoleName(item.role)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No members found</Text></View>}
        />
      )}

      {/* Role Management Modal */}
      <Modal visible={!!selectedMember} transparent animationType="fade" onRequestClose={() => setSelectedMember(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Manage Member Role</Text>
                <Text style={styles.modalSub}>
                  {selectedMember?.firstName} {selectedMember?.lastName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalEmail}>{selectedMember?.email}</Text>
            <Text style={styles.modalCurrent}>
              Current Role: <Text style={{ color: Colors.accentBright, fontWeight: '700' }}>{formatRoleName(selectedMember?.role || '')}</Text>
            </Text>

            <View style={styles.modalActions}>
              {/* HQ Admin options */}
              {isHQAdmin && (
                <>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: Colors.accent }]}
                    onPress={() => selectedMember && handleChangeRole(selectedMember.id, 'hq_admin')}
                    disabled={actionLoading}
                  >
                    <Ionicons name="shield-checkmark-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.modalBtnText}>Promote to HQ Admin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: Colors.info }]}
                    onPress={() => selectedMember && handleChangeRole(selectedMember.id, 'zone_coordinator')}
                    disabled={actionLoading}
                  >
                    <Ionicons name="location-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.modalBtnText}>Promote to Zonal Coordinator</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Church Coordinator promotion (HQ Admin & Zonal Coordinator) */}
              {(isHQAdmin || isZoneCoordinator) && (
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#0284c7' }]}
                  onPress={() => selectedMember && handleChangeRole(selectedMember.id, 'church_coordinator')}
                  disabled={actionLoading}
                >
                  <Ionicons name="business-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalBtnText}>Assign as Church Coordinator</Text>
                </TouchableOpacity>
              )}

              {/* Reset to regular singer */}
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }]}
                onPress={() => selectedMember && handleChangeRole(selectedMember.id, 'singer')}
                disabled={actionLoading}
              >
                <Ionicons name="person-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.modalBtnText, { color: Colors.textMuted }]}>Reset to Regular Singer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.surface, gap: 5 },
  activeTab: { backgroundColor: Colors.accent },
  tabText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  activeTabText: { color: '#fff', fontWeight: '700' },
  tabBadge: { backgroundColor: Colors.warning, borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  search: { flex: 1, color: Colors.textPrimary, fontSize: 13 },

  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },

  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', fontSize: 16 },
  memberInfo: { flex: 1 },
  memberName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  memberEmail: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  memberMeta: { color: Colors.info, fontSize: 11, marginTop: 2, fontWeight: '600' },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rolePillHQ: { backgroundColor: Colors.accent + '20', borderWidth: 1, borderColor: Colors.accentDim },
  rolePillZone: { backgroundColor: Colors.info + '20', borderWidth: 1, borderColor: Colors.info + '60' },
  rolePillChurch: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.4)' },
  rolePillMember: { backgroundColor: Colors.surface },
  rolePillText: { fontSize: 11, fontWeight: '700' },

  requestCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  requestTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  requestReason: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  statusPill: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  requestActions: { flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#161324', borderRadius: 20, padding: 22, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.25)' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  modalSub: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  modalEmail: { color: Colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 8 },
  modalCurrent: { color: Colors.textSecondary, fontSize: 12, marginBottom: 18 },
  modalActions: { gap: 10 },
  modalBtn: { paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
