import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';

interface SingerAttendanceBadgeModalProps {
  visible: boolean;
  onClose: () => void;
  member: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    church?: string;
    zoneName?: string;
    designation?: string;
    role?: string;
    profile_image_url?: string;
  } | null;
  onCheckInSuccess?: (memberId: string, memberName: string) => void;
}

export default function SingerAttendanceBadgeModal({
  visible,
  onClose,
  member,
  onCheckInSuccess,
}: SingerAttendanceBadgeModalProps) {
  const insets = useSafeAreaInsets();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);

  if (!member) return null;

  const fullName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Choir Member';
  const initial = (fullName[0] || 'S').toUpperCase();
  const roleDisplay = member.designation || (member.role === 'hq_admin' ? 'HQ Admin' : member.role === 'zone_admin' ? 'Zone Admin' : 'Singer');
  const orgDisplay = [member.church || member.zoneName, member.email].filter(Boolean).join(' • ');

  // Standard attendance QR format: LW-ATTEND-${userId}
  const qrPayload = `LW-ATTEND-${member.id}`;

  const handleQuickCheckIn = async () => {
    if (checkingIn || checkInDone) return;
    setCheckingIn(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const idempotencyKey = `idem_badge_${member.id}_${todayStr}`;
      await api.attendance.recordCheckIn({
        idempotencyKey,
        userId: member.id,
        user_name: fullName,
        eventName: 'Rehearsal Attendance',
        status: 'present',
        checkInTime: new Date().toISOString(),
        method: 'badge',
      });
      setCheckInDone(true);
      onCheckInSuccess?.(member.id, fullName);
    } catch (e: any) {
      console.warn('[BadgeCheckIn] failed:', e);
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.badgeHeaderTag}>
              <Ionicons name="ribbon-outline" size={14} color="#7c3aed" style={{ marginRight: 4 }} />
              <Text style={styles.badgeHeaderTagText}>Official Attendance Badge</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Badge Card Container */}
          <View style={styles.badgeCard}>
            {/* Header / Avatar */}
            <View style={styles.avatarRow}>
              {member.profile_image_url ? (
                <Image source={{ uri: member.profile_image_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarInitialWrap}>
                  <Text style={styles.avatarInitialText}>{initial}</Text>
                </View>
              )}
              <View style={styles.nameBlock}>
                <Text style={styles.singerName} numberOfLines={1}>{fullName}</Text>
                <Text style={styles.singerRole} numberOfLines={1}>{roleDisplay}</Text>
                {orgDisplay ? (
                  <Text style={styles.singerOrg} numberOfLines={1}>{orgDisplay}</Text>
                ) : null}
              </View>
            </View>

            {/* QR Code Section */}
            <View style={styles.qrWrapperOuter}>
              <View style={styles.qrWrapperInner}>
                <QRCode
                  value={qrPayload}
                  size={190}
                  color="#0f172a"
                  backgroundColor="#ffffff"
                />
              </View>
            </View>

            {/* Member ID pill */}
            <View style={styles.codePill}>
              <Ionicons name="barcode-outline" size={13} color="#7c3aed" />
              <Text style={styles.codePillText}>{member.id}</Text>
            </View>

            <Text style={styles.qrHint}>
              Linked to {member.first_name || fullName}'s profile. Coordinators can scan this QR code with the admin scanner to record attendance.
            </Text>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.checkInBtn,
                checkInDone && styles.checkInBtnDone,
              ]}
              onPress={handleQuickCheckIn}
              disabled={checkingIn || checkInDone}
              activeOpacity={0.85}
            >
              {checkingIn ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : checkInDone ? (
                <View style={styles.btnRow}>
                  <Ionicons name="checkmark-circle" size={17} color="#ffffff" />
                  <Text style={styles.checkInBtnText}>Marked Present ✓</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="finger-print" size={17} color="#ffffff" />
                  <Text style={styles.checkInBtnText}>Mark Present Now</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.84)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeHeaderTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  badgeCard: {
    width: '100%',
    backgroundColor: '#faf5ff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e9d5ff',
    padding: 16,
    alignItems: 'center',
  },
  avatarRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
  },
  avatarInitialWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  nameBlock: {
    flex: 1,
  },
  singerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  singerRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
    marginTop: 1,
  },
  singerOrg: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  qrWrapperOuter: {
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  qrWrapperInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    marginTop: 10,
  },
  codePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    fontFamily: 'monospace',
  },
  qrHint: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15,
    paddingHorizontal: 8,
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  checkInBtn: {
    flex: 2,
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInBtnDone: {
    backgroundColor: '#10b981',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkInBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  doneBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
