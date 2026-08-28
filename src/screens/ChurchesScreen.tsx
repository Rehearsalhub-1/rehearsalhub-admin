import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert, TextInput, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';

interface Church {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  zoneName?: string;
  coordinatorName?: string;
  coordinatorEmail?: string;
  memberCount?: number;
  status?: 'active' | 'pending' | 'rejected';
  createdAt?: string;
}

export default function ChurchesScreen({ navigation }: any) {
  const { activeZone, isAllZones } = useZoneContext();
  const { adminUser } = useAuth();

  const [churches, setChurches] = useState<Church[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'churches' | 'pending'>('churches');
  const [search, setSearch] = useState('');

  // Create church modal
  const [createModal, setCreateModal] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [churchCode, setChurchCode] = useState('');
  const [creating, setCreating] = useState(false);

  // Assign coordinator modal
  const [assignModal, setAssignModal] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Manage Church Members modal
  const [membersModal, setMembersModal] = useState(false);
  const [churchMembers, setChurchMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [directory, setDirectory] = useState<any[]>([]);
  const [searchDirectory, setSearchDirectory] = useState('');
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const fetchChurches = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const [churchesRes, reqRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: Church[] }>(`/subgroups${zoneParam}`).catch(() => ({ data: [] })),
        apiClient.get<{ success: boolean; data: Church[] }>(`/subgroups/requests${zoneParam}`).catch(() => ({ data: [] })),
      ]);

      const churchList = Array.isArray(churchesRes.data) ? churchesRes.data : [];
      const pendingFromMain = churchList.filter(c => c.status === 'pending');
      const pendingList = Array.isArray(reqRes.data) ? reqRes.data : [];
      const combinedPending = [...pendingFromMain, ...pendingList.filter(p => !pendingFromMain.some(m => m.id === p.id))];

      setChurches(churchList.filter(c => c.status === 'active' || !c.status));
      setPendingRequests(combinedPending);
    } catch (e) {
      console.error('[Churches] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchChurches();
  }, [fetchChurches]);

  async function handleCreateChurch() {
    if (!churchName.trim() || !churchCode.trim()) {
      Alert.alert('Missing Fields', 'Please provide a church name and unique code.');
      return;
    }

    setCreating(true);
    try {
      await apiClient.post('/subgroups', {
        name: churchName.trim(),
        code: churchCode.trim().toUpperCase(),
        zoneId: activeZone?.id || adminUser?.zoneId || 'zone-001',
      });
      setCreateModal(false);
      setChurchName('');
      setChurchCode('');
      Alert.alert('Success', 'New church added to directory.');
      fetchChurches();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create church');
    } finally {
      setCreating(false);
    }
  }

  async function handleApprove(churchId: string) {
    try {
      await apiClient.post(`/subgroups/${churchId}/approve`, {});
      Alert.alert('Approved', 'Church approved and activated.');
      fetchChurches();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve church');
    }
  }

  async function handleReject(churchId: string) {
    Alert.alert('Reject Request', 'Reject this church creation request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/subgroups/${churchId}/reject`, { reason: 'Declined by coordinator' });
            fetchChurches();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to reject');
          }
        },
      },
    ]);
  }

  async function handleAssignCoordinator() {
    if (!coordinatorEmail.trim() || !selectedChurch) {
      Alert.alert('Missing Email', 'Enter the member email to appoint as coordinator.');
      return;
    }

    setAssigning(true);
    try {
      await apiClient.post(`/subgroups/${selectedChurch.id}/coordinators`, {
        identifier: coordinatorEmail.trim().toLowerCase(),
      });
      setAssignModal(false);
      setCoordinatorEmail('');
      setSelectedChurch(null);
      Alert.alert('Assigned', 'Church Coordinator appointed successfully.');
      fetchChurches();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to appoint coordinator');
    } finally {
      setAssigning(false);
    }
  }

  async function handleOpenMembersModal(church: Church) {
    setSelectedChurch(church);
    setMembersModal(true);
    setLoadingMembers(true);
    setShowAddPicker(false);
    setSearchDirectory('');
    try {
      const [membersRes, dirRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: any[] }>(`/subgroups/${church.id}/members`).catch(() => ({ data: [] })),
        apiClient.get<{ success: boolean; data: any[] }>(`/profiles/directory?zoneId=${encodeURIComponent(church.zoneId || activeZone?.id || 'zone-001')}`).catch(() => ({ data: [] })),
      ]);
      setChurchMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      setDirectory(Array.isArray(dirRes.data) ? dirRes.data : []);
    } catch {
      setChurchMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleAddChurchMember(userId: string) {
    if (!selectedChurch) return;
    setActionUserId(userId);
    try {
      await apiClient.post('/subgroups/members', {
        subGroupId: selectedChurch.id,
        userId,
        role: 'member',
      });
      const membersRes = await apiClient.get<{ success: boolean; data: any[] }>(`/subgroups/${selectedChurch.id}/members`);
      setChurchMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      fetchChurches();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add member');
    } finally {
      setActionUserId(null);
    }
  }

  async function handleRemoveChurchMember(userId: string) {
    if (!selectedChurch) return;
    Alert.alert('Remove Singer', 'Remove this singer from church choir?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setActionUserId(userId);
          try {
            await apiClient.delete(`/subgroups/members?subGroupId=${encodeURIComponent(selectedChurch.id)}&userId=${encodeURIComponent(userId)}`);
            setChurchMembers(prev => prev.filter(m => m.userId !== userId && m.id !== userId));
            fetchChurches();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to remove member');
          } finally {
            setActionUserId(null);
          }
        },
      },
    ]);
  }

  const filteredChurches = churches.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.coordinatorName && c.coordinatorName.toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Churches" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Churches" />

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'churches' && styles.tabBtnActive]}
          onPress={() => setActiveTab('churches')}
          activeOpacity={0.75}
        >
          <Ionicons name="business-outline" size={14} color={activeTab === 'churches' ? '#fff' : Colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.tabBtnText, activeTab === 'churches' && styles.tabBtnTextActive]}>
            Active Churches ({churches.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.75}
        >
          <Ionicons name="time-outline" size={14} color={activeTab === 'pending' ? '#fff' : Colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.tabBtnText, activeTab === 'pending' && styles.tabBtnTextActive]}>
            Pending ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Add Bar */}
      {activeTab === 'churches' && (
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by church or code..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setCreateModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'churches' ? (
        <FlatList
          data={filteredChurches}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChurches(); }} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="business-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No churches registered in this zone</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.churchCard}>
              <View style={styles.churchIconWrap}>
                <Ionicons name="business" size={18} color={Colors.accentBright} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.churchName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeBadgeText}>{item.code}</Text>
                  </View>
                </View>
                <Text style={styles.churchMeta}>
                  {item.coordinatorName ? `Coord: ${item.coordinatorName}` : 'No coordinator assigned'}
                  {item.memberCount !== undefined ? ` · ${item.memberCount} singers` : ''}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.assignBtn, { backgroundColor: Colors.surface }]}
                  onPress={() => handleOpenMembersModal(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="people-outline" size={14} color={Colors.accentBright} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.assignBtn}
                  onPress={() => {
                    setSelectedChurch(item);
                    setAssignModal(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="person-add-outline" size={14} color={Colors.accentBright} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        /* Pending Requests Tab */
        <FlatList
          data={pendingRequests}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChurches(); }} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="checkmark-done-circle-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No pending church requests</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.pendingCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>{item.name}</Text>
                <Text style={styles.pendingMeta}>Code: {item.code} · Zone: {item.zoneName || item.zoneId}</Text>
                {item.coordinatorEmail && (
                  <Text style={styles.pendingEmail}>Applicant: {item.coordinatorEmail}</Text>
                )}
              </View>

              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={14} color={Colors.success} style={{ marginRight: 4 }} />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={14} color={Colors.danger} style={{ marginRight: 4 }} />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Create Church Modal */}
      <Modal visible={createModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Church</Text>
              <TouchableOpacity onPress={() => setCreateModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Church Name</Text>
            <TextInput
              style={styles.modalInput}
              value={churchName}
              onChangeText={setChurchName}
              placeholder="e.g. Christ Embassy Central Church"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Church Code</Text>
            <TextInput
              style={styles.modalInput}
              value={churchCode}
              onChangeText={setChurchCode}
              placeholder="e.g. CE-CENTRAL-01"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreateChurch}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Save Church</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign Coordinator Modal */}
      <Modal visible={assignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Church Coordinator</Text>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 6 }}>
              Appointing coordinator for: <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>{selectedChurch?.name}</Text>
            </Text>

            <Text style={styles.inputLabel}>Member Email / Identifier</Text>
            <TextInput
              style={styles.modalInput}
              value={coordinatorEmail}
              onChangeText={setCoordinatorEmail}
              placeholder="member@loveworld.org"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, assigning && { opacity: 0.6 }]}
              onPress={handleAssignCoordinator}
              disabled={assigning}
              activeOpacity={0.85}
            >
              {assigning ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Appoint Coordinator</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manage Church Members Modal */}
      <Modal visible={membersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedChurch?.name}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  Registered Choir Singers ({churchMembers.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMembersModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: showAddPicker ? Colors.surface : Colors.accent,
                paddingVertical: 10,
                borderRadius: 12,
                marginVertical: 10,
                borderWidth: showAddPicker ? 1 : 0,
                borderColor: Colors.border,
              }}
              onPress={() => setShowAddPicker(!showAddPicker)}
              activeOpacity={0.8}
            >
              <Ionicons name={showAddPicker ? "close" : "person-add"} size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                {showAddPicker ? 'Close Singer Picker' : 'Add Singer to Church'}
              </Text>
            </TouchableOpacity>

            {/* Singer Picker */}
            {showAddPicker && (
              <View style={{ backgroundColor: Colors.surface, padding: 10, borderRadius: 12, marginBottom: 12, maxHeight: 200, borderWidth: 1, borderColor: Colors.border }}>
                <TextInput
                  style={[styles.modalInput, { marginBottom: 8, height: 36, fontSize: 12 }]}
                  value={searchDirectory}
                  onChangeText={setSearchDirectory}
                  placeholder="Search singer by name/email..."
                  placeholderTextColor={Colors.textMuted}
                />
                <FlatList
                  data={directory.filter(p => {
                    const already = churchMembers.some(m => m.userId === p.id || m.id === p.id);
                    if (already) return false;
                    if (!searchDirectory.trim()) return true;
                    const q = searchDirectory.toLowerCase();
                    const name = `${p.first_name || p.firstName || ''} ${p.last_name || p.lastName || ''}`.toLowerCase();
                    return name.includes(q) || (p.email && p.email.toLowerCase().includes(q));
                  })}
                  keyExtractor={p => p.id}
                  renderItem={({ item: person }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                          {person.first_name || person.firstName || 'Singer'} {person.last_name || person.lastName || ''}
                        </Text>
                        <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{person.email || person.alias || ''}</Text>
                      </View>
                      <TouchableOpacity
                        style={{ backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                        onPress={() => handleAddChurchMember(person.id)}
                        disabled={actionUserId === person.id}
                      >
                        {actionUserId === person.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Add</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={{ color: Colors.textMuted, fontSize: 11, textAlign: 'center', padding: 8 }}>No matching singers found.</Text>}
                />
              </View>
            )}

            {/* Current Members List */}
            {loadingMembers ? (
              <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
            ) : churchMembers.length === 0 ? (
              <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 20 }}>
                No singers added to this church yet.
              </Text>
            ) : (
              <FlatList
                data={churchMembers}
                keyExtractor={m => m.userId || m.id}
                style={{ maxHeight: 280 }}
                renderItem={({ item: m }) => {
                  const prof = m.profile || {};
                  const name = [prof.firstName || prof.first_name, prof.lastName || prof.last_name].filter(Boolean).join(' ') || prof.email || 'Singer';
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: Colors.accentBright, fontWeight: '800', fontSize: 12 }}>
                            {name[0]?.toUpperCase() || 'S'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: Colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{name}</Text>
                          <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{prof.email || m.role || 'Member'}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveChurchMember(m.userId || m.id)}
                        disabled={actionUserId === (m.userId || m.id)}
                        style={{ padding: 6 }}
                      >
                        {actionUserId === (m.userId || m.id) ? (
                          <ActivityIndicator size="small" color={Colors.danger} />
                        ) : (
                          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 13 },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  churchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  churchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  churchName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 180,
  },
  codeBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeBadgeText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  churchMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  assignBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },

  pendingCard: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  pendingTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  pendingMeta: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pendingEmail: {
    color: Colors.info,
    fontSize: 11,
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.success + '15',
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  approveText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.danger + '15',
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  rejectText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
