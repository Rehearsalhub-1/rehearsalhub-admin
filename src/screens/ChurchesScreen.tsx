import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';
import { useChurches, Church } from '../hooks/useChurches';
import { customAlert } from '../context/AlertContext';

export default function ChurchesScreen({ navigation }: any) {
  const { activeZone, isChurchMode } = useZoneContext();
  const { adminUser } = useAuth();
  const { churches, loading, refreshing, refetch, createChurch, assignCoordinator } = useChurches();

  const [search, setSearch] = useState('');

  // Create church modal
  const [createModal, setCreateModal] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [createCoordinatorEmail, setCreateCoordinatorEmail] = useState('');
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
    if (!churchName.trim()) {
      customAlert('Missing Name', 'Please enter a church name.');
      return;
    }
    setCreating(true);
    const ok = await createChurch(churchName.trim(), undefined, createCoordinatorEmail.trim());
    if (ok) {
      setCreateModal(false);
      setChurchName('');
      setCreateCoordinatorEmail('');
    }
    setCreating(false);
  }

  async function handleAssignCoordinator() {
    if (!coordinatorEmail.trim() || !selectedChurch) {
      customAlert('Missing Email', 'Enter the member email to appoint as coordinator.');
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

  async function handlePromoteToAdmin(member: any) {
    if (!selectedChurch) return;
    const prof = member.profile || {};
    const email = prof.email || member.email;
    const name = [prof.firstName || prof.first_name, prof.lastName || prof.last_name].filter(Boolean).join(' ') || email;
    if (!email) {
      customAlert('No Email', 'This singer does not have a registered email address.');
      return;
    }
    customAlert(
      'Appoint Church Admin',
      `Appoint ${name} as Church Admin for "${selectedChurch.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Appoint',
          onPress: async () => {
            setAssigning(true);
            const ok = await assignCoordinator(selectedChurch.id, email.toLowerCase());
            if (ok) {
              setSelectedChurch(prev => prev ? { ...prev, coordinatorName: name, coordinatorEmail: email } : null);
              const membersRes = await api.churches.getMembers(selectedChurch.id).catch(() => ({ data: [] }));
              setChurchMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
              refetch();
            }
            setAssigning(false);
          },
        },
      ]
    );
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
      customAlert('Error', e.message || 'Failed to add member');
    } finally {
      setActionUserId(null);
    }
  }

  async function handleRemoveChurchMember(userId: string) {
    if (!selectedChurch) return;
    customAlert('Remove Singer', 'Remove this singer from church choir?', [
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
            customAlert('Error', e.message || 'Failed to remove member');
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

      {/* Search & Add Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search churches..."
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
          <TouchableOpacity
            style={styles.churchCard}
            onPress={() => handleOpenMembersModal(item)}
            activeOpacity={0.85}
          >
            <View style={styles.churchIconWrap}>
              <Ionicons name="business" size={18} color={Colors.accentBright} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.churchName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.churchMetaRow}>
                <View style={styles.adminIndicator}>
                  <Ionicons name="shield-checkmark" size={12} color={item.coordinatorName ? '#7c3aed' : '#94a3b8'} />
                  <Text style={[styles.churchMetaText, item.coordinatorName && styles.churchMetaTextActive]} numberOfLines={1}>
                    {item.coordinatorName || 'No Admin Assigned'}
                  </Text>
                </View>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.churchMetaText}>
                  {item.memberCount !== undefined ? `${item.memberCount} singers` : '0 singers'}
                </Text>
              </View>
            </View>

            <View style={styles.cardActionsRight}>
              <TouchableOpacity
                style={styles.actionChipBtn}
                onPress={() => handleOpenMembersModal(item)}
                activeOpacity={0.75}
              >
                <Ionicons name="people" size={13} color="#7c3aed" style={{ marginRight: 3 }} />
                <Text style={styles.actionChipText}>Singers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionChipBtn, !item.coordinatorName && styles.actionChipBtnHighlight]}
                onPress={() => {
                  setSelectedChurch(item);
                  setCoordinatorEmail(item.coordinatorEmail || '');
                  setAssignModal(true);
                }}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={item.coordinatorName ? "shield-outline" : "person-add"}
                  size={13}
                  color={!item.coordinatorName ? "#ffffff" : "#475569"}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.actionChipText, !item.coordinatorName && { color: '#ffffff' }]}>
                  {item.coordinatorName ? 'Admin' : 'Appoint'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Create Church Modal (No Church Code Box!) */}
      <Modal visible={createModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Church</Text>
                <TouchableOpacity onPress={() => setCreateModal(false)}>
                  <Ionicons name="close" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Church Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={churchName}
                onChangeText={setChurchName}
                placeholder="e.g. Christ Embassy Central Church"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />

              <Text style={styles.inputLabel}>Church Admin Email (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={createCoordinatorEmail}
                onChangeText={setCreateCoordinatorEmail}
                placeholder="admin@loveworld.org (or assign later)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, (!churchName.trim() || creating) && { opacity: 0.6 }]}
                onPress={handleCreateChurch}
                disabled={creating || !churchName.trim()}
                activeOpacity={0.85}
              >
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Create Church</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Assign Coordinator Modal */}
      <Modal visible={assignModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior='padding'
          style={{ flex: 1 }}
        >
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Manage Church Members Modal */}
      <Modal visible={membersModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior='padding'
          style={{ flex: 1 }}
        >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedChurch?.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ionicons
                    name="shield-checkmark"
                    size={12}
                    color={selectedChurch?.coordinatorName ? '#7c3aed' : '#94a3b8'}
                  />
                  <Text style={{ color: selectedChurch?.coordinatorName ? '#0f172a' : Colors.textMuted, fontSize: 12, fontWeight: selectedChurch?.coordinatorName ? '700' : '500' }}>
                    {selectedChurch?.coordinatorName ? `Admin: ${selectedChurch.coordinatorName}` : 'No Admin Assigned'}
                  </Text>
                  <Text style={{ color: '#cbd5e1' }}>•</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                    {churchMembers.length} {churchMembers.length === 1 ? 'singer' : 'singers'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setMembersModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                {showAddPicker ? 'Close Singer Picker' : '+ Add Singer to Church'}
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
                        style={{ backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
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
                No singers added to this church choir yet.
              </Text>
            ) : (
              <FlatList
                data={churchMembers}
                keyExtractor={m => m.userId || m.id}
                style={{ maxHeight: 280 }}
                renderItem={({ item: m }) => {
                  const prof = m.profile || {};
                  const email = prof.email || m.email || '';
                  const name = [prof.firstName || prof.first_name, prof.lastName || prof.last_name].filter(Boolean).join(' ') || email || 'Singer';
                  const isCoord = Boolean(
                    m.role === 'coordinator' ||
                    m.role === 'admin' ||
                    (selectedChurch?.coordinatorEmail && email.toLowerCase() === selectedChurch.coordinatorEmail.toLowerCase()) ||
                    (selectedChurch?.coordinatorName && name.toLowerCase() === selectedChurch.coordinatorName.toLowerCase())
                  );

                  return (
                    <View style={styles.memberRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {name[0]?.toUpperCase() || 'S'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                            {isCoord && (
                              <View style={styles.coordBadge}>
                                <Ionicons name="shield-checkmark" size={10} color="#7c3aed" style={{ marginRight: 2 }} />
                                <Text style={styles.coordBadgeText}>Admin</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.memberSub} numberOfLines={1}>{email || prof.voicePart || 'Choir Member'}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {!isCoord && (
                          <TouchableOpacity
                            onPress={() => handlePromoteToAdmin(m)}
                            style={styles.makeAdminBtn}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.makeAdminBtnText}>Make Admin</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => handleRemoveChurchMember(m.userId || m.id)}
                          disabled={actionUserId === (m.userId || m.id)}
                          style={styles.memberRemoveBtn}
                          activeOpacity={0.75}
                        >
                          {actionUserId === (m.userId || m.id) ? (
                            <ActivityIndicator size="small" color={Colors.danger} />
                          ) : (
                            <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
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
  },
  churchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  adminIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  churchMetaText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  churchMetaTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  dotSeparator: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  actionChipBtnHighlight: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  actionChipText: {
    color: '#6d28d9',
    fontSize: 12,
    fontWeight: '700',
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#7c3aed',
    fontWeight: '800',
    fontSize: 13,
  },
  memberName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 150,
  },
  memberSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  coordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coordBadgeText: {
    color: '#7c3aed',
    fontSize: 10,
    fontWeight: '800',
  },
  makeAdminBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  makeAdminBtnText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },
  memberRemoveBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
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
