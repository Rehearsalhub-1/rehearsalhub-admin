import React from 'react';
import { View, Text, Image } from 'react-native';
import { styles } from './membersStyles';
import type { Member } from '../../hooks/useMembers';

interface MemberListItemProps {
  item: Member;
}

export default function MemberListItem({ item }: MemberListItemProps) {
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
    </View>
  );
}
