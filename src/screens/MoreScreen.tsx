import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';

interface MenuItemProps {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress: () => void;
  destructive?: boolean;
}

function MenuItem({ iconName, label, sub, onPress, destructive }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, destructive && styles.destructiveIconWrap]}>
        <Ionicons
          name={iconName}
          size={18}
          color={destructive ? Colors.danger : Colors.accentBright}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, destructive && styles.destructiveText]}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={destructive ? Colors.danger : Colors.textMuted}
      />
    </TouchableOpacity>
  );
}

export default function MoreScreen({ navigation }: any) {
  const { adminUser, signOut } = useAuth();
  const { activeZone, isAllZones, availableZones } = useZoneContext();

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of RehearsalHub Studio?', [
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

  const zoneLabel = isAllZones ? `All Zones (${availableZones.length})` : activeZone?.name ?? '—';

  const roleTitle = adminUser?.isHQAdmin
    ? 'HQ Admin'
    : (adminUser?.role || '').toLowerCase().includes('church') || (adminUser?.role || '').toLowerCase().includes('subgroup')
    ? 'Church Coordinator'
    : 'Zonal Coordinator';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: adminUser?.isHQAdmin ? Colors.accentSubtle : Colors.info + '22' }]}>
            <Text style={[styles.avatarText, { color: adminUser?.isHQAdmin ? Colors.accentBright : Colors.info }]}>
              {(adminUser?.email?.[0] || 'C').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.displayName} numberOfLines={1}>
              {adminUser?.name || adminUser?.email?.split('@')[0] || 'Coordinator'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>{adminUser?.email || '—'}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: adminUser?.isHQAdmin ? Colors.accentSubtle : Colors.info + '22', borderColor: adminUser?.isHQAdmin ? Colors.accentDim : Colors.info + '60' }]}>
                <Ionicons
                  name={adminUser?.isHQAdmin ? 'shield-checkmark' : 'location'}
                  size={11}
                  color={adminUser?.isHQAdmin ? Colors.accentBright : Colors.info}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.roleText, { color: adminUser?.isHQAdmin ? Colors.accentBright : Colors.info }]}>
                  {roleTitle}
                </Text>
              </View>
              <View style={styles.zoneBadge}>
                <Ionicons name="earth" size={10} color={Colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.zoneBadgeText} numberOfLines={1}>{zoneLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Rehearsals & Music Content */}
        <Text style={styles.sectionLabel}>Rehearsals & Music</Text>
        <View style={styles.menuGroup}>
          <MenuItem iconName="document-text-outline" label="Submitted Songs" sub="Review and approve choir song submissions" onPress={() => navigation.navigate('Songs')} />
          <MenuItem iconName="musical-notes-outline" label="Programs & Praise Nights" sub="Manage praise nights and rehearsal setlists" onPress={() => navigation.navigate('PraiseNight')} />
          <MenuItem iconName="calendar-outline" label="Rehearsal Calendar" sub="Interactive monthly/weekly events and sessions" onPress={() => navigation.navigate('Calendar')} />
          <MenuItem iconName="list-outline" label="Schedule Manager" sub="Weekly & daily setlist plans" onPress={() => navigation.navigate('Schedule')} />
          <MenuItem iconName="library-outline" label="Master Library" sub="Global song catalog and recordings" onPress={() => navigation.navigate('MasterLibrary')} />
          <MenuItem iconName="folder-open-outline" label="Media Library" sub="Stems, guide tracks, score sheets, and videos" onPress={() => navigation.navigate('Media')} />
        </View>

        {/* Administration & Operations */}
        <Text style={styles.sectionLabel}>Administration & Hubs</Text>
        <View style={styles.menuGroup}>
          <MenuItem iconName="calendar-number-outline" label="Attendance Manager" sub="Check-in sessions, codes, and live logs" onPress={() => navigation.navigate('Attendance')} />
          <MenuItem iconName="business-outline" label="Churches & Subgroups" sub="Approve new churches and appoint coordinators" onPress={() => navigation.navigate('Churches')} />
          <MenuItem iconName="people-outline" label="Members Directory" sub="Manage roles, access, and promotions" onPress={() => navigation.navigate('Members')} />
          <MenuItem iconName="analytics-outline" label="Analytics & Reports" sub="Attendance rates, rehearsal stats, and leaderboards" onPress={() => navigation.navigate('Analytics')} />
          <MenuItem iconName="notifications-outline" label="Broadcast Announcement" sub="Send push alerts to choir members" onPress={() => navigation.navigate('Notifications')} />
          <MenuItem iconName="chatbubbles-outline" label="Support Desk" sub="Reply to member questions and inquiries" onPress={() => navigation.navigate('SupportChat')} />
          <MenuItem iconName="pricetags-outline" label="Categories & Tags" sub="Manage song classifications" onPress={() => navigation.navigate('Categories')} />
          <MenuItem iconName="time-outline" label="Activity Logs" sub="Audit trail of coordinator actions" onPress={() => navigation.navigate('ActivityLogs')} />
        </View>

        {/* Account Section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuGroup}>
          <MenuItem iconName="log-out-outline" label="Sign Out" onPress={handleLogout} destructive />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  displayName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  email: {
    color: Colors.textMuted,
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
    borderRadius: 6,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 160,
  },
  zoneBadgeText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 16,
  },
  menuGroup: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveIconWrap: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  menuLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  menuSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  destructiveText: {
    color: Colors.danger,
  },
});
