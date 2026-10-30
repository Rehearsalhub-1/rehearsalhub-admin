import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Share,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useZoneContext } from '../../context/ZoneContext';
import { useMembers, Member } from '../../hooks/useMembers';
import { useAlert } from '../../context/AlertContext';
import { api } from '../../services/api';
import { styles } from './membersStyles';
import MemberSearchBar from './MemberSearchBar';
import MemberListItem from './MemberListItem';
import MemberFeaturePassItem from './MemberFeaturePassItem';
import AddEmailPassModal from './AddEmailPassModal';
import EditMemberModal from './EditMemberModal';
import MemberExportModal from './MemberExportModal';
import SingerAttendanceBadgeModal from '../../components/SingerAttendanceBadgeModal';
import { exportTableReport, ExportFormat } from '../../utils/exportUtils';

const FlashListAny = FlashList as any;

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { isChurchMode, activeChurch, activeZone } = useZoneContext();
  const { members, loading, refreshing, refetch, saveMember, hasMore, loadingMore, loadMore, total, removeFromZone } = useMembers();

  // Selected Member for Attendance QR Badge Modal
  const [selectedBadgeMember, setSelectedBadgeMember] = useState<Member | null>(null);

  // Selected Member for Edit Profile Modal
  const [selectedEditMember, setSelectedEditMember] = useState<Member | null>(null);
  const [editMemberLoading, setEditMemberLoading] = useState(false);

  // Top-level View Mode: 'directory' vs 'feature_pass'
  const [viewMode, setViewMode] = useState<'directory' | 'feature_pass'>('directory');
  const [search, setSearch] = useState('');

  // Add Email Modal for Feature Pass
  const [addEmailModalVisible, setAddEmailModalVisible] = useState(false);
  const [targetEmailInput, setTargetEmailInput] = useState('');
  const [addingEmailLoading, setAddingEmailLoading] = useState(false);

  // Multi-format Member Export Modal
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // Add Singer to Church Modal (Church Mode)
  const [addChurchMemberModal, setAddChurchMemberModal] = useState(false);
  const [zoneDirectory, setZoneDirectory] = useState<any[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const [addingSingerId, setAddingSingerId] = useState<string | null>(null);

  const handleOpenAddChurchMember = useCallback(async () => {
    if (!activeChurch?.id) return;
    setAddChurchMemberModal(true);
    setDirectorySearch('');
    setLoadingDirectory(true);
    try {
      const res = await api.members.getDirectory(activeZone?.id).catch(() => ({ data: [] }));
      setZoneDirectory(Array.isArray(res.data) ? res.data : []);
    } catch {
      setZoneDirectory([]);
    } finally {
      setLoadingDirectory(false);
    }
  }, [activeChurch?.id, activeZone?.id]);

  const handleAddSingerToChurch = useCallback(async (userId: string) => {
    if (!activeChurch?.id) return;
    setAddingSingerId(userId);
    try {
      await api.churches.addMember({
        subGroupId: activeChurch.id,
        userId,
        role: 'member',
      });
      showAlert('Singer Added', `Singer added to ${activeChurch.name || 'your church'} choir.`);
      refetch();
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to add singer to church.');
    } finally {
      setAddingSingerId(null);
    }
  }, [activeChurch?.id, activeChurch?.name, refetch, showAlert]);

  // Filtered members by search
  const filteredMembers = useMemo(() => {
    let list = members.filter(m => !m.pending_hq_approval);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        m =>
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.church && m.church.toLowerCase().includes(q)) ||
          (m.designation && m.designation.toLowerCase().includes(q))
      );
    }
    return list;
  }, [members, search]);

  // Feature pass active members (all members or filtered)
  const featurePassMembers = useMemo(() => {
    if (!search.trim()) return members.filter(m => !m.pending_hq_approval);
    const q = search.toLowerCase();
    return members.filter(
      m =>
        !m.pending_hq_approval &&
        (`${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q))
    );
  }, [members, search]);

  // Toggle individual feature pass
  const handleTogglePass = useCallback(
    async (
      member: Member,
      featureKey: 'can_access_archive' | 'can_access_ongoing' | 'can_access_pre_rehearsal' | 'canAnnotate'
    ) => {
      const currentValue = Boolean(member[featureKey]);
      const nextValue = !currentValue;

      const payload: Record<string, any> = {
        [featureKey]: nextValue,
      };

      if (featureKey === 'can_access_archive') {
        payload.canSeeArchive = nextValue;
        payload.canAccessArchive = nextValue;
      } else if (featureKey === 'can_access_ongoing') {
        payload.canAccessOngoing = nextValue;
      } else if (featureKey === 'can_access_pre_rehearsal') {
        payload.canAccessPreRehearsal = nextValue;
      } else if (featureKey === 'canAnnotate') {
        payload.can_annotate = nextValue;
      }

      // Optimistic save
      saveMember({
        ...member,
        ...payload,
      });

      try {
        await api.members.updateProfile(member.id, payload);
      } catch (err: any) {
        // Revert on error
        saveMember({
          ...member,
          [featureKey]: currentValue,
        });
        showAlert('Update Failed', err?.message || 'Could not update feature pass.');
      }
    },
    [saveMember, showAlert]
  );

  // Add Email to Feature Pass
  const handleGrantEmailPass = async () => {
    const trimmed = targetEmailInput.trim().toLowerCase();
    if (!trimmed) {
      showAlert('Missing Email', 'Please enter a valid singer email address.');
      return;
    }

    setAddingEmailLoading(true);
    try {
      const res = await api.members.getGlobalMembers(trimmed);
      const matched = Array.isArray(res?.data) ? res.data[0] : null;

      if (!matched?.id && !matched?.userId) {
        showAlert('Singer Not Found', `No registered account found with email "${trimmed}".`);
        setAddingEmailLoading(false);
        return;
      }

      const targetId = matched.userId || matched.id;
      await api.members.updateProfile(targetId, {
        can_access_archive: true,
        canSeeArchive: true,
        can_access_ongoing: true,
        can_access_pre_rehearsal: true,
        canAnnotate: true,
      });

      showAlert('Pass Granted', `Full Feature Passes granted to ${trimmed}.`);
      setTargetEmailInput('');
      setAddEmailModalVisible(false);
      refetch();
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to grant feature pass.');
    } finally {
      setAddingEmailLoading(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setExportModalVisible(false);
    if (filteredMembers.length === 0) {
      showAlert('No Members', 'There are no member records to export.');
      return;
    }

    const title = isChurchMode ? `${activeChurch?.name || 'Church'} Members` : (activeZone?.name || 'Loveworld Singers HQ');
    const headers = ['#', 'Name', 'Email', 'Role', 'Zone', 'Church', 'Voice / Designation', 'Archive', 'Ongoing', 'Pre-Reh', 'Annotate'];
    const rows = filteredMembers.map((m, i) => [
      String(i + 1),
      `${m.first_name} ${m.last_name}`,
      m.email,
      m.role === 'hq_admin' ? 'HQ Admin' : m.role === 'church_admin' ? 'Church Admin' : m.role === 'zone_admin' ? 'Zone Admin' : 'Singer',
      m.zoneName || '',
      m.church || '',
      m.designation || '',
      m.can_access_archive ? 'YES' : 'NO',
      m.can_access_ongoing ? 'YES' : 'NO',
      m.can_access_pre_rehearsal ? 'YES' : 'NO',
      m.canAnnotate ? 'YES' : 'NO',
    ]);

    try {
      await exportTableReport(
        {
          title: `${title} - Members Directory`,
          subtitle: `Generated on ${new Date().toLocaleDateString()} • Total Members: ${filteredMembers.length}`,
          fileBaseName: `Members_Directory_${new Date().toLocaleDateString('en-CA')}`,
          headers,
          rows,
        },
        format
      );
    } catch {
      showAlert('Export Ready', `${filteredMembers.length} records exported.`);
    }
  };

  // Toggle member role (Zone Admin / Church Admin / Singer)
  const handleToggleMemberRole = useCallback(
    async (member: Member, nextRole: Member['role']) => {
      try {
        if (isChurchMode && activeChurch?.id) {
          if (nextRole === 'church_admin') {
            await api.churches.addCoordinator(activeChurch.id, {
              userId: member.id,
              identifier: member.email || member.id,
            });
          } else {
            await api.churches.removeCoordinator(activeChurch.id, member.id);
          }
        } else {
          await api.members.updateRole(member.id, nextRole || 'member');
        }
        showAlert('Role Updated', `${member.first_name} ${member.last_name}'s role has been updated.`);
        refetch();
      } catch (err: any) {
        showAlert('Update Failed', err?.message || 'Could not update member role.');
      }
    },
    [isChurchMode, activeChurch?.id, refetch, showAlert]
  );

  // Save edited member profile details
  const handleSaveMemberDetails = async (updated: {
    firstName: string;
    lastName: string;
    phone: string;
    designation: string;
    role?: Member['role'];
  }) => {
    if (!selectedEditMember) return;
    setEditMemberLoading(true);
    try {
      const roleChanged = updated.role && updated.role !== selectedEditMember.role;

      saveMember({
        ...selectedEditMember,
        first_name: updated.firstName,
        last_name: updated.lastName,
        phone: updated.phone,
        designation: updated.designation,
        role: updated.role || selectedEditMember.role,
      });

      await api.members.updateProfile(selectedEditMember.id, {
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        voicePart: updated.designation,
        designation: updated.designation,
        ...(updated.role ? { role: updated.role } : {}),
      });

      if (roleChanged && updated.role) {
        if (isChurchMode && activeChurch?.id) {
          if (updated.role === 'church_admin') {
            await api.churches.addCoordinator(activeChurch.id, {
              userId: selectedEditMember.id,
              identifier: selectedEditMember.email || selectedEditMember.id,
            });
          } else {
            await api.churches.removeCoordinator(activeChurch.id, selectedEditMember.id);
          }
        } else {
          await api.members.updateRole(selectedEditMember.id, updated.role);
        }
      }

      setSelectedEditMember(null);
      showAlert('Profile Updated', 'Member details have been updated successfully.');
      refetch();
    } catch (err: any) {
      showAlert('Update Failed', err?.message || 'Could not update member profile.');
      refetch();
    } finally {
      setEditMemberLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerLeft, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.headerTitle, { flexShrink: 1 }]} numberOfLines={1}>
            {isChurchMode ? (activeChurch?.name || 'Church Choir') : (activeZone?.name || 'Loveworld Singers HQ')}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {search.trim() ? filteredMembers.length : (total > 0 ? total : filteredMembers.length)}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isChurchMode && activeChurch?.id && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', borderWidth: 1 }]}
              onPress={handleOpenAddChurchMember}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="person-add-outline" size={18} color="#7c3aed" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setExportModalVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="download-outline" size={18} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={refetch}
            activeOpacity={0.7}
            disabled={refreshing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh" size={18} color="#7c3aed" />
          </TouchableOpacity>
        </View>
      </View>

      <MemberSearchBar
        viewMode={viewMode}
        setViewMode={setViewMode}
        search={search}
        setSearch={setSearch}
        onAddEmail={() => setAddEmailModalVisible(true)}
      />

      {/* ─── TAB 1: MEMBERS DIRECTORY ──────────────────────────────────────── */}
      {viewMode === 'directory' && (
        <FlashListAny
          data={filteredMembers}
          keyExtractor={(item: Member) => item.id}
          estimatedItemSize={72}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} colors={['#7c3aed']} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#7c3aed" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Members Found</Text>
                <Text style={styles.emptySub}>No members found for this zone or search query.</Text>
              </View>
            )
          }
          renderItem={({ item }: { item: Member }) => (
            <MemberListItem
              item={item}
              onRemove={removeFromZone}
              onShowBadge={(m) => setSelectedBadgeMember(m)}
              onEdit={(m) => setSelectedEditMember(m)}
              onToggleRole={handleToggleMemberRole}
              isChurchMode={isChurchMode}
            />
          )}
        />
      )}

      {/* ─── TAB 2: FEATURE PASS ACCESS MANAGEMENT ─────────────────────────── */}
      {viewMode === 'feature_pass' && (
        <FlashListAny
          data={featurePassMembers}
          keyExtractor={(item: Member) => `pass_${item.id}`}
          estimatedItemSize={72}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} colors={['#7c3aed']} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#7c3aed" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="key-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Singers Found</Text>
                <Text style={styles.emptySub}>Search for a singer or tap "+ Add Email" to grant passes.</Text>
              </View>
            )
          }
          renderItem={({ item }: { item: Member }) => (
            <MemberFeaturePassItem item={item} onTogglePass={handleTogglePass} />
          )}
        />
      )}

      {/* ─── ADD EMAIL MODAL ──────────────────────────────────────────────── */}
      <AddEmailPassModal
        visible={addEmailModalVisible}
        onClose={() => setAddEmailModalVisible(false)}
        email={targetEmailInput}
        onChangeEmail={setTargetEmailInput}
        onSubmit={handleGrantEmailPass}
        loading={addingEmailLoading}
      />

      {/* ─── SINGER ATTENDANCE QR BADGE MODAL ────────────────────────────── */}
      <SingerAttendanceBadgeModal
        visible={Boolean(selectedBadgeMember)}
        member={selectedBadgeMember}
        onClose={() => setSelectedBadgeMember(null)}
      />

      {/* ─── EDIT MEMBER DETAILS MODAL ────────────────────────────────────── */}
      <EditMemberModal
        visible={Boolean(selectedEditMember)}
        member={selectedEditMember}
        onClose={() => setSelectedEditMember(null)}
        onSave={handleSaveMemberDetails}
        loading={editMemberLoading}
        isChurchMode={isChurchMode}
      />

      {/* ─── MEMBER EXPORT MODAL ────────────────────────────────────────── */}
      <MemberExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExport}
        memberCount={filteredMembers.length}
      />

      {/* ─── ADD SINGER TO CHURCH MODAL (CHURCH MODE) ───────────────────── */}
      <Modal visible={addChurchMemberModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>
                    Add Singer to {activeChurch?.name || 'Church'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Select registered singers from {activeZone?.name || 'your zone'} directory
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setAddChurchMemberModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 42, marginBottom: 12 }}>
                <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 13, color: '#0f172a' }}
                  placeholder="Search zone singers by name or email..."
                  placeholderTextColor="#94a3b8"
                  value={directorySearch}
                  onChangeText={setDirectorySearch}
                  autoCapitalize="none"
                />
              </View>

              {loadingDirectory ? (
                <ActivityIndicator size="large" color="#7c3aed" style={{ marginVertical: 24 }} />
              ) : (
                <FlatList
                  data={zoneDirectory.filter(p => {
                    const pid = p.userId || p.id;
                    const alreadyInChurch = members.some(m => m.id === pid);
                    if (alreadyInChurch) return false;
                    if (!directorySearch.trim()) return true;
                    const q = directorySearch.toLowerCase();
                    const fullName = `${p.first_name || p.firstName || ''} ${p.last_name || p.lastName || ''}`.toLowerCase();
                    return fullName.includes(q) || (p.email && p.email.toLowerCase().includes(q));
                  })}
                  keyExtractor={p => p.userId || p.id}
                  style={{ maxHeight: 360 }}
                  renderItem={({ item: person }) => {
                    const pid = person.userId || person.id;
                    const fullName = `${person.first_name || person.firstName || 'Singer'} ${person.last_name || person.lastName || ''}`.trim();
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                            {fullName}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }} numberOfLines={1}>
                            {person.email || person.voicePart || 'Zone Singer'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{ backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 }}
                          onPress={() => handleAddSingerToChurch(pid)}
                          disabled={addingSingerId === pid}
                          activeOpacity={0.8}
                        >
                          {addingSingerId === pid ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>+ Add</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>
                      No additional zone singers found matching your search.
                    </Text>
                  }
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
