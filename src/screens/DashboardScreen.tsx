import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';
import ZoneHeader from '../components/ZoneHeader';
import { StatTile, Badge } from '../components/ui';
import { useDashboardData } from '../hooks/useDashboardData';
import { customAlert } from '../context/AlertContext';

export default function DashboardScreen({ navigation }: any) {
  const { adminUser } = useAuth();
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();
  const { stats, recentPrograms, members, loading, refreshing, refetch } = useDashboardData();

  const [memberSearch, setMemberSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const invitationCode =
    (activeZone as any)?.code || (activeZone as any)?.invitationCode || 'LZ1-HQ';

  const copyInviteCode = () => {
    setCopiedCode(true);
    customAlert(
      'Join Code Copied',
      `Zonal code: ${invitationCode}\nShare this with singers to join your directory.`
    );
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 5);
    const q = memberSearch.toLowerCase().trim();
    return members
      .filter(m => {
        const name = `${m.first_name} ${m.last_name}`.toLowerCase();
        const des = (m.designation || '').toLowerCase();
        const church = (m.church || '').toLowerCase();
        return name.includes(q) || des.includes(q) || church.includes(q);
      })
      .slice(0, 5);
  }, [members, memberSearch]);

  const rawZoneName = activeZone?.name;
  const cleanZoneName =
    rawZoneName && rawZoneName.toLowerCase() !== 'central admin'
      ? rawZoneName
      : 'Assigned Zone';

  const liveScopeTitle = isChurchMode
    ? `${activeChurch?.name || 'Church Choir'} • Live Scope`
    : `${cleanZoneName} • Live Metrics`;

  const formatRoleTag = (role: string) => {
    switch (role) {
      case 'hq_admin': return 'HQ Admin';
      case 'zone_admin':
      case 'zone_coordinator': return 'Zonal Coord';
      case 'church_admin':
      case 'church_coordinator': return 'Church Coord';
      default: return 'Singer';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Admin Dashboard" showBack={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.accent} colors={[Colors.accent]} />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingBox}>
          <Text style={styles.greetingName}>
            Welcome, {adminUser?.name ? adminUser.name.split(' ')[0] : 'Director'} 👋
          </Text>
          <Text style={styles.greetingSub}>Loveworld Singers Executive Administration Portal</Text>
        </View>

        {/* Scope Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveScopeText} numberOfLines={1}>{liveScopeTitle}</Text>
          </View>
          <View style={styles.toolbarBtnsRow}>
            <TouchableOpacity style={styles.joinCodeBtn} onPress={copyInviteCode} activeOpacity={0.7}>
              <Ionicons name={copiedCode ? 'checkmark' : 'copy-outline'} size={13} color="#7c3aed" style={{ marginRight: 4 }} />
              <Text style={styles.joinCodeBtnText}>{copiedCode ? 'Copied' : `Code: ${invitationCode}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newProgBtn} onPress={() => navigation.navigate('Programs')} activeOpacity={0.8}>
              <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
              <Text style={styles.newProgBtnText}>New Program</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <StatTile
              label={isChurchMode ? 'Church Members' : 'Zone Members'}
              value={stats.totalMembers}
              icon="people"
              color="#4f46e5"
              badgeLabel="DIRECTORY"
              subtitle="Registered singers"
              onPress={() => navigation.navigate('Members')}
            />
            <StatTile
              label="Programs"
              value={stats.activePrograms}
              icon="calendar"
              color="#7c3aed"
              badgeLabel="REHEARSALS"
              subtitle="All rehearsal sets"
              onPress={() => navigation.navigate('Programs')}
            />
          </View>
          <View style={styles.kpiRow}>
            <StatTile
              label="Ministered Songs"
              value={stats.totalSongs}
              icon="musical-notes"
              color="#d97706"
              badgeLabel="CATALOG"
              subtitle="Master repertoire"
              onPress={() => navigation.navigate('MasterLibrary')}
            />
            <StatTile
              label="Pending Reviews"
              value={stats.pendingSongs}
              icon="cloud-upload"
              color="#e11d48"
              badgeLabel={stats.pendingSongs > 0 ? 'ACTION NEEDED' : 'ALL CLEAR'}
              subtitle="Song submissions"
              onPress={() => navigation.navigate('SubmittedSongs')}
            />
          </View>
        </View>

        {/* Recent Programs */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Programs</Text>
              <Text style={styles.sectionSubtitle}>Active & upcoming rehearsal setlists</Text>
            </View>
            <TouchableOpacity style={styles.viewAllLink} onPress={() => navigation.navigate('Programs')} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={12} color="#7c3aed" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.programsList}>
            {loading ? (
              <View style={styles.emptyInlineCard}>
                <ActivityIndicator size="small" color="#7c3aed" />
              </View>
            ) : recentPrograms.length === 0 ? (
              <View style={styles.emptyInlineCard}>
                <Ionicons name="calendar-outline" size={24} color="#94a3b8" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyInlineTitle}>No Programs Yet</Text>
                <Text style={styles.emptyInlineSub}>
                  Tap "New Program" above to create your first rehearsal setlist.
                </Text>
              </View>
            ) : (
              recentPrograms.map(prog => {
                const isOngoing = prog.status === 'ongoing' || prog.category === 'ongoing';
                const initial = (prog.name || 'P').charAt(0).toUpperCase();
                return (
                  <TouchableOpacity
                    key={prog.id}
                    style={styles.programCard}
                    onPress={() => navigation.navigate('ProgramSongs', { program: prog })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.programAvatar, isOngoing && styles.programAvatarOngoing]}>
                      <Text style={[styles.programAvatarText, isOngoing && styles.programAvatarTextOngoing]}>{initial}</Text>
                    </View>
                    <View style={styles.programInfo}>
                      <Text style={styles.programName} numberOfLines={1}>{prog.name}</Text>
                      <View style={styles.programMetaRow}>
                        <Ionicons name="time-outline" size={12} color="#94a3b8" style={{ marginRight: 3 }} />
                        <Text style={styles.programMetaText}>{prog.date || 'Date TBD'}</Text>
                        {prog.category ? <Text style={styles.programCategoryTag}>• {prog.category}</Text> : null}
                      </View>
                    </View>
                    <View style={styles.programRight}>
                      <Badge label={isOngoing ? 'Active' : 'Archived'} variant={isOngoing ? 'ongoing' : 'draft'} size="sm" />
                      <Ionicons name="chevron-forward" size={14} color="#cbd5e1" style={{ marginLeft: 4 }} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* Members Directory Preview */}
        <View style={[styles.sectionBox, { marginBottom: 30 }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Members Directory</Text>
              <Text style={styles.sectionSubtitle}>
                {stats.totalMembers > 0
                  ? `${stats.totalMembers} singers registered`
                  : 'Registered singers appear here'}
              </Text>
            </View>
            <TouchableOpacity style={styles.viewAllLink} onPress={() => navigation.navigate('Members')} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={12} color="#7c3aed" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search singers..."
              placeholderTextColor="#94a3b8"
              value={memberSearch}
              onChangeText={setMemberSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {memberSearch.length > 0 && (
              <TouchableOpacity onPress={() => setMemberSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={15} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.membersList}>
            {loading ? (
              <View style={styles.emptyInlineCard}>
                <ActivityIndicator size="small" color="#7c3aed" />
              </View>
            ) : filteredMembers.length === 0 ? (
              <View style={styles.emptyInlineCard}>
                <Ionicons name="people-outline" size={24} color="#94a3b8" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyInlineTitle}>
                  {memberSearch ? 'No matching singers' : 'No Members Yet'}
                </Text>
                <Text style={styles.emptyInlineSub}>
                  {memberSearch
                    ? `No singers found for "${memberSearch}". Try a different name.`
                    : 'Singers who join your zone will appear here.'}
                </Text>
              </View>
            ) : (
              filteredMembers.map(m => {
                const fullName = `${m.first_name} ${m.last_name}`.trim();
                const initials = `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}`.toUpperCase() || 'S';
                const isLead = m.role !== 'member';
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.memberRow}
                    onPress={() => navigation.navigate('Members')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.memberAvatar, isLead && styles.memberAvatarLead]}>
                      <Text style={[styles.memberAvatarText, isLead && styles.memberAvatarTextLead]}>{initials}</Text>
                      {m.is_active && <View style={styles.onlineDot} />}
                    </View>
                    <View style={styles.memberMeta}>
                      <Text style={styles.memberName} numberOfLines={1}>{fullName}</Text>
                      <Text style={styles.memberSub} numberOfLines={1}>
                        {[m.designation, m.church].filter(Boolean).join(' • ') || 'Choir Member'}
                      </Text>
                    </View>
                    <Badge label={formatRoleTag(m.role)} variant={isLead ? 'alto' : 'ongoing'} size="sm" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  greetingBox: { paddingTop: 8, paddingBottom: 6 },
  greetingName: { fontSize: 19, fontWeight: '900', color: '#0f172a', letterSpacing: -0.4 },
  greetingSub: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 12 },
  liveIndicatorRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 6 },
  liveScopeText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  toolbarBtnsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  joinCodeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#ede9fe' },
  joinCodeBtnText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  newProgBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7c3aed', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12 },
  newProgBtnText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  kpiGrid: { gap: 10, marginBottom: 16 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  sectionBox: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  viewAllLink: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#f5f3ff' },
  viewAllText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  programsList: { gap: 8 },
  programCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  programAvatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  programAvatarOngoing: { backgroundColor: '#f5f3ff' },
  programAvatarText: { fontSize: 14, fontWeight: '800', color: '#64748b' },
  programAvatarTextOngoing: { color: '#7c3aed' },
  programInfo: { flex: 1, marginRight: 8 },
  programName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  programMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  programMetaText: { fontSize: 11, color: '#64748b' },
  programCategoryTag: { fontSize: 11, color: '#7c3aed', fontWeight: '600', marginLeft: 3 },
  programRight: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, height: 36, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 12, color: '#0f172a', padding: 0 },
  membersList: { gap: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  memberAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10, position: 'relative' },
  memberAvatarLead: { backgroundColor: '#f5f3ff' },
  memberAvatarText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  memberAvatarTextLead: { color: '#7c3aed' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', borderWidth: 1.5, borderColor: '#ffffff' },
  memberMeta: { flex: 1, marginRight: 8 },
  memberName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  memberSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  emptyInlineCard: { paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  emptyInlineTitle: { fontSize: 13, fontWeight: '700', color: '#475569' },
  emptyInlineSub: { fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'center', lineHeight: 16 },
});
