import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './membersStyles';
import type { Member } from '../../hooks/useMembers';

interface MemberListItemProps {
  item: Member;
  onRemove?: (id: string) => void;
  onShowBadge?: (member: Member) => void;
}

export default function MemberListItem({ item, onRemove, onShowBadge }: MemberListItemProps) {
  const fullName = `${item.first_name} ${item.last_name}`.trim();
  const initial = `${item.first_name[0] || 'S'}${item.last_name[0] || ''}`.toUpperCase();

  // Accurate role determination
  const isHQ = item.role === 'hq_admin';
  const isChurch = item.role === 'church_admin';
  const isZone = item.role === 'zone_admin' || item.role === 'zone_coordinator';

  return (
    <View style={styles.memberCard}>
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
        <View style={styles.memberNameRow}>
          <Text style={styles.nameText} numberOfLines={1}>
            {fullName}
          </Text>
          {isHQ ? (
            <View style={styles.roleBadgeHq}>
              <Text style={styles.roleTextHq}>HQ Admin</Text>
            </View>
          ) : isChurch ? (
            <View style={styles.roleBadgeChurch}>
              <Text style={styles.roleTextChurch}>Church Admin</Text>
            </View>
          ) : isZone ? (
            <View style={styles.roleBadgeZone}>
              <Text style={styles.roleTextZone}>Zone Admin</Text>
            </View>
          ) : (
            <View style={styles.roleBadgeSinger}>
              <Text style={styles.roleTextSinger}>Singer</Text>
            </View>
          )}
        </View>

        {item.email ? (
          <Text style={styles.emailText} numberOfLines={1}>
            {item.email}
          </Text>
        ) : null}

        <Text style={styles.subtitleText} numberOfLines={1}>
          {[item.church || item.zoneName, item.designation].filter(Boolean).join(' • ') || 'Loveworld Singers Member'}
        </Text>
      </View>

      {/* View Attendance QR Badge Button */}
      {onShowBadge && (
        <TouchableOpacity
          onPress={() => onShowBadge(item)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: '#f5f3ff',
            marginLeft: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="qr-code-outline" size={17} color="#7c3aed" />
        </TouchableOpacity>
      )}

      {onRemove && !isHQ && (
        <TouchableOpacity
          onPress={() => onRemove(item.id)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            marginLeft: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}
