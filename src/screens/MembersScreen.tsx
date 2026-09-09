import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Share,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useZoneContext } from '../context/ZoneContext';
import MemberManagementModal from '../components/MemberManagementModal';
import { useMembers, Member } from '../hooks/useMembers';

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const { isChurchMode, activeChurch } = useZoneContext();
  const { members, loading, refreshing, refetch, approve, reject, saveMember, removeFromZone } = useMembers();

  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'singers' | 'admins'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const approvedMembers = useMemo(() => members.filter(m => !m.pending_hq_approval), [members]);
  const pendingMembers = useMemo(() => members.filter(m => !!m.pending_hq_approval), [members]);

  const filteredMembers = useMemo(() => {
    let list = approvedMembers;
    if (roleFilter === 'singers') list = list.filter(m => m.role === 'member' && !m.isAdmin);
    else if (roleFilter === 'admins') list = list.filter(m => m.role === 'zone_admin' || m.role === 'church_admin' || m.role === 'hq_admin' || m.isAdmin);
    if (search.trim()) {
      const q = search.toLowerCase().trim().replace(/^@/, '');
      list = list.filter(m =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        (m.alias || '').toLowerCase().includes(q) ||
        (m.church || '').toLowerCase().includes(q) ||
        (m.zoneName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [approvedMembers, roleFilter, search]);

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
      await Share.share({ title: 'Loveworld Singers Directory', message: csvContent });
    } catch {
      Alert.alert('Export Ready', `${filteredMembers.length} records.`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {isChurchMode ? `${activeChurch?.name || 'Church'} Members` : 'Members'}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{approvedMembers.length}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleExportCSV} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="download-outline" size={18} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={refetch} activeOpacity={0.7} disabled={refreshing} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh" size={18} color="#7c3aed" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab switcher — only shown if there are pending members */}
      {pendingMembers.length > 0 && (
        <View style={styles.tabContainer}>
          {[
            { id: 'all', label: `All (${approvedMembers.length})` },
            { id: 'pending', label: `Pending (${pendingMembers.length})` },
          ].map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabBtn, activeTab === t.id && (t.id === 'pending' ? styles.tabBtnActiveAmber : styles.tabBtnActive)]}
              onPress={() => setActiveTab(t.id as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search + role filter */}
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
            {(['all', 'singers', 'admins'] as const).map(id => (
              <TouchableOpacity
                key={id}
                style={[styles.rolePill, roleFilter === id && styles.rolePillActive]}
                onPress={() => setRoleFilter(id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rolePillText, roleFilter === id && styles.rolePillTextActive]}>
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={activeTab === 'pending' ? pendingMembers : filteredMembers}
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
                  <Text style={styles.subtitleText} numberOfLines={1}>{item.church || item.zoneName || 'Applicant'}</Text>
                </View>
                <View style={styles.pendingBtnRow}>
                  <TouchableOpacity style={styles.declineIconBtn} onPress={() => reject(item)} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color="#ef4444" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveIconBtn} onPress={() => approve(item)} activeOpacity={0.7}>
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          const fullName = `${item.first_name} ${item.last_name}`.trim();
          const initial = `${item.first_name[0] || 'M'}${item.last_name[0] || ''}`.toUpperCase();
          const isChurchAdmin = item.role === 'church_admin';
          const isZoneAdmin = item.role === 'zone_admin' || item.role === 'hq_admin' || (item.isAdmin && !isChurchAdmin);

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { setSelectedMember(item); setModalVisible(true); }}
              style={styles.memberCard}
            >
              <View style={styles.memberCardRow}>
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
                  <Text style={styles.nameText} numberOfLines={1}>{fullName}</Text>
                  <Text style={styles.subtitleText} numberOfLines={1}>{item.church || item.zoneName || 'Choir Member'}</Text>
                </View>
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

      <MemberManagementModal
        visible={modalVisible}
        member={selectedMember}
        onClose={() => { setModalVisible(false); setSelectedMember(null); }}
        onSave={saveMember}
        onRemove={removeFromZone}
        onApprove={approve}
        onReject={reject}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, backgroundColor: '#ffffff' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  countBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  tabContainer: { flexDirection: 'row', marginHorizontal: 16, marginTop: 6, marginBottom: 8, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  tabBtnActiveAmber: { backgroundColor: '#f59e0b' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#0f172a', fontWeight: '800' },
  filterBar: { paddingHorizontal: 16, marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 38, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', padding: 0 },
  rolePillsRow: { flexDirection: 'row', gap: 6 },
  rolePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  rolePillActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  rolePillText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  rolePillTextActive: { color: '#ffffff', fontWeight: '800' },
  listContent: { paddingHorizontal: 16, paddingTop: 2, gap: 8 },
  memberCard: { backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  memberCardRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatarImg: { width: 42, height: 42, borderRadius: 14 },
  avatarInitialWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  avatarInitialText: { fontSize: 15, fontWeight: '800', color: '#7c3aed' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#ffffff' },
  memberMeta: { flex: 1, marginRight: 8 },
  nameText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  subtitleText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  roleBadgeZone: { backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  roleTextZone: { fontSize: 10, fontWeight: '800', color: '#7c3aed' },
  roleBadgeChurch: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  roleTextChurch: { fontSize: 10, fontWeight: '800', color: '#0284c7' },
  pendingCard: { backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#fde68a', flexDirection: 'row', alignItems: 'center' },
  pendingAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  pendingAvatarText: { fontSize: 14, fontWeight: '800', color: '#d97706' },
  pendingBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  declineIconBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  approveIconBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 10 },
});
