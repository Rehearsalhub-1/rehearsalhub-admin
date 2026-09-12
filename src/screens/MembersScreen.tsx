import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Share,
  Image,
  ActivityIndicator,
  Switch,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useZoneContext } from '../context/ZoneContext';
import { useMembers, Member } from '../hooks/useMembers';
import { useAlert } from '../context/AlertContext';
import { api } from '../services/api';

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { isChurchMode, activeChurch, activeZone } = useZoneContext();
  const { members, loading, refreshing, refetch, approve, reject, saveMember } = useMembers();

  // Top-level View Mode: 'directory' vs 'feature_pass'
  const [viewMode, setViewMode] = useState<'directory' | 'feature_pass'>('directory');
  const [search, setSearch] = useState('');

  // Add Email Modal for Feature Pass
  const [addEmailModalVisible, setAddEmailModalVisible] = useState(false);
  const [targetEmailInput, setTargetEmailInput] = useState('');
  const [addingEmailLoading, setAddingEmailLoading] = useState(false);

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
    async (member: Member, featureKey: 'can_access_archive' | 'can_access_ongoing' | 'can_access_pre_rehearsal' | 'canAnnotate') => {
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

  const handleExportCSV = async () => {
    const headers = ['Name', 'Email', 'Role', 'Zone', 'Church', 'Archive', 'Ongoing', 'Pre-Reh', 'Annotate'];
    const rows = filteredMembers.map(m => [
      `"${m.first_name} ${m.last_name}"`,
      `"${m.email}"`,
      `"${m.role === 'hq_admin' ? 'HQ Admin' : m.role === 'church_admin' ? 'Church Admin' : m.role === 'zone_admin' ? 'Zone Admin' : 'Singer'}"`,
      `"${m.zoneName || ''}"`,
      `"${m.church || ''}"`,
      m.can_access_archive ? 'YES' : 'NO',
      m.can_access_ongoing ? 'YES' : 'NO',
      m.can_access_pre_rehearsal ? 'YES' : 'NO',
      m.canAnnotate ? 'YES' : 'NO',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    try {
      await Share.share({ title: 'Loveworld Singers Directory', message: csvContent });
    } catch {
      showAlert('Export Ready', `${filteredMembers.length} records exported.`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {isChurchMode ? `${activeChurch?.name || 'Church'} Members` : (activeZone?.name || 'Loveworld Singers HQ')}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredMembers.length}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleExportCSV}
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

      {/* Two-Tab Navigation Switcher */}
      <View style={styles.modeSegmentWrap}>
        <TouchableOpacity
          style={[styles.modeSegmentBtn, viewMode === 'directory' && styles.modeSegmentBtnActive]}
          onPress={() => setViewMode('directory')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={viewMode === 'directory' ? '#7c3aed' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.modeSegmentText, viewMode === 'directory' && styles.modeSegmentTextActive]}>
            Members Directory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeSegmentBtn, viewMode === 'feature_pass' && styles.modeSegmentBtnActive]}
          onPress={() => setViewMode('feature_pass')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="key-outline"
            size={16}
            color={viewMode === 'feature_pass' ? '#7c3aed' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.modeSegmentText, viewMode === 'feature_pass' && styles.modeSegmentTextActive]}>
            Feature Pass
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={viewMode === 'directory' ? 'Search members by name or email...' : 'Filter passes by name or email...'}
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {viewMode === 'feature_pass' && (
          <TouchableOpacity
            style={styles.addPassBtn}
            onPress={() => setAddEmailModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addPassBtnText}>Add Email</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── TAB 1: MEMBERS DIRECTORY ──────────────────────────────────────── */}
      {viewMode === 'directory' && (
        <FlashList
          data={filteredMembers}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} colors={['#7c3aed']} />}
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
          renderItem={({ item }) => {
            const fullName = `${item.first_name} ${item.last_name}`.trim();
            const initial = `${item.first_name[0] || 'S'}${item.last_name[0] || ''}`.toUpperCase();

            // Accurate role determination
            const isHQ = item.role === 'hq_admin';
            const isChurch = item.role === 'church_admin';
            const isZone = item.role === 'zone_admin' || item.role === 'zone_coordinator';

            return (
              <View style={styles.memberCard}>
                <View style={styles.avatarWrap}>
                  {item.profile_image_url ? (
                    <Image source={{ uri: item.profile_image_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarInitialWrap}>
                      <Text style={styles.avatarInitialText}>{initial}</Text>
                    </View>
                  )}
                  {item.is_active && <View style={styles.onlineDot} />}
                </View>

                <View style={styles.memberMeta}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.nameText} numberOfLines={1}>
                      {fullName}
                    </Text>
                    {isHQ ? (
                      <View style={styles.roleBadgeHq}>
                        <Text style={styles.roleTextHq}>HQ Admin</Text>
                      </View>
                    ) : isChurch ? (
                      <View style={styles.roleBadgeChurch}>
                        <Text style={styles.roleTextChurch}>Church Admin</Text>
                      </View>
                    ) : isZone ? (
                      <View style={styles.roleBadgeZone}>
                        <Text style={styles.roleTextZone}>Zone Admin</Text>
                      </View>
                    ) : (
                      <View style={styles.roleBadgeSinger}>
                        <Text style={styles.roleTextSinger}>Singer</Text>
                      </View>
                    )}
                  </View>

                  {item.email ? (
                    <Text style={styles.emailText} numberOfLines={1}>
                      {item.email}
                    </Text>
                  ) : null}

                  <Text style={styles.subtitleText} numberOfLines={1}>
                    {[item.church || item.zoneName, item.designation].filter(Boolean).join(' • ') || 'Loveworld Singers Member'}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ─── TAB 2: FEATURE PASS ACCESS MANAGEMENT ─────────────────────────── */}
      {viewMode === 'feature_pass' && (
        <FlashList
          data={featurePassMembers}
          keyExtractor={item => `pass_${item.id}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} colors={['#7c3aed']} />}
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
          renderItem={({ item }) => {
            const fullName = `${item.first_name} ${item.last_name}`.trim();
            const archiveOn = Boolean(item.can_access_archive);
            const ongoingOn = Boolean(item.can_access_ongoing !== false);
            const preRehOn = Boolean(item.can_access_pre_rehearsal);
            const annotateOn = Boolean(item.canAnnotate);

            return (
              <View style={styles.passCard}>
                {/* Header: Member info */}
                <View style={styles.passCardHeader}>
                  <View style={styles.passCardInfo}>
                    <Text style={styles.passCardName} numberOfLines={1}>
                      {fullName}
                    </Text>
                    <Text style={styles.passCardEmail} numberOfLines={1}>
                      {item.email || 'No email registered'}
                    </Text>
                  </View>
                </View>

                {/* Direct 4-Switch Toggles */}
                <View style={styles.passTogglesRow}>
                  {/* Archive Pass */}
                  <View style={styles.passToggleItem}>
                    <Text style={[styles.passToggleLabel, archiveOn && styles.passToggleLabelActive]}>
                      Archive
                    </Text>
                    <Switch
                      value={archiveOn}
                      onValueChange={() => handleTogglePass(item, 'can_access_archive')}
                      trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
                      thumbColor="#ffffff"
                      style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
                    />
                  </View>

                  {/* Ongoing Pass */}
                  <View style={styles.passToggleItem}>
                    <Text style={[styles.passToggleLabel, ongoingOn && styles.passToggleLabelActive]}>
                      Ongoing
                    </Text>
                    <Switch
                      value={ongoingOn}
                      onValueChange={() => handleTogglePass(item, 'can_access_ongoing')}
                      trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                      thumbColor="#ffffff"
                      style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
                    />
                  </View>

                  {/* Pre-Rehearsal Pass */}
                  <View style={styles.passToggleItem}>
                    <Text style={[styles.passToggleLabel, preRehOn && styles.passToggleLabelActive]}>
                      Pre-Reh
                    </Text>
                    <Switch
                      value={preRehOn}
                      onValueChange={() => handleTogglePass(item, 'can_access_pre_rehearsal')}
                      trackColor={{ false: '#e2e8f0', true: '#f59e0b' }}
                      thumbColor="#ffffff"
                      style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
                    />
                  </View>

                  {/* Annotation Pass */}
                  <View style={styles.passToggleItem}>
                    <Text style={[styles.passToggleLabel, annotateOn && styles.passToggleLabelActive]}>
                      Annotate
                    </Text>
                    <Switch
                      value={annotateOn}
                      onValueChange={() => handleTogglePass(item, 'canAnnotate')}
                      trackColor={{ false: '#e2e8f0', true: '#0284c7' }}
                      thumbColor="#ffffff"
                      style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
                    />
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ─── ADD EMAIL MODAL ──────────────────────────────────────────────── */}
      <Modal visible={addEmailModalVisible} transparent animationType="fade" onRequestClose={() => setAddEmailModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grant Feature Pass by Email</Text>
              <TouchableOpacity onPress={() => setAddEmailModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter the singer's registered email address to instantly grant them full access to Archive, Ongoing, Pre-Rehearsal, and Annotation.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="singer@loveworldsingers.org"
              placeholderTextColor="#94a3b8"
              value={targetEmailInput}
              onChangeText={setTargetEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddEmailModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, addingEmailLoading && styles.btnDisabled]}
                onPress={handleGrantEmailPass}
                disabled={addingEmailLoading}
                activeOpacity={0.8}
              >
                {addingEmailLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Grant Pass</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7c3aed',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mode segment switcher
  modeSegmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeSegmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  modeSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  modeSegmentTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  addPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
  },
  addPassBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  // Member card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e2e8f0',
  },
  avatarInitialWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7c3aed',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  memberMeta: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  roleBadgeSinger: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  roleTextSinger: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  roleBadgeZone: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  roleTextZone: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338ca',
  },
  roleBadgeChurch: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  roleTextChurch: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  roleBadgeHq: {
    backgroundColor: '#fce7f3',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  roleTextHq: {
    fontSize: 10,
    fontWeight: '700',
    color: '#be185d',
  },
  emailText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  // Feature Pass card
  passCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    gap: 12,
  },
  passCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passCardInfo: {
    flex: 1,
  },
  passCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  passCardEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  passTogglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  passToggleItem: {
    alignItems: 'center',
    gap: 4,
  },
  passToggleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  passToggleLabelActive: {
    color: '#0f172a',
  },
  // Add Email Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalDescription: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
