import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  zoneId: string;
  avatarUrl?: string;
  voicePart?: string;
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

export default function MembersScreen() {
  const { adminUser } = useAuth();
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isHQAdmin = !!adminUser?.isHQAdmin;
  const isZoneCoordinator = (adminUser?.role || '').toLowerCase().includes('zone');
  const canPromote = !isChurchMode && (isHQAdmin || isZoneCoordinator);

  const loadData = useCallback(async () => {
    try {
      const effectiveZoneId = activeZone?.id || 'zone-001';
      const [membersRes, requestsRes] = await Promise.all([
        isChurchMode && activeChurch?.id
          ? api.churches.getMembers(activeChurch.id)
          : api.members.getDirectory(effectiveZoneId),
        isHQAdmin && !isChurchMode
          ? api.members.getAdminRequests(effectiveZoneId).catch(() => ({ success: true, data: [] }))
          : Promise.resolve({ success: true, data: [] }),
      ]);

      const memberList: Member[] = (Array.isArray(membersRes.data) ? membersRes.data : []).map((p: any) => ({
        id: p.userId || p.id,
        firstName: p.firstName || (p.name ? p.name.split(' ')[0] : '') || '',
        lastName: p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : '') || '',
        email: p.email || '',
        role: p.role || 'member',
        zoneId: p.zoneCode || p.zoneName || activeChurch?.name || '',
        avatarUrl: p.avatarUrl,
        voicePart: p.voicePart || p.designation || 'Singer',
      }));

      setMembers(memberList);
      setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
    } catch (e) {
      console.error('[Members] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isHQAdmin, isChurchMode, activeChurch?.id, activeChurch?.name]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  async function handleChangeRole(userId: string, newRole: string) {
    try {
      setActionLoading(true);
      await api.members.updateRole(userId, newRole);
      Alert.alert('Role Updated', `Member role updated to ${formatRoleName(newRole)}`);
      setRoleModalVisible(false);
      setSelectedMember(null);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update member role');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveRequest(requestId: string) {
    try {
      setActionLoading(true);
      await api.members.approveAdminRequest(requestId);
      Alert.alert('Approved', 'Coordinator access granted.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectRequest(requestId: string) {
    try {
      setActionLoading(true);
      await api.members.rejectAdminRequest(requestId);
      Alert.alert('Declined', 'Role request declined.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to decline request');
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

  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'pending');
  }, [requests]);

  const filterTabs = useMemo(() => {
    return [
      { label: 'All Members', value: 'all', count: members.length },
      {
        label: 'Coordinators',
        value: 'coordinators',
        count: members.filter(m => (m.role || '').toLowerCase() !== 'member').length,
      },
      ...(isHQAdmin && !isChurchMode
        ? [{ label: 'Role Requests', value: 'requests', count: pendingRequests.length }]
        : []),
    ];
  }, [members, pendingRequests.length, isHQAdmin, isChurchMode]);

  const filteredMembers = useMemo(() => {
    let list = members;
    if (activeTab === 'coordinators') {
      list = list.filter(m => (m.role || '').toLowerCase() !== 'member');
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        m =>
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.voicePart || '').toLowerCase().includes(q) ||
          (m.zoneId || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [members, activeTab, search]);

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader
        title={isChurchMode ? "Church Choir Roster" : "Choir Directory"}
        rightElement={<Badge label={`${members.length} Singers`} variant="alto" size="sm" />}
      />

      {/* Control section */}
      <View style={styles.topControl}>

        <SearchFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          placeholder="Search by name, email, voice part, or zone..."
          filterOptions={filterTabs}
          activeFilter={activeTab}
          onFilterChange={setActiveTab}
        />
      </View>

      {/* Content Feed */}
      {activeTab === 'requests' ? (
        <FlatList
          data={pendingRequests}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accentBright}
              colors={[Colors.accentBright]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-circle-outline"
              title="No Pending Role Requests"
              description="Any member requests for coordinator privileges will appear here for review."
            />
          }
          renderItem={({ item }) => (
            <GradientCard variant="surface" style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View>
                  <Text style={styles.requestName}>{item.userName || 'Member'}</Text>
                  <Text style={styles.requestEmail}>{item.userEmail}</Text>
                </View>
                <Badge label={item.zoneCode || 'Zonal'} variant="key" size="sm" />
              </View>

              {item.reason ? (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Request Reason:</Text>
                  <Text style={styles.reasonText}>{item.reason}</Text>
                </View>
              ) : null}

              <View style={styles.requestActionRow}>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => handleRejectRequest(item.id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApproveRequest(item.id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.approveBtnText}>Grant Access</Text>
                </TouchableOpacity>
              </View>
            </GradientCard>
          )}
        />
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accentBright}
              colors={[Colors.accentBright]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.accentBright} size="large" />
              </View>
            ) : (
              <EmptyState
                icon="people-outline"
                title="No Members Found"
                description="Try searching with a different name or clear the search filter."
              />
            )
          }
          renderItem={({ item }) => {
            const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Choir Member';
            const isCoord = (item.role || '').toLowerCase() !== 'member';

            return (
              <GradientCard variant="surface" style={styles.memberCard}>
                <View style={styles.memberRow}>
                  <View style={[styles.avatarCircle, isCoord && styles.avatarCircleCoord]}>
                    <Text style={styles.avatarLetter}>
                      {item.firstName ? item.firstName.charAt(0).toUpperCase() : 'S'}
                    </Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {fullName}
                      </Text>
                      <Badge
                        label={formatRoleName(item.role)}
                        variant={isCoord ? 'alto' : 'draft'}
                        size="sm"
                      />
                    </View>

                    <Text style={styles.memberEmail} numberOfLines={1}>
                      {item.email || 'No email provided'}
                    </Text>

                    <View style={styles.metaBadgeRow}>
                      {item.voicePart ? (
                        <Badge label={item.voicePart} variant="soprano" size="sm" />
                      ) : null}
                      {item.zoneId ? (
                        <View style={styles.zoneTag}>
                          <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                          <Text style={styles.zoneTagText} numberOfLines={1}>
                            {item.zoneId}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {canPromote && (
                    <TouchableOpacity
                      style={styles.roleActionBtn}
                      onPress={() => {
                        setSelectedMember(item);
                        setRoleModalVisible(true);
                      }}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </GradientCard>
            );
          }}
        />
      )}

      {/* Role Assignment Modal */}
      <Modal visible={roleModalVisible} transparent animationType="fade" onRequestClose={() => setRoleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.roleModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manage Privileges</Text>
                <Text style={styles.modalSub}>
                  {[selectedMember?.firstName, selectedMember?.lastName].filter(Boolean).join(' ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.roleSelectLabel}>SELECT ROLE FOR THIS MEMBER:</Text>

            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => selectedMember && handleChangeRole(selectedMember.id, 'member')}
            >
              <View>
                <Text style={styles.roleOptionTitle}>Singer (Member)</Text>
                <Text style={styles.roleOptionSub}>Standard access to rehearsals, audio lab, and chat</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => selectedMember && handleChangeRole(selectedMember.id, 'church_coordinator')}
            >
              <View>
                <Text style={styles.roleOptionTitle}>Church Coordinator</Text>
                <Text style={styles.roleOptionSub}>Manage local assembly programs & attendance</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => selectedMember && handleChangeRole(selectedMember.id, 'zone_coordinator')}
            >
              <View>
                <Text style={styles.roleOptionTitle}>Zonal Coordinator</Text>
                <Text style={styles.roleOptionSub}>Full administration across regional zonal repertoire</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            {isHQAdmin && (
              <TouchableOpacity
                style={styles.roleOption}
                onPress={() => selectedMember && handleChangeRole(selectedMember.id, 'hq_admin')}
              >
                <View>
                  <Text style={[styles.roleOptionTitle, { color: Colors.accentBright }]}>HQ Director</Text>
                  <Text style={styles.roleOptionSub}>Global master catalog and ministry administration</Text>
                </View>
                <Ionicons name="shield-checkmark" size={18} color={Colors.accentBright} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topControl: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  memberCard: {
    borderRadius: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarCircleCoord: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7c3aed',
  },
  memberInfo: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 6,
  },
  memberEmail: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  zoneTagText: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 3,
  },
  roleActionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  requestCard: {
    borderRadius: 16,
    padding: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  requestEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  reasonBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  reasonText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  requestActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  approveBtn: {
    flex: 1.2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  roleModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '700',
    marginTop: 2,
  },
  roleSelectLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleOptionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 240,
  },
});
