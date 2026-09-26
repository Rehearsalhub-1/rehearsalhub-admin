import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './attendanceStyles';
import type { AttendanceRecord } from './types';

interface AttendanceRecordCardProps {
  item: AttendanceRecord;
  onPress?: (item: AttendanceRecord) => void;
}

export default function AttendanceRecordCard({ item, onPress }: AttendanceRecordCardProps) {
  const name = item.userName || item.user_name || 'Choir Singer';
  const initial = name.charAt(0).toUpperCase();
  const event = item.eventName || item.event_name || 'Rehearsal Session';
  const timeFormatted = item.checkInTime
    ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Present';

  return (
    <TouchableOpacity
      style={styles.recordCard}
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <View style={styles.avatarInitialWrap}>
          <Text style={styles.avatarInitialText}>{initial}</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <View style={styles.recordMeta}>
        <View style={styles.nameRow}>
          <Text style={styles.singerName} numberOfLines={1}>
            {name}
          </Text>
          {item.isManual ? (
            <View style={styles.manualTag}>
              <Text style={styles.manualTagText}>Manual</Text>
            </View>
          ) : (
            <View style={styles.scanTag}>
              <Ionicons name="scan" size={9} color="#7c3aed" style={{ marginRight: 2 }} />
              <Text style={styles.scanTagText}>Scanned</Text>
            </View>
          )}
        </View>
        <Text style={styles.recordSub} numberOfLines={1}>
          {event} • {timeFormatted}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>Present</Text>
        </View>
        <Ionicons name="qr-code-outline" size={16} color="#7c3aed" />
      </View>
    </TouchableOpacity>
  );
}
