import React from 'react';
import { View, Text, Switch, Platform } from 'react-native';
import { styles } from './membersStyles';
import type { Member } from '../../hooks/useMembers';

interface MemberFeaturePassItemProps {
  item: Member;
  onTogglePass: (
    member: Member,
    key: 'can_access_archive' | 'can_access_ongoing' | 'can_access_pre_rehearsal' | 'canAnnotate'
  ) => void;
}

export default function MemberFeaturePassItem({ item, onTogglePass }: MemberFeaturePassItemProps) {
  const fullName = `${item.first_name} ${item.last_name}`.trim();
  const archiveOn = Boolean(item.can_access_archive);
  const ongoingOn = Boolean(item.can_access_ongoing !== false);
  const preRehOn = Boolean(item.can_access_pre_rehearsal);
  const annotateOn = Boolean(item.canAnnotate);

  return (
    <View style={styles.passCard}>
      {/* Header: Member info */}
      <View style={styles.passCardHeader}>
        <View style={styles.passCardInfo}>
          <Text style={styles.passCardName} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={styles.passCardEmail} numberOfLines={1}>
            {item.email || 'No email registered'}
          </Text>
        </View>
      </View>

      {/* Direct 4-Switch Toggles */}
      <View style={styles.passTogglesRow}>
        {/* Archive Pass */}
        <View style={styles.passToggleItem}>
          <Text style={[styles.passToggleLabel, archiveOn && styles.passToggleLabelActive]}>
            Archive
          </Text>
          <Switch
            value={archiveOn}
            onValueChange={() => onTogglePass(item, 'can_access_archive')}
            trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
            thumbColor="#ffffff"
            style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
          />
        </View>

        {/* Ongoing Pass */}
        <View style={styles.passToggleItem}>
          <Text style={[styles.passToggleLabel, ongoingOn && styles.passToggleLabelActive]}>
            Ongoing
          </Text>
          <Switch
            value={ongoingOn}
            onValueChange={() => onTogglePass(item, 'can_access_ongoing')}
            trackColor={{ false: '#e2e8f0', true: '#10b981' }}
            thumbColor="#ffffff"
            style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
          />
        </View>

        {/* Pre-Rehearsal Pass */}
        <View style={styles.passToggleItem}>
          <Text style={[styles.passToggleLabel, preRehOn && styles.passToggleLabelActive]}>
            Pre-Reh
          </Text>
          <Switch
            value={preRehOn}
            onValueChange={() => onTogglePass(item, 'can_access_pre_rehearsal')}
            trackColor={{ false: '#e2e8f0', true: '#f59e0b' }}
            thumbColor="#ffffff"
            style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
          />
        </View>

        {/* Annotation Pass */}
        <View style={styles.passToggleItem}>
          <Text style={[styles.passToggleLabel, annotateOn && styles.passToggleLabelActive]}>
            Annotate
          </Text>
          <Switch
            value={annotateOn}
            onValueChange={() => onTogglePass(item, 'canAnnotate')}
            trackColor={{ false: '#e2e8f0', true: '#0284c7' }}
            thumbColor="#ffffff"
            style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
          />
        </View>
      </View>
    </View>
  );
}
