import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './memberManagementStyles';
import type { Member } from './types';

interface MemberProfileHeaderProps {
  member: Member;
  fullName: string;
  initial: string;
  alias: string;
  email: string;
  isActive: boolean;
  onApprove?: (member: Member) => Promise<void> | void;
  onReject?: (member: Member) => Promise<void> | void;
}

export default function MemberProfileHeader({
  member,
  fullName,
  initial,
  alias,
  email,
  isActive,
  onApprove,
  onReject,
}: MemberProfileHeaderProps) {
  return (
    <>
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
    </>
  );
}
