import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './membersStyles';
import { customAlert } from '../../context/AlertContext';
import type { Member } from '../../hooks/useMembers';

interface MemberListItemProps {
  item: Member;
  onRemove?: (id: string) => void;
  onShowBadge?: (member: Member) => void;
  onEdit?: (member: Member) => void;
  onToggleRole?: (member: Member, nextRole: Member['role']) => void;
  isChurchMode?: boolean;
}

export default function MemberListItem({
  item,
  onRemove,
  onShowBadge,
  onEdit,
  onToggleRole,
  isChurchMode = false,
}: MemberListItemProps) {
  const fullName = `${item.first_name} ${item.last_name}`.trim();
  const initial = `${item.first_name[0] || 'S'}${item.last_name[0] || ''}`.toUpperCase();

  // Accurate role determination
  const isHQ = item.role === 'hq_admin';
  const isChurch = item.role === 'church_admin';
  const isZone = item.role === 'zone_admin' || item.role === 'zone_coordinator';

  const handleOpenMenu = () => {
    const options: any[] = [];
    if (onEdit) {
      options.push({ text: 'Edit Profile & Role', onPress: () => onEdit(item) });
    }
    if (onToggleRole && !isHQ) {
      if (isChurchMode) {
        options.push({
          text: isChurch ? 'Remove Church Admin Role' : 'Make Church Admin',
          onPress: () => onToggleRole(item, isChurch ? 'member' : 'church_admin'),
        });
      } else {
        options.push({
          text: isZone ? 'Remove Zone Admin Role' : 'Make Zone Admin',
          onPress: () => onToggleRole(item, isZone ? 'member' : 'zone_admin'),
        });
      }
    }
    if (onShowBadge) {
      options.push({ text: 'View QR Attendance Badge', onPress: () => onShowBadge(item) });
    }
    if (onRemove && !isHQ) {
      options.push({
        text: isChurchMode ? 'Remove from Church Choir' : 'Remove from Directory',
        style: 'destructive',
        onPress: () => onRemove(item.id),
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });

    customAlert(fullName, 'Manage choir member', options);
  };

  return (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => (onEdit ? onEdit(item) : handleOpenMenu())}
      activeOpacity={0.8}
    >
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

      {/* Right Column: Clean QR Shortcut + Overflow Action Menu */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {onShowBadge && (
          <TouchableOpacity
            onPress={() => onShowBadge(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 6 }}
            style={{
              padding: 7,
              borderRadius: 8,
              backgroundColor: '#f5f3ff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="qr-code-outline" size={16} color="#7c3aed" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleOpenMenu}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
          style={{
            padding: 7,
            borderRadius: 8,
            backgroundColor: '#f8fafc',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="ellipsis-vertical" size={15} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
