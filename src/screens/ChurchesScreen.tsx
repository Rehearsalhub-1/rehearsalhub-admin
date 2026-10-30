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
  const {
    churches,
    loading,
    refreshing,
    refetch,
    createChurch,
    updateChurch,
    deleteChurch,
    assignCoordinator,
    removeCoordinator,
  } = useChurches();

  const [search, setSearch] = useState('');

  // Create church modal
  const [createModal, setCreateModal] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [createCoordinatorEmail, setCreateCoordinatorEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit church modal
  const [editModal, setEditModal] = useState(false);
  const [editChurchName, setEditChurchName] = useState('');
  const [updatingChurch, setUpdatingChurch] = useState(false);

  // Church options bottom sheet
  const [optionsModal, setOptionsModal] = useState(false);

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

  async function handleUpdateChurch() {
    if (!editChurchName.trim() || !selectedChurch) {
      customAlert('Missing Name', 'Please enter a church name.');
      return;
    }
    setUpdatingChurch(true);
    const newName = editChurchName.trim();
    const ok = await updateChurch(selectedChurch.id, newName);
    if (ok) {
      setSelectedChurch(prev => prev ? { ...prev, name: newName } : null);
      setEditModal(false);
      setEditChurchName('');
    }
    setUpdatingChurch(false);
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

  function handleRemoveCoordinator(church: Church, userId?: string) {
    customAlert(
      'Remove Church Admin',
      `Remove ${userId ? 'this coordinator' : (church.coordinatorName || 'the current coordinator')} as admin of "${church.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Admin',
          style: 'destructive',
          onPress: async () => {
            setAssigning(true);
            const ok = await removeCoordinator(church.id, userId);
            if (ok) {
              setSelectedChurch(prev => {
                if (!prev) return null;
                if (!userId) {
                  return { ...prev, coordinatorId: undefined, coordinatorName: undefined, coordinatorEmail: undefined, coordinators: [] };
                }
                const remaining = (prev.coordinators || []).filter(c => c.id !== userId);
                return {
                  ...prev,
                  coordinators: remaining,
                  coordinatorId: remaining[0]?.id,
                  coordinatorName: remaining.length > 0 ? remaining.map(c => c.name).join(', ') : undefined,
                  coordinatorEmail: remaining[0]?.email,
                };
              });
              setAssignModal(false);
              if (membersModal) {
                const membersRes = await api.churches.getMembers(church.id).catch(() => ({ data: [] }));
                setChurchMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
              }
            }
            setAssigning(false);
          },
        },
      ]
    );
  }

  async function handlePromoteToAdmin(member: any) {
    if (!selectedChurch) return;
    const prof = member.profile || {};
    const email = prof.email || member.email;
    const targetId = member.userId || member.id;
    const name = [prof.firstName || prof.first_name || member.firstName, prof.lastName || prof.last_name || member.lastName].filter(Boolean).join(' ') || member.name || email;
    if (!email && !targetId) {
      customAlert('No Identifier', 'This singer does not have a registered email or user ID.');
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
            const ok = await assignCoordinator(selectedChurch.id, (email || targetId).toLowerCase());
            if (ok) {
              setSelectedChurch(prev => {
                if (!prev) return null;
                const existing = prev.coordinators || [];
                const nextCoords = existing.some(c => c.id === targetId)
                  ? existing
                  : [...existing, { id: targetId, name, email: email || '' }];
                return {
                  ...prev,
                  coordinators: nextCoords,
                  coordinatorName: nextCoords.map(c => c.name).join(', '),
                  coordinatorEmail: prev.coordinatorEmail || email,
                };
              });
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
                    {item.coordinatorName || 'No Admin'}
                  </Text>
                </View>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.churchMetaText}>
                  {item.memberCount !== undefined ? `${item.memberCount} singers` : '0 singers'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#f8fafc',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => {
                setSelectedChurch(item);
                setOptionsModal(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.75}
            >
              <Ionicons name="ellipsis-vertical" size={16} color="#475569" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      {/* Church Options Bottom Sheet */}
      <Modal visible={optionsModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsModal(false)}
        >
          <View style={[styles.modalContent, { paddingBottom: 28 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedChurch?.name}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {selectedChurch?.coordinatorName
                    ? `Admin: ${selectedChurch.coordinatorName}`
                    : 'No Church Admin Assigned'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOptionsModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  gap: 12,
                }}
                onPress={() => {
                  setOptionsModal(false);
                  if (selectedChurch) handleOpenMembersModal(selectedChurch);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="people-outline" size={19} color="#7c3aed" />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                  Manage Choir Singers
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  gap: 12,
                }}
                onPress={() => {
                  setOptionsModal(false);
                  setCoordinatorEmail(selectedChurch?.coordinatorEmail || '');
                  setAssignModal(true);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="shield-checkmark-outline" size={19} color="#0284c7" />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                  {selectedChurch?.coordinatorName ? 'Change Church Admin' : 'Appoint Church Admin'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              {(selectedChurch?.coordinatorName || selectedChurch?.coordinatorEmail) && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: '#fffbeb',
                    borderWidth: 1,
                    borderColor: '#fde68a',
                    gap: 12,
                  }}
                  onPress={() => {
                    setOptionsModal(false);
                    if (selectedChurch) handleRemoveCoordinator(selectedChurch);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="person-remove-outline" size={19} color="#d97706" />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#92400e' }}>
                    Unassign Current Admin
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  gap: 12,
                }}
                onPress={() => {
                  setOptionsModal(false);
                  setEditChurchName(selectedChurch?.name || '');
                  setEditModal(true);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="create-outline" size={19} color="#475569" />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                  Rename Church
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: '#fff1f2',
                  borderWidth: 1,
                  borderColor: '#fecdd3',
                  gap: 12,
                }}
                onPress={() => {
                  setOptionsModal(false);
                  if (selectedChurch) deleteChurch(selectedChurch.id, selectedChurch.name);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="trash-outline" size={19} color={Colors.danger} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: Colors.danger }}>
                  Delete Church
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {/* Edit Church Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Church</Text>
                <TouchableOpacity onPress={() => setEditModal(false)}>
                  <Ionicons name="close" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Church Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={editChurchName}
                onChangeText={setEditChurchName}
                placeholder="e.g. Christ Embassy Central Church"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, (!editChurchName.trim() || updatingChurch) && { opacity: 0.6 }]}
                onPress={handleUpdateChurch}
                disabled={updatingChurch || !editChurchName.trim()}
                activeOpacity={0.85}
              >
                {updatingChurch ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Save Changes</Text>}
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

            {(selectedChurch?.coordinatorName || selectedChurch?.coordinatorEmail) && (
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  paddingVertical: 11,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#fecdd3',
                  backgroundColor: '#fff1f2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => selectedChurch && handleRemoveCoordinator(selectedChurch)}
                disabled={assigning}
                activeOpacity={0.8}
              >
                <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: '700' }}>
                  Remove Current Admin ({selectedChurch.coordinatorName || selectedChurch.coordinatorEmail})
                </Text>
              </TouchableOpacity>
            )}
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
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
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
                  const memberUid = m.userId || m.id;
                  const name = [prof.firstName || prof.first_name || m.firstName, prof.lastName || prof.last_name || m.lastName].filter(Boolean).join(' ') || m.name || email || 'Singer';
                  const isCoord = Boolean(
                    m.isAdmin === true ||
                    m.role === 'church_admin' ||
                    m.role === 'coordinator' ||
                    m.role === 'admin' ||
                    String(m.rawRole || '').toUpperCase() === 'GROUP_ADMIN' ||
                    selectedChurch?.coordinators?.some(
                      c => c.id === memberUid || (c.email && email && c.email.toLowerCase() === email.toLowerCase())
                    ) ||
                    (selectedChurch?.coordinatorEmail && email && email.toLowerCase() === selectedChurch.coordinatorEmail.toLowerCase())
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
                        <TouchableOpacity
                          onPress={() =>
                            isCoord
                              ? selectedChurch && handleRemoveCoordinator(selectedChurch, m.userId || m.id)
                              : handlePromoteToAdmin(m)
                          }
                          style={[
                            styles.memberRemoveBtn,
                            {
                              backgroundColor: isCoord ? '#f5f3ff' : '#f8fafc',
                              borderWidth: 1,
                              borderColor: isCoord ? '#ddd6fe' : '#e2e8f0',
                            },
                          ]}
                          activeOpacity={0.75}
                        >
                          <Ionicons
                            name={isCoord ? 'shield-checkmark' : 'shield-outline'}
                            size={15}
                            color={isCoord ? '#7c3aed' : '#64748b'}
                          />
                        </TouchableOpacity>

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
