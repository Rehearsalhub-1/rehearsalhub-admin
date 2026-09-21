import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './attendanceStyles';
import type { AttendanceRecord } from './types';

interface AttendanceRecordCardProps {
  item: AttendanceRecord;
}

export default function AttendanceRecordCard({ item }: AttendanceRecordCardProps) {
  const name = item.userName || item.user_name || 'Choir Singer';
  const initial = name.charAt(0).toUpperCase();
  const event = item.eventName || item.event_name || 'Rehearsal Session';
  const timeFormatted = item.checkInTime
    ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Present';

  return (
    <View style={styles.recordCard}>
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

      <View style={styles.statusBadge}>
        <Text style={styles.statusBadgeText}>Present</Text>
      </View>
    </View>
  );
}
