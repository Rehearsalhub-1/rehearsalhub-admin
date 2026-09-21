import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { customAlert } from '../../context/AlertContext';
import { styles } from './memberManagementStyles';
import MemberProfileHeader from './MemberProfileHeader';
import MemberRoleEditor from './MemberRoleEditor';
import MemberFeaturePasses from './MemberFeaturePasses';
import MemberContactForm from './MemberContactForm';
import { MemberAccountStatus, MemberBottomBar } from './MemberStatusActions';
import type { Member, MemberManagementModalProps } from './types';

export type { Member, MemberManagementModalProps };

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

  // Role: Singer vs Zone Admin vs Church Admin
  const [selectedRole, setSelectedRole] = useState<'singer' | 'zone_admin' | 'church_admin'>('singer');

  // Feature Passes (Ongoing, Pre-Rehearsal, Annotation, Archive)
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
        designation: member.designation,
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
            <MemberProfileHeader
              member={member}
              fullName={fullName}
              initial={initial}
              alias={alias}
              email={email}
              isActive={isActive}
              onApprove={onApprove}
              onReject={onReject}
            />

            <MemberAccountStatus
              isActive={isActive}
              setIsActive={setIsActive}
            />

            <MemberRoleEditor
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              church={church}
              setChurch={setChurch}
              zoneName={member.zoneName}
            />

            <MemberFeaturePasses
              passOngoing={passOngoing}
              setPassOngoing={setPassOngoing}
              passPreRehearsal={passPreRehearsal}
              setPassPreRehearsal={setPassPreRehearsal}
              passAnnotation={passAnnotation}
              setPassAnnotation={setPassAnnotation}
              passArchive={passArchive}
              setPassArchive={setPassArchive}
            />

            <MemberContactForm
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              username={username}
              setUsername={setUsername}
              alias={alias}
              setAlias={setAlias}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          <MemberBottomBar
            saving={saving}
            onRemove={handleRemove}
            onClose={onClose}
            onSave={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
