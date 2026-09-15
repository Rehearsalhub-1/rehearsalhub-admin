import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';
import { useAdminStore } from '../stores/adminStore';
import ZoneHeader from '../components/ZoneHeader';
import { useAlert } from '../context/AlertContext';
import { useOTAUpdates } from '../hooks/useOTAUpdates';

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
  const {
    activeZone, availableZones,
    isChurchMode, activeChurch, userChurches, toggleRoleMode,
  } = useZoneContext();

  const session = useAdminStore(s => s.session);
  const { showAlert } = useAlert();
  const hasDualRole = Boolean(session?.isDualRole);
  const isPureChurchAdmin = Boolean(adminUser?.isChurchAdmin) && !adminUser?.isHQAdmin && !hasDualRole;

  async function handleLogout() {
    showAlert('Sign Out', 'Are you sure you want to sign out of RehearsalHub Admin Console?', [
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

  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const { checkManually } = useOTAUpdates();

  async function handleCheckForUpdates() {
    if (checkingUpdates) return;
    setCheckingUpdates(true);
    try {
      const res = await checkManually();
      if (res.status === 'updated') {
        showAlert(
          'Update Ready 🚀',
          'A new update has been downloaded! Restart now to apply it immediately.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Restart Now',
              onPress: async () => {
                try {
                  await Updates.reloadAsync();
                } catch (e) {
                  console.warn('Reload failed:', e);
                }
              },
            },
          ]
        );
      } else if (res.status === 'up_to_date') {
        showAlert('Up to Date', 'You are running the latest version of RehearsalHub Admin.');
      } else if (res.status === 'disabled') {
        showAlert('Updates Disabled', res.message);
      } else if (res.status === 'error') {
        showAlert('Update Check Failed', res.message);
      }
    } finally {
      setCheckingUpdates(false);
    }
  }

  const rawZoneName = activeZone?.name;
  const cleanZoneName = (rawZoneName && rawZoneName.toLowerCase() !== 'central admin')
    ? rawZoneName
    : (adminUser?.isHQAdmin ? 'Loveworld Singers HQ' : 'Your Zone');

  const zoneLabel = isChurchMode
    ? (activeChurch?.name || 'Church Choir')
    : cleanZoneName;

  const roleTitle = adminUser?.isHQAdmin
    ? 'HQ Admin'
    : adminUser?.isChurchAdmin
    ? 'Church Coordinator'
    : 'Zonal Admin';

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
              <View style={[styles.roleBadge, {
                backgroundColor: adminUser?.isHQAdmin ? '#eef2ff' : isPureChurchAdmin ? '#fff7ed' : '#faf5ff',
                borderColor: adminUser?.isHQAdmin ? '#c7d2fe' : isPureChurchAdmin ? '#fed7aa' : '#e9d5ff',
              }]}>
                <Ionicons
                  name={adminUser?.isHQAdmin ? 'shield-checkmark' : isPureChurchAdmin ? 'home' : 'ribbon-outline'}
                  size={11}
                  color={adminUser?.isHQAdmin ? '#4f46e5' : isPureChurchAdmin ? '#ea580c' : '#7c3aed'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.roleText, {
                  color: adminUser?.isHQAdmin ? '#4f46e5' : isPureChurchAdmin ? '#ea580c' : '#7c3aed',
                }]}>
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

        {/* ── Dual-Role Scope Switcher Card (only for dual-role admins) ── */}
        {hasDualRole && (
          <TouchableOpacity style={styles.scopeCard} onPress={() => {
            showAlert(
              'Switch Admin Mode',
              'To switch between Zone Admin and Church Admin mode, sign out and choose your mode on the next login.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out & Switch',
                  style: 'destructive',
                  onPress: () => handleLogout(),
                },
              ]
            );
          }} activeOpacity={0.85}>
            <View style={styles.scopeCardLeft}>
              <View style={[styles.scopeIconWrap, { backgroundColor: isChurchMode ? '#fff7ed' : '#eef2ff' }]}>
                <Ionicons
                  name={isChurchMode ? 'home' : 'shield-half-outline'}
                  size={20}
                  color={isChurchMode ? '#ea580c' : '#4f46e5'}
                />
              </View>
              <View>
                <Text style={styles.scopeTitle}>
                  {isChurchMode ? '⛪ Church Admin Mode' : '🏛️ Zone Admin Mode'}
                </Text>
                <Text style={styles.scopeSub}>
                  {isChurchMode
                    ? `Operating as: ${activeChurch?.name || 'Church'}`
                    : `Operating as: ${activeZone?.name || 'Zone Admin'}`}
                </Text>
              </View>
            </View>
            <View style={[styles.scopeTogglePill, { backgroundColor: isChurchMode ? '#fff7ed' : '#eef2ff' }]}>
              <Ionicons name="swap-horizontal" size={14} color={isChurchMode ? '#ea580c' : '#4f46e5'} style={{ marginRight: 4 }} />
              <Text style={[styles.scopeToggleText, { color: isChurchMode ? '#ea580c' : '#4f46e5' }]}>
                Switch
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Repertoire & Sets ──────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Repertoire & Sets</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            iconName="calendar-outline"
            iconColor="#7c3aed"
            iconBg="#f5f3ff"
            label="Programs"
            sub="Rehearsal programs, setlists, and running orders"
            onPress={() => navigation.navigate('Programs')}
          />
          <MenuItem
            iconName="time-outline"
            iconColor="#6366f1"
            iconBg="#eef2ff"
            label="Schedule Manager"
            sub="Rehearsal timetables, daily slots, and active schedule"
            onPress={() => navigation.navigate('Schedule')}
          />
          {/* Hide Submitted Songs in pure Church Mode */}
          {!isPureChurchAdmin && !isChurchMode && (
            <MenuItem
              iconName="cloud-upload-outline"
              iconColor="#e11d48"
              iconBg="#fff1f2"
              label="Submitted Songs"
              sub="Review singer audio submissions and approve"
              onPress={() => navigation.navigate('SubmittedSongs')}
            />
          )}
          {adminUser?.isHQAdmin && (
            <MenuItem
              iconName="musical-notes-outline"
              iconColor="#d97706"
              iconBg="#fffbeb"
              label="All Ministered"
              sub="Master ministry repertoire and vocal arrangements"
              onPress={() => navigation.navigate('MasterLibrary')}
            />
          )}
          {!isPureChurchAdmin && !isChurchMode && (
            <MenuItem
              iconName="pricetags-outline"
              iconColor="#059669"
              iconBg="#ecfdf5"
              label="Categories & Tags"
              sub="Manage rehearsal song classifications"
              onPress={() => navigation.navigate('Categories')}
            />
          )}
          <MenuItem
            iconName="folder-open-outline"
            iconColor="#0284c7"
            iconBg="#f0f9ff"
            label="Media Library"
            sub="Cloud audio tracks, stems, and album artworks"
            onPress={() => navigation.navigate('MediaLibrary')}
          />
        </View>

        {/* ── Choir & Operations ────────────────────────────────────────── */}
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
          {/* Hide Churches & Subgroups in Church Mode */}
          {!isPureChurchAdmin && !isChurchMode && (
            <MenuItem
              iconName="business-outline"
              iconColor="#0284c7"
              iconBg="#f0f9ff"
              label="Churches & Subgroups"
              sub="Local assemblies, coordinator approvals, and rosters"
              onPress={() => navigation.navigate('Churches')}
            />
          )}
          <MenuItem
            iconName="calendar-number-outline"
            iconColor="#059669"
            iconBg="#ecfdf5"
            label="Attendance Manager"
            sub="Camera QR scanner, cumulative stats & check-in feed"
            onPress={() => navigation.navigate('Attendance')}
          />
          <MenuItem
            iconName="navigate-circle-outline"
            iconColor="#0284c7"
            iconBg="#e0f2fe"
            label="Geofence & Venue Clock-in"
            sub="GPS venue boundary & mobile rehearsal check-in"
            onPress={() => navigation.navigate('Geofence')}
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

        {adminUser?.isHQAdmin && !isChurchMode && (
          <>
            <Text style={styles.sectionLabel}>Executive Oversight</Text>
            <View style={styles.menuGroup}>
              <MenuItem
                iconName="earth-outline"
                iconColor="#4f46e5"
                iconBg="#eef2ff"
                label="Analytics & Insights"
                sub="Attendance turnout rates and rehearsal trends"
                onPress={() => navigation.navigate('Analytics')}
              />
            </View>
          </>
        )}

        {/* ── System & Updates ─────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>System & Updates</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            iconName="cloud-download-outline"
            iconColor="#7c3aed"
            iconBg="#faf5ff"
            label="Check for Updates"
            sub={checkingUpdates ? "Connecting to EAS servers..." : "Version 1.0.0 (Tap to check for updates)"}
            onPress={handleCheckForUpdates}
          />
        </View>

        {/* ── Account ───────────────────────────────────────────────────── */}
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
    backgroundColor: '#f8fafc',
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
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  displayName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  zoneBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  // Scope Switcher Card
  scopeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scopeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scopeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scopeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  scopeSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  scopeTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scopeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Section + Menu
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 2,
  },
  menuGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  destructiveText: {
    color: '#dc2626',
  },
  menuSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  menuBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
});
