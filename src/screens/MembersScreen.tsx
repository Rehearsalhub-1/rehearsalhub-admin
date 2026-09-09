import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  RefreshControl,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MemberManagementModal, { Member } from '../components/MemberManagementModal';
import { api } from '../services/api';
import { useZoneContext } from '../context/ZoneContext';

const INITIAL_MEMBERS: Member[] = [];

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const { activeZone, isAllZones } = useZoneContext();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs: 'all' | 'pending'
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  // Simple Filter: All, Singers, Admins
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'singers' | 'admins'>('all');

  // Selected Member for Edit Drawer
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const effectiveZoneId = isAllZones ? undefined : (activeZone?.id || undefined);
      const [dirRes, reqRes] = await Promise.all([
        api.members.getDirectory(effectiveZoneId).catch(() => ({ data: [] })),
        api.members.getAdminRequests(effectiveZoneId).catch(() => ({ data: [] })),
      ]);

      const rawDir = Array.isArray(dirRes?.data) ? dirRes.data : [];
      const rawReqs = Array.isArray(reqRes?.data) ? reqRes.data : [];

      const mappedMembers: Member[] = rawDir.map((u: any) => {
        const firstName = u.firstName || u.first_name || (u.name || '').split(' ')[0] || 'Singer';
        const lastName = u.lastName || u.last_name || (u.name || '').split(' ').slice(1).join(' ') || '';
        const r = (u.role || 'member').toLowerCase();
        return {
          id: u.id || u.userId,
          membershipId: u.membershipId || u.membership_id || u.id,
          first_name: firstName,
          last_name: lastName,
          email: u.email || '',
          username: u.username || '',
          alias: u.alias || '',
          phone: u.phone || '',
          church: u.church || u.churchName || '',
          designation: u.designation || '',
          zoneId: u.zoneId || u.organizationId || '',
          zoneName: u.zoneName || u.organization?.name || '',
          role: (r.includes('admin') || r === 'boss'
            ? (r.includes('church') ? 'church_admin' : (r.includes('hq') ? 'hq_admin' : 'zone_admin'))
            : 'member') as any,
          isAdmin: r.includes('admin') || r === 'boss',
          is_active: u.is_active !== false && u.isActive !== false,
          can_access_ongoing: u.can_access_ongoing !== false,
          can_access_pre_rehearsal: u.can_access_pre_rehearsal !== false,
          canAnnotate: u.canAnnotate !== false,
          canSeeArchive: u.canSeeArchive === true || u.canAccessArchive === true,
          can_access_archive: u.canSeeArchive === true || u.canAccessArchive === true,
          hiddenFeatures: u.hiddenFeatures,
          created_at: u.createdAt || u.created_at,
          pending_hq_approval: false,
        };
      });

      const mappedPending: Member[] = rawReqs.map((req: any) => {
        const firstName = req.user?.firstName || req.firstName || (req.name || '').split(' ')[0] || 'Applicant';
        const lastName = req.user?.lastName || req.lastName || (req.name || '').split(' ').slice(1).join(' ') || '';
        return {
          id: req.id || req.userId,
          membershipId: req.membershipId || req.id,
          first_name: firstName,
          last_name: lastName,
          email: req.user?.email || req.email || '',
          username: req.user?.username || req.username || '',
          alias: req.user?.alias || req.alias || '',
          phone: req.user?.phone || req.phone || '',
          church: req.church || '',
          zoneId: req.zoneId || '',
          zoneName: req.zoneName || '',
          role: 'member' as any,
          isAdmin: false,
          is_active: false,
          pending_hq_approval: true,
          created_at: req.createdAt || req.created_at,
        };
      });

      const existingIds = new Set(mappedMembers.map(m => m.id));
      const combined = [
        ...mappedMembers,
        ...mappedPending.filter(p => !existingIds.has(p.id)),
      ];
      setMembers(combined);
    } catch (err) {
      console.warn('[MembersScreen] fetch error:', err);
      setMembers([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [activeZone?.id, isAllZones]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMembers();
  };

  // Approved vs Pending
  const approvedMembers = useMemo(() => {
    return members.filter(m => !m.pending_hq_approval);
  }, [members]);

  const pendingMembers = useMemo(() => {
    return members.filter(m => !!m.pending_hq_approval);
  }, [members]);

  // Filtered List
  const filteredMembers = useMemo(() => {
    let list = approvedMembers;

    if (roleFilter === 'singers') {
      list = list.filter(m => m.role === 'member' && !m.isAdmin);
    } else if (roleFilter === 'admins') {
      list = list.filter(
        m => m.role === 'zone_admin' || m.role === 'church_admin' || m.role === 'hq_admin' || m.isAdmin
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim().replace(/^@/, '');
      list = list.filter(m => {
        const full = `${m.first_name} ${m.last_name}`.toLowerCase();
        return (
          full.includes(q) ||
          (m.alias || '').toLowerCase().includes(q) ||
          (m.church || '').toLowerCase().includes(q) ||
          (m.zoneName || '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [approvedMembers, roleFilter, search]);

  // Approve Pending Request
  const handleApprove = async (member: Member) => {
    setMembers(prev =>
      prev.map(m =>
        m.id === member.id ? { ...m, pending_hq_approval: false, is_active: true } : m
      )
    );
    try {
      await Promise.all([
        api.members.approve(member.id).catch(() => {}),
        api.members.approveAdminRequest(member.id).catch(() => {}),
      ]);
    } catch (e) {
      console.warn('Approval sync note:', e);
    }
    Alert.alert('Approved', `${member.first_name} ${member.last_name} has been approved.`);
  };

  // Reject Pending Request
  const handleReject = (member: Member) => {
    Alert.alert(
      'Decline Request',
      `Decline join request from ${member.first_name} ${member.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setMembers(prev => prev.filter(m => m.id !== member.id));
            try {
              await Promise.all([
                api.members.reject(member.id).catch(() => {}),
                api.members.rejectAdminRequest(member.id).catch(() => {}),
              ]);
            } catch (e) {
              console.warn('Decline sync note:', e);
            }
          },
        },
      ]
    );
  };

  // Save Member Profile Edits
  const handleSaveMember = async (updated: Member) => {
    setMembers(prev => prev.map(m => (m.id === updated.id ? updated : m)));
    try {
      if (updated.role) {
        await api.members.updateRole(updated.id, updated.role).catch(() => {});
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
      }).catch(() => {});
    } catch (err) {
      console.warn('Failed to persist member profile update:', err);
    }
  };

  // Remove Member
  const handleRemoveFromZone = (id: string) => {
    const target = members.find(m => m.id === id);
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${target?.first_name || 'this member'} from the zone directory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setMembers(prev => prev.filter(m => m.id !== id));
            await api.members.removeFromZone(id).catch(() => {});
            Alert.alert('Removed', `${target?.first_name || 'Member'} was removed.`);
          },
        },
      ]
    );
  };

  // Export Directory to CSV
  const handleExportCSV = async () => {
    const headers = ['Name', 'Email', 'Role', 'Zone', 'Church'];
    const rows = filteredMembers.map(m => [
      `"${m.first_name} ${m.last_name}"`,
      `"${m.email}"`,
      `"${m.role === 'church_admin' ? 'Church Admin' : m.isAdmin || m.role === 'zone_admin' || m.role === 'hq_admin' ? 'Zone Admin' : 'Singer'}"`,
      `"${m.zoneName || ''}"`,
      `"${m.church || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    try {
      await Share.share({
        title: 'Loveworld Singers Directory',
        message: csvContent,
      });
    } catch {
      Alert.alert('Export Ready', `${filteredMembers.length} records.`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── 1. Minimal Executive Header ───────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Members</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{approvedMembers.length}</Text>
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
            onPress={onRefresh}
            activeOpacity={0.7}
            disabled={refreshing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh" size={18} color="#7c3aed" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. Tab Switcher (Only if there are pending applicants) ───── */}
      {pendingMembers.length > 0 && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All ({approvedMembers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActiveAmber]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending ({pendingMembers.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 3. Ultra-Clean Search & Role Chips ────────────────────────── */}
      {activeTab === 'all' && (
        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search members..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.rolePillsRow}>
            {[
              { id: 'all', label: 'All' },
              { id: 'singers', label: 'Singers' },
              { id: 'admins', label: 'Admins' },
            ].map(pill => {
              const isSelected = roleFilter === pill.id;
              return (
                <TouchableOpacity
                  key={pill.id}
                  style={[styles.rolePill, isSelected && styles.rolePillActive]}
                  onPress={() => setRoleFilter(pill.id as any)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.rolePillText, isSelected && styles.rolePillTextActive]}>
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── 4. High-Clarity Member List ───────────────────────────────── */}
      <FlatList
        data={activeTab === 'pending' ? pendingMembers : filteredMembers}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Members Found</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          if (activeTab === 'pending') {
            return (
              <View style={styles.pendingCard}>
                <View style={styles.pendingAvatar}>
                  <Text style={styles.pendingAvatarText}>
                    {`${item.first_name[0] || 'U'}${item.last_name[0] || ''}`.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.memberMeta}>
                  <Text style={styles.nameText}>{item.first_name} {item.last_name}</Text>
                  <Text style={styles.subtitleText} numberOfLines={1}>
                    {item.church || item.zoneName || 'Applicant'}
                  </Text>
                </View>

                <View style={styles.pendingBtnRow}>
                  <TouchableOpacity
                    style={styles.declineIconBtn}
                    onPress={() => handleReject(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={18} color="#ef4444" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveIconBtn}
                    onPress={() => handleApprove(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          // Approved Member Row
          const fullName = `${item.first_name} ${item.last_name}`.trim();
          const initial = `${item.first_name[0] || 'M'}${item.last_name[0] || ''}`.toUpperCase();
          const isChurchAdmin = item.role === 'church_admin';
          const isZoneAdmin =
            item.role === 'zone_admin' || item.role === 'hq_admin' || (item.isAdmin && !isChurchAdmin);

          const subtitle = item.church || item.zoneName || 'Choir Member';

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setSelectedMember(item);
                setModalVisible(true);
              }}
              style={styles.memberCard}
            >
              <View style={styles.memberCardRow}>
                {/* Avatar with subtle live dot */}
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

                {/* Member Details: Just Name & Subtitle */}
                <View style={styles.memberMeta}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {fullName}
                  </Text>
                  <Text style={styles.subtitleText} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>

                {/* Right Side: Role Badge ONLY if Admin */}
                {isZoneAdmin && (
                  <View style={styles.roleBadgeZone}>
                    <Text style={styles.roleTextZone}>Zone Admin</Text>
                  </View>
                )}
                {isChurchAdmin && (
                  <View style={styles.roleBadgeChurch}>
                    <Text style={styles.roleTextChurch}>Church Admin</Text>
                  </View>
                )}

                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Simplified Member Management Drawer Modal */}
      <MemberManagementModal
        visible={modalVisible}
        member={selectedMember}
        onClose={() => {
          setModalVisible(false);
          setSelectedMember(null);
        }}
        onSave={handleSaveMember}
        onRemove={handleRemoveFromZone}
        onApprove={handleApprove}
        onReject={handleReject}
      />
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnActiveAmber: {
    backgroundColor: '#f59e0b',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  filterBar: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  rolePillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rolePillActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  rolePillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    gap: 8,
  },
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  avatarInitialWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#f5f3ff',
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
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  memberMeta: {
    flex: 1,
    marginRight: 8,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitleText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  roleBadgeZone: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  roleTextZone: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7c3aed',
  },
  roleBadgeChurch: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  roleTextChurch: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
  },
  pendingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pendingAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#d97706',
  },
  pendingBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  declineIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
  },
});
