import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styles } from './attendanceStyles';

interface AttendanceSessionControlsProps {
  isSessionOpen: boolean;
  togglingSession: boolean;
  onToggleSession: () => void;
}

export default function AttendanceSessionControls({
  isSessionOpen,
  togglingSession,
  onToggleSession,
}: AttendanceSessionControlsProps) {
  return (
    <View style={[styles.sessionBanner, isSessionOpen ? styles.sessionBannerOpen : styles.sessionBannerClosed]}>
      <View style={styles.sessionBannerLeft}>
        <View style={[styles.sessionDot, { backgroundColor: isSessionOpen ? '#10b981' : '#ef4444' }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.sessionTitle, { color: isSessionOpen ? '#065f46' : '#991b1b' }]}>
            {isSessionOpen ? 'Clock-in is OPEN' : 'Clock-in is CLOSED'}
          </Text>
          <Text style={[styles.sessionSub, { color: isSessionOpen ? '#047857' : '#b91c1c' }]}>
            {isSessionOpen
              ? 'Singers can scan QR or use geofence to check in'
              : 'Late arrivals are blocked from clocking in'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.sessionToggleBtn, { backgroundColor: isSessionOpen ? '#ef4444' : '#10b981' }]}
        onPress={onToggleSession}
        disabled={togglingSession}
        activeOpacity={0.8}
      >
        {togglingSession ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.sessionToggleBtnText}>
            {isSessionOpen ? 'Close Clock-in' : 'Open Clock-in'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
