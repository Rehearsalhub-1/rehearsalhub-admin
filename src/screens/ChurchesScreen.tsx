import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';
import { useChurches, Church } from '../hooks/useChurches';

export default function ChurchesScreen({ navigation }: any) {
  const { activeZone, isChurchMode } = useZoneContext();
  const { adminUser } = useAuth();
  const { churches, pendingRequests, loading, refreshing, refetch, createChurch, approveChurch, rejectChurch, assignCoordinator } = useChurches();

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

  async function handleCreateChurch() {
    if (!churchName.trim() || !churchCode.trim()) {
      Alert.alert('Missing Fields', 'Please provide a church name and unique code.');
      return;
    }
    setCreating(true);
    const ok = await createChurch(churchName, churchCode);
    if (ok) {
      setCreateModal(false);
      setChurchName('');
      setChurchCode('');
    }
    setCreating(false);
  }

  async function handleAssignCoordinator() {
    if (!coordinatorEmail.trim() || !selectedChurch) {
      Alert.alert('Missing Email', 'Enter the member email to appoint as coordinator.');
      return;
    }
    setAssigning(true);
    const ok = await assignCoordinator(selectedChurch.id, coordinatorEmail.trim().toLowerCase());
    if (ok) {
      setAssignModal(false);
      setCoordinatorEmail('');
      setSelectedChurch(null);
    }
    setAssigning(false);
  }

  async function handleOpenMembersModal(church: Church) {
    setSelectedChurch(church);
    setMembersModal(true);
    setLoadingMembers(true);
    setShowAddPicker(false);
    setSearchDirectory('');
    try {
      const [membersRes, dirRes] = await Promise.all([
        api.churches.getMembers(church.id).catch(() => ({ data: [] })),
        api.members.getDirectory(church.zoneId || activeZone?.id).catch(() => ({ data: [] })),
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
      await api.churches.addMember({
        subGroupId: selectedChurch.id,
        userId,
        role: 'member',
      });
      const membersRes = await api.churches.getMembers(selectedChurch.id);
      setChurchMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      refetch();
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
            await api.churches.removeMember(selectedChurch.id, userId);
            setChurchMembers(prev => prev.filter(m => m.userId !== userId && m.id !== userId));
            refetch();
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

  if (isChurchMode && !adminUser?.isHQAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Churches & Subgroups" />
        <View style={styles.centerNotice}>
          <View style={styles.noticeIconWrap}>
            <Ionicons name="business-outline" size={44} color="#0284c7" />
          </View>
          <Text style={styles.noticeTitle}>Zonal Management</Text>
          <Text style={styles.noticeSub}>
            Church chapter approvals, creations, and coordinator appointments are managed at the Zonal and HQ Admin level.
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
        <ZoneHeader title="Churches & Subgroups" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Churches & Subgroups" />

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
            <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.accent} />
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
            <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.accent} />
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
                  onPress={() => approveChurch(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={14} color={Colors.success} style={{ marginRight: 4 }} />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => rejectChurch(item.id)}
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
                backgroundColor: showAddPicker ? '#f1f5f9' : Colors.accent,
                paddingVertical: 10,
                borderRadius: 12,
                marginVertical: 10,
                borderWidth: showAddPicker ? 1 : 0,
                borderColor: '#e2e8f0',
              }}
              onPress={() => setShowAddPicker(!showAddPicker)}
              activeOpacity={0.8}
            >
              <Ionicons name={showAddPicker ? "close" : "person-add"} size={16} color={showAddPicker ? Colors.textPrimary : '#fff'} />
              <Text style={{ color: showAddPicker ? Colors.textPrimary : '#fff', fontSize: 12, fontWeight: '700' }}>
                {showAddPicker ? 'Close Singer Picker' : 'Add Singer to Church'}
              </Text>
            </TouchableOpacity>

            {/* Singer Picker */}
            {showAddPicker && (
              <View style={{ backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, marginBottom: 12, maxHeight: 200, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <TextInput
                  style={[styles.modalInput, { marginBottom: 8, height: 38, fontSize: 12 }]}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                          {person.first_name || person.firstName || 'Singer'} {person.last_name || person.lastName || ''}
                        </Text>
                        <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{person.email || person.alias || ''}</Text>
                      </View>
                      <TouchableOpacity
                        style={{ backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#7c3aed', fontWeight: '800', fontSize: 12 }}>
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
  emptyText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.background,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
    gap: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  churchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  churchIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  churchName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    maxWidth: 180,
  },
  codeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  codeBadgeText: {
    color: '#475569',
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
    borderRadius: 10,
    backgroundColor: '#f3e8ff',
  },

  pendingCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  pendingTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  pendingMeta: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pendingEmail: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  approveText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
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
    backgroundColor: '#f0f9ff',
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
    backgroundColor: '#7c3aed',
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
