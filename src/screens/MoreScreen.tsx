import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';
import ZoneHeader from '../components/ZoneHeader';

interface MenuItemProps {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sub?: string;
  badge?: string | number;
  onPress: () => void;
  destructive?: boolean;
}

function MenuItem({ iconName, iconColor, iconBg, label, sub, badge, onPress, destructive }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, { backgroundColor: destructive ? '#fee2e2' : iconBg }]}>
        <Ionicons
          name={iconName}
          size={18}
          color={destructive ? '#dc2626' : iconColor}
        />
      </View>
      <View style={styles.menuTextCol}>
        <View style={styles.menuTitleRow}>
          <Text style={[styles.menuLabel, destructive && styles.destructiveText]}>{label}</Text>
          {badge ? (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {sub ? <Text style={styles.menuSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={destructive ? '#dc2626' : '#94a3b8'}
      />
    </TouchableOpacity>
  );
}

export default function MoreScreen({ navigation }: any) {
  const { adminUser, signOut } = useAuth();
  const { activeZone, isAllZones, availableZones } = useZoneContext();

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of RehearsalHub Admin Console?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.replace('Login');
        },
      },
    ]);
  }

  const zoneLabel = isAllZones ? `All Zones (${availableZones.length})` : activeZone?.name ?? 'HQ';

  const roleTitle = adminUser?.isHQAdmin
    ? 'HQ Admin'
    : (adminUser?.role || '').toLowerCase().includes('church') || (adminUser?.role || '').toLowerCase().includes('subgroup')
    ? 'Church Coordinator'
    : 'Zonal Coordinator';

  const initial = (adminUser?.name || adminUser?.email || 'A').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Admin Console" showBack={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.displayName} numberOfLines={1}>
              {adminUser?.name || adminUser?.email?.split('@')[0] || 'Administrator'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>{adminUser?.email || '—'}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: adminUser?.isHQAdmin ? '#eef2ff' : '#faf5ff', borderColor: adminUser?.isHQAdmin ? '#c7d2fe' : '#e9d5ff' }]}>
                <Ionicons
                  name={adminUser?.isHQAdmin ? 'shield-checkmark' : 'ribbon-outline'}
                  size={11}
                  color={adminUser?.isHQAdmin ? '#4f46e5' : '#7c3aed'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.roleText, { color: adminUser?.isHQAdmin ? '#4f46e5' : '#7c3aed' }]}>
                  {roleTitle}
                </Text>
              </View>
              <View style={styles.zoneBadge}>
                <Ionicons name="globe-outline" size={11} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={styles.zoneBadgeText} numberOfLines={1}>{zoneLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Repertoire & Sets (Matching AdminSidebar.tsx) */}
        <Text style={styles.sectionLabel}>Repertoire & Sets</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            iconName="calendar-outline"
            iconColor="#7c3aed"
            iconBg="#f5f3ff"
            label="Programs"
            sub="Rehearsal programs, setlists, and running orders"
            onPress={() => navigation.navigate('PraiseNight')}
          />
          <MenuItem
            iconName="cloud-upload-outline"
            iconColor="#e11d48"
            iconBg="#fff1f2"
            label="Submitted Songs"
            sub="Review singer audio submissions and approve"
            onPress={() => navigation.navigate('Songs')}
          />
          <MenuItem
            iconName="musical-notes-outline"
            iconColor="#d97706"
            iconBg="#fffbeb"
            label="All Ministered"
            sub="Master ministry repertoire and vocal arrangements"
            onPress={() => navigation.navigate('MasterLibrary')}
          />
          <MenuItem
            iconName="pricetags-outline"
            iconColor="#059669"
            iconBg="#ecfdf5"
            label="Categories & Tags"
            sub="Manage rehearsal song classifications"
            onPress={() => navigation.navigate('Categories')}
          />
        </View>

        {/* Choir & Operations (Matching AdminSidebar.tsx) */}
        <Text style={styles.sectionLabel}>Choir & Operations</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            iconName="people-outline"
            iconColor="#4f46e5"
            iconBg="#eef2ff"
            label="Members Directory"
            sub="Singer roster, vocal parts, and permissions"
            onPress={() => navigation.navigate('Members')}
          />
          <MenuItem
            iconName="business-outline"
            iconColor="#0284c7"
            iconBg="#f0f9ff"
            label="Churches & Subgroups"
            sub="Local assemblies, coordinator approvals, and rosters"
            onPress={() => navigation.navigate('Churches')}
          />
          <MenuItem
            iconName="calendar-number-outline"
            iconColor="#059669"
            iconBg="#ecfdf5"
            label="Attendance Manager"
            sub="Session passcodes, QR codes, and check-in feed"
            onPress={() => navigation.navigate('Attendance')}
          />
          <MenuItem
            iconName="list-outline"
            iconColor="#7c3aed"
            iconBg="#f5f3ff"
            label="Schedule Manager"
            sub="Weekly choir schedule & setlist plans"
            onPress={() => navigation.navigate('Schedule')}
          />
          <MenuItem
            iconName="folder-open-outline"
            iconColor="#2563eb"
            iconBg="#eff6ff"
            label="Media Assets"
            sub="Cloudflare R2 rehearsal videos and audio stems"
            onPress={() => navigation.navigate('MediaLibrary')}
          />
          <MenuItem
            iconName="notifications-outline"
            iconColor="#d97706"
            iconBg="#fffbeb"
            label="Broadcast Announcements"
            sub="Push alerts to choir members and coordinators"
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        {/* System & Tools (Matching AdminSidebar.tsx) */}
        <Text style={styles.sectionLabel}>System & Tools</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            iconName="bar-chart-outline"
            iconColor="#059669"
            iconBg="#ecfdf5"
            label="Analytics & Insights"
            sub="Attendance turnout rates and rehearsal trends"
            onPress={() => navigation.navigate('Analytics')}
          />
          <MenuItem
            iconName="chatbubbles-outline"
            iconColor="#db2777"
            iconBg="#fdf2f8"
            label="Support Desk"
            sub="Direct singer inquiries and feedback"
            onPress={() => navigation.navigate('SupportChat')}
          />
          <MenuItem
            iconName="calendar-outline"
            iconColor="#2563eb"
            iconBg="#eff6ff"
            label="Rehearsal Calendar"
            sub="Interactive calendar of all rehearsals and events"
            onPress={() => navigation.navigate('Calendar')}
          />
          <MenuItem
            iconName="time-outline"
            iconColor="#64748b"
            iconBg="#f1f5f9"
            label="Activity Logs"
            sub="Audit trail of coordinator and director actions"
            onPress={() => navigation.navigate('ActivityLogs')}
          />
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            iconName="log-out-outline"
            iconColor="#dc2626"
            iconBg="#fee2e2"
            label="Sign Out"
            sub="Log out of admin session"
            onPress={handleLogout}
            destructive
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    gap: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  displayName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  email: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 150,
  },
  zoneBadgeText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 16,
  },
  menuGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
    minWidth: 0,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuLabel: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  menuBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
  },
  menuBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
  },
  menuSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  destructiveText: {
    color: '#dc2626',
  },
});

