import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface OTAUpdateModalProps {
  visible: boolean;
  appName?: string;
  onLater?: () => void;
  onDismiss?: () => void;
}

export default function OTAUpdateModal({
  visible,
  appName = 'RehearsalHub Studio',
  onLater,
  onDismiss,
}: OTAUpdateModalProps) {
  const [isRestarting, setIsRestarting] = useState(false);
  const handleDismiss = onLater || onDismiss || (() => {});

  const handleRestartNow = async () => {
    setIsRestarting(true);
    // Small delay so the spinner renders before the JS bridge reloads
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      await Updates.reloadAsync();
    } catch (err) {
      console.warn('[OTA] Reload failed:', err);
      setIsRestarting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => !isRestarting && handleDismiss()}
    >
      {/* Full-screen restart overlay — shown while reloading */}
      {isRestarting ? (
        <View style={styles.restartingOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.restartingTitle}>Applying Update…</Text>
          <Text style={styles.restartingSubtitle}>
            Just a moment, {appName} is restarting with the latest version.
          </Text>
        </View>
      ) : (
        /* Normal update-ready card */
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="sparkles" size={28} color={Colors.accent} />
            </View>

            <Text style={styles.title}>Update Ready ✨</Text>
            <Text style={styles.body}>
              A new version of <Text style={styles.bold}>{appName}</Text> has been
              downloaded and is ready to apply. Restart now to get the latest features
              and fixes — it only takes a second!
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleRestartNow} activeOpacity={0.85}>
              <Ionicons name="refresh-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>Restart Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleDismiss} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  bold: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Full-screen overlay shown while reloading
  restartingOverlay: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  restartingTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  restartingSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
