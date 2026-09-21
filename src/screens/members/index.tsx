import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Share,
  ActivityIndicator,
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

const FlashListAny = FlashList as any;

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { isChurchMode, activeChurch, activeZone } = useZoneContext();
  const { members, loading, refreshing, refetch, saveMember, hasMore, loadingMore, loadMore, total } = useMembers();

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
            <Text style={styles.countBadgeText}>
              {search.trim() ? filteredMembers.length : (total > 0 ? total : filteredMembers.length)}
            </Text>
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
          renderItem={({ item }: { item: Member }) => <MemberListItem item={item} />}
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
    </SafeAreaView>
  );
}
