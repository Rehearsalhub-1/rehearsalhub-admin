import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AttendanceLiveQrModalProps {
  visible: boolean;
  onClose: () => void;
  zoneId?: string;
  eventName?: string;
}

export function generateLiveCode(prefix = 'RH'): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${token}`;
}

export default function AttendanceLiveQrModal({
  visible,
  onClose,
  zoneId = 'zone-001',
  eventName = 'Rehearsal',
}: AttendanceLiveQrModalProps) {
  const insets = useSafeAreaInsets();
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const [qrPayload, setQrPayload] = useState(() => `LW-ATTEND-${zoneId}-${Math.floor(Date.now() / 1000)}-${generateLiveCode()}`);
  const [displayCode, setDisplayCode] = useState(() => generateLiveCode());
  const progressAnim = useRef(new Animated.Value(1)).current;

  const rotateCode = () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const code = generateLiveCode();
    setDisplayCode(code);
    setQrPayload(`LW-ATTEND-${zoneId}-${timestamp}-${code}`);
    setSecondsRemaining(4);

    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 4000,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    if (!visible) return;

    rotateCode();

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          rotateCode();
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      progressAnim.stopAnimation();
    };
  }, [visible, zoneId]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Rehearsal Attendance QR</Text>
              <Text style={styles.subtitle}>{eventName} • 4s High-Security Rotation</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* QR Container */}
          <View style={styles.qrCard}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrPayload}
                size={230}
                color="#0f172a"
                backgroundColor="#ffffff"
              />
            </View>

            {/* Live Rotating Code Text */}
            <View style={styles.codeRow}>
              <Ionicons name="shield-checkmark" size={18} color="#7c3aed" />
              <Text style={styles.codeText}>{displayCode}</Text>
            </View>

            {/* 4-Second Countdown Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <View style={styles.timerRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={styles.timerText}>Regenerates in {secondsRemaining}s</Text>
              </View>
            </View>
          </View>

          {/* Security Instruction Footer */}
          <View style={styles.footer}>
            <Ionicons name="lock-closed-outline" size={15} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={styles.footerText}>
              Screenshots are invalid. Code expires every 4 seconds.
            </Text>
          </View>

          {/* Manual Refresh Button */}
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={rotateCode}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color="#7c3aed" style={{ marginRight: 6 }} />
            <Text style={styles.refreshBtnText}>Regenerate Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  qrCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#faf5ff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e9d5ff',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  qrWrapper: {
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7c3aed',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  progressContainer: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 3,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    width: '100%',
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c3aed',
  },
});
