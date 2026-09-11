import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { customAlert } from '../context/AlertContext';

export interface Member {
  id: string;
  membershipId?: string;
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  alias?: string;
  phone?: string;
  church?: string;
  designation?: string;
  profile_image_url?: string;
  created_at?: string;
  is_active: boolean;
  role: 'member' | 'hq_admin' | 'admin' | string;
  isAdmin?: boolean;
  has_hq_access?: boolean;
  zoneId?: string;
  zoneName?: string;
  pending_hq_approval?: boolean;
  can_access_pre_rehearsal?: boolean;
  can_access_ongoing?: boolean;
  can_access_archive?: boolean;
  canAnnotate?: boolean;
  canSeeArchive?: boolean;
  hiddenFeatures?: {
    hideOngoing?: boolean;
    hidePreRehearsal?: boolean;
    hideAnnotations?: boolean;
    hideArchives?: boolean;
    [key: string]: boolean | undefined;
  };
}

interface MemberManagementModalProps {
  visible: boolean;
  member: Member | null;
  onClose: () => void;
  onSave: (updated: Member, newPassword?: string) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
  onApprove?: (member: Member) => Promise<void> | void;
  onReject?: (member: Member) => Promise<void> | void;
}

export default function MemberManagementModal({
  visible,
  member,
  onClose,
  onSave,
  onRemove,
  onApprove,
  onReject,
}: MemberManagementModalProps) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [church, setChurch] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Role: Singer vs Zone Admin (admin of their zone) vs Church Admin (admin of a particular church)
  const [selectedRole, setSelectedRole] = useState<'singer' | 'zone_admin' | 'church_admin'>('singer');

  // Feature Passes (ONLY 4 requested by user: Ongoing, Pre-Rehearsal, Annotation, Archive)
  const [passOngoing, setPassOngoing] = useState(true);
  const [passPreRehearsal, setPassPreRehearsal] = useState(false);
  const [passAnnotation, setPassAnnotation] = useState(false);
  const [passArchive, setPassArchive] = useState(false);

  // Credentials
  const [username, setUsername] = useState('');
  const [alias, setAlias] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name || '');
      setLastName(member.last_name || '');
      setEmail(member.email || '');
      setPhone(member.phone || '');
      setChurch(member.church || '');
      setIsActive(member.is_active !== false);

      if (member.role === 'church_admin') {
        setSelectedRole('church_admin');
      } else if (
        member.role === 'zone_admin' ||
        member.role === 'hq_admin' ||
        member.role === 'admin' ||
        !!member.isAdmin
      ) {
        setSelectedRole('zone_admin');
      } else {
        setSelectedRole('singer');
      }

      const h = member.hiddenFeatures || {};
      setPassOngoing(!h.hideOngoing);
      setPassPreRehearsal(h.hidePreRehearsal !== undefined ? !h.hidePreRehearsal : !!member.can_access_pre_rehearsal);
      setPassAnnotation(h.hideAnnotations !== undefined ? !h.hideAnnotations : !!member.canAnnotate);
      setPassArchive(h.hideArchives !== undefined ? !h.hideArchives : (!!member.canSeeArchive || !!member.can_access_archive));

      setUsername(member.username || '');
      setAlias(member.alias || '');
      setNewPassword('');
      setShowPassword(false);
    }
  }, [member]);

  if (!member) return null;

  const fullName = `${firstName} ${lastName}`.trim() || 'Choir Member';
  const initial = `${firstName?.[0] || 'M'}${lastName?.[0] || ''}`.toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    try {
      const isNowAdmin = selectedRole === 'zone_admin' || selectedRole === 'church_admin';
      const isHqZone =
        member.zoneId === 'zone-001' || (member.zoneName || '').toLowerCase().includes('hq');

      const resolvedRole =
        selectedRole === 'zone_admin'
          ? (isHqZone ? 'hq_admin' : 'zone_admin')
          : selectedRole === 'church_admin'
          ? 'church_admin'
          : 'member';

      const updated: Member = {
        ...member,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        church: church.trim(),
        designation: member.designation, // Vocal part managed by member in singer app
        role: resolvedRole,
        isAdmin: isNowAdmin,
        has_hq_access: selectedRole === 'zone_admin' && isHqZone,
        username: username.trim().toLowerCase(),
        alias: alias.trim().toLowerCase().replace(/^@/, ''),
        is_active: isActive,
        can_access_ongoing: passOngoing,
        can_access_pre_rehearsal: passPreRehearsal,
        canAnnotate: passAnnotation,
        canSeeArchive: passArchive,
        can_access_archive: passArchive,
        hiddenFeatures: {
          ...member.hiddenFeatures,
          hideOngoing: !passOngoing,
          hidePreRehearsal: !passPreRehearsal,
          hideAnnotations: !passAnnotation,
          hideArchives: !passArchive,
        },
      };

      await onSave(updated, newPassword.trim() || undefined);
      customAlert('Saved', `${fullName}'s role status and access passes have been updated.`);
      onClose();
    } catch (err: any) {
      customAlert('Save Failed', err?.message || 'Could not update member.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    customAlert(
      'Remove Member',
      `Remove ${fullName} from the roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await onRemove(member.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Grab Handle */}
          <View style={styles.grabBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Member Access & Passes</Text>
              <Text style={styles.headerSub}>ID: {member.id.substring(0, 10)}...</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero Profile Card */}
            <View style={styles.heroCard}>
              <View style={styles.avatarWrap}>
                {member.profile_image_url ? (
                  <Image source={{ uri: member.profile_image_url }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                )}
                {isActive && <View style={styles.onlineDot} />}
              </View>

              <View style={styles.heroMeta}>
                <View style={styles.heroNameRow}>
                  <Text style={styles.heroName} numberOfLines={1}>{fullName}</Text>
                  {alias ? (
                    <Text style={styles.aliasPill}>@{alias.replace(/^@/, '')}</Text>
                  ) : null}
                </View>
                <Text style={styles.heroEmail} numberOfLines={1}>{email || 'No email registered'}</Text>
                
                {/* Registered Zone (Fixed / Read-Only — No stressing admin) */}
                <View style={styles.zoneFixedBadge}>
                  <Ionicons name="location" size={11} color="#6366f1" style={{ marginRight: 4 }} />
                  <Text style={styles.zoneFixedText} numberOfLines={1}>
                    {member.zoneName || 'Registered Zone'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pending Request Banner */}
            {member.pending_hq_approval && (
              <View style={styles.pendingCard}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.pendingTitle}>Awaiting HQ Approval</Text>
                  <Text style={styles.pendingSub}>Applied to join {member.zoneName || 'Choir'}</Text>
                </View>
                <View style={styles.pendingBtnRow}>
                  {onApprove && (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => onApprove(member)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {onReject && (
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => onReject(member)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Account Status Switch */}
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.cardHeading}>Account Status</Text>
                  <Text style={[styles.statusSubText, isActive ? styles.textActive : styles.textInactive]}>
                    {isActive ? '● Active — Authorized access' : '○ Suspended / Inactive'}
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#e2e8f0', true: '#a7f3d0' }}
                  thumbColor={isActive ? '#10b981' : '#94a3b8'}
                />
              </View>
            </View>

            {/* ── CARD 1: ROLE ASSIGNMENT (SINGER / ZONE ADMIN / CHURCH ADMIN) ── */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Member Role</Text>
              <Text style={styles.cardHint}>Assign role status and administrative jurisdiction.</Text>

              <View style={styles.roleOptionsList}>
                {/* 1. Singer */}
                <TouchableOpacity
                  style={[styles.roleOptionRow, selectedRole === 'singer' && styles.roleOptionRowActive]}
                  onPress={() => setSelectedRole('singer')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.roleRadioCircle, selectedRole === 'singer' && styles.roleRadioCircleActive]}>
                    {selectedRole === 'singer' && <View style={styles.roleRadioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.roleTitleRow}>
                      <Text style={[styles.roleTitleText, selectedRole === 'singer' && styles.roleTitleTextActive]}>
                        Singer
                      </Text>
                      <View style={styles.rolePillSlate}>
                        <Text style={styles.rolePillSlateText}>Standard</Text>
                      </View>
                    </View>
                    <Text style={styles.roleSubText}>Standard choir singer with repertoire & rehearsal access</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. Zone Admin */}
                <TouchableOpacity
                  style={[styles.roleOptionRow, selectedRole === 'zone_admin' && styles.roleOptionRowActive]}
                  onPress={() => setSelectedRole('zone_admin')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.roleRadioCircle, selectedRole === 'zone_admin' && styles.roleRadioCircleActive]}>
                    {selectedRole === 'zone_admin' && <View style={styles.roleRadioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.roleTitleRow}>
                      <Text style={[styles.roleTitleText, selectedRole === 'zone_admin' && styles.roleTitleTextActive]}>
                        Zone Admin
                      </Text>
                      <View style={styles.rolePillPurple}>
                        <Text style={styles.rolePillPurpleText}>Zone Lead</Text>
                      </View>
                    </View>
                    <Text style={styles.roleSubText}>
                      Admin of {member.zoneName || 'assigned zone'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 3. Church Admin */}
                <TouchableOpacity
                  style={[
                    styles.roleOptionRow,
                    selectedRole === 'church_admin' && styles.roleOptionRowActive,
                    { borderBottomWidth: 0 },
                  ]}
                  onPress={() => setSelectedRole('church_admin')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.roleRadioCircle, selectedRole === 'church_admin' && styles.roleRadioCircleActive]}>
                    {selectedRole === 'church_admin' && <View style={styles.roleRadioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.roleTitleRow}>
                      <Text style={[styles.roleTitleText, selectedRole === 'church_admin' && styles.roleTitleTextActive]}>
                        Church Admin
                      </Text>
                      <View style={styles.rolePillSky}>
                        <Text style={styles.rolePillSkyText}>Assembly</Text>
                      </View>
                    </View>
                    <Text style={styles.roleSubText}>Admin of a particular church assembly</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* If Church Admin: show Church Assembly input */}
              {selectedRole === 'church_admin' && (
                <View style={styles.churchInputContainer}>
                  <Text style={styles.inputLabel}>Particular Church Assembly Administered</Text>
                  <TextInput
                    style={styles.input}
                    value={church}
                    onChangeText={setChurch}
                    placeholder="e.g. Christ Embassy LCA"
                    placeholderTextColor="#94a3b8"
                  />
                  <Text style={styles.churchInputNote}>
                    This member will have administrative access for this specific church chapter.
                  </Text>
                </View>
              )}
            </View>

            {/* ── CARD 2: FEATURE PASSES (ONLY THE 4 REQUESTED!) ─────────── */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Feature Passes</Text>
              <Text style={styles.cardHint}>Grant or revoke special access passes for this singer.</Text>

              <View style={styles.passesList}>
                {/* 1. Ongoing Programs Pass */}
                <View style={styles.passRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="play-circle" size={15} color="#10b981" />
                      <Text style={styles.passTitle}>Ongoing Programs</Text>
                    </View>
                    <Text style={styles.passSub}>Live broadcast & ongoing rehearsal setlists</Text>
                  </View>
                  <Switch
                    value={passOngoing}
                    onValueChange={setPassOngoing}
                    trackColor={{ false: '#e2e8f0', true: '#a7f3d0' }}
                    thumbColor={passOngoing ? '#10b981' : '#94a3b8'}
                  />
                </View>

                {/* 2. Pre-Rehearsal Sets Pass */}
                <View style={styles.passRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="time" size={15} color="#d97706" />
                      <Text style={styles.passTitle}>Pre-Rehearsal Sets</Text>
                      <View style={styles.passTagAmber}>
                        <Text style={styles.passTagAmberText}>Restricted</Text>
                      </View>
                    </View>
                    <Text style={styles.passSub}>Access upcoming Praise Night repertoire in advance</Text>
                  </View>
                  <Switch
                    value={passPreRehearsal}
                    onValueChange={setPassPreRehearsal}
                    trackColor={{ false: '#e2e8f0', true: '#fde68a' }}
                    thumbColor={passPreRehearsal ? '#d97706' : '#94a3b8'}
                  />
                </View>

                {/* 3. Annotation Pass */}
                <View style={styles.passRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="pencil" size={15} color="#6366f1" />
                      <Text style={styles.passTitle}>Sheet Music Annotations</Text>
                      <View style={styles.passTagIndigo}>
                        <Text style={styles.passTagIndigoText}>Restricted</Text>
                      </View>
                    </View>
                    <Text style={styles.passSub}>Draw notes and notations directly on song sheets</Text>
                  </View>
                  <Switch
                    value={passAnnotation}
                    onValueChange={setPassAnnotation}
                    trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
                    thumbColor={passAnnotation ? '#6366f1' : '#94a3b8'}
                  />
                </View>

                {/* 4. Archive Pass */}
                <View style={[styles.passRow, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="library" size={15} color="#7c3aed" />
                      <Text style={styles.passTitle}>Archive Access</Text>
                    </View>
                    <Text style={styles.passSub}>Browse historical Praise Night recordings & song archives</Text>
                  </View>
                  <Switch
                    value={passArchive}
                    onValueChange={setPassArchive}
                    trackColor={{ false: '#e2e8f0', true: '#ddd6fe' }}
                    thumbColor={passArchive ? '#7c3aed' : '#94a3b8'}
                  />
                </View>
              </View>
            </View>

            {/* ── CARD 4: CONTACT & CREDENTIALS ──────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Contact & Login Details</Text>

              <View style={styles.twoColRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={[styles.inputGroup, { flex: 1.2, marginRight: 6 }]}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="phone"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="username"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.inputLabel}>Login Alias (@)</Text>
                  <TextInput
                    style={styles.input}
                    value={alias}
                    onChangeText={setAlias}
                    placeholder="alias"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reset Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Leave blank to keep current password..."
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Sticky Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={handleRemove}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 4 }} />
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>

            <View style={styles.bottomRightGroup}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.7}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  grabBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroMeta: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    flexShrink: 1,
  },
  aliasPill: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338ca',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  heroEmail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  zoneFixedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  zoneFixedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 10,
  },
  pendingTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  pendingSub: {
    fontSize: 10,
    color: '#b45309',
    marginTop: 1,
  },
  pendingBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  declineBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  declineBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b91c1c',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusSubText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  textActive: {
    color: '#10b981',
  },
  textInactive: {
    color: '#ef4444',
  },
  passesList: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 10,
    paddingTop: 4,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  passTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  passSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  passTagAmber: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  passTagAmberText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
  },
  passTagIndigo: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  passTagIndigoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338ca',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 4,
  },
  roleOptionsList: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  roleOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  roleOptionRowActive: {
    backgroundColor: '#faf5ff',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  roleRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleRadioCircleActive: {
    borderColor: '#7c3aed',
  },
  roleRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c3aed',
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  roleTitleTextActive: {
    color: '#7c3aed',
    fontWeight: '900',
  },
  roleSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  rolePillSlate: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  rolePillSlateText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  rolePillPurple: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  rolePillPurpleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7c3aed',
  },
  rolePillSky: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  rolePillSkyText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
  },
  churchInputContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  churchInputNote: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 38,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 38,
  },
  passwordInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  bottomRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});
