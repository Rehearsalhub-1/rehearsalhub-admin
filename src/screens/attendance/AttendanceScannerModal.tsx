import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { scannerStyles as styles } from './scannerStyles';

interface AttendanceScannerModalProps {
  visible: boolean;
  onClose: () => void;
  torchOn: boolean;
  onToggleTorch: () => void;
  onBarcodeScanned: (event: { data: string }) => void;
  scanFeedback: {
    type: 'success' | 'duplicate' | 'error' | 'ready';
    title: string;
    message: string;
  };
  isProcessing: boolean;
}

export default function AttendanceScannerModal({
  visible,
  onClose,
  torchOn,
  onToggleTorch,
  onBarcodeScanned,
  scanFeedback,
  isProcessing,
}: AttendanceScannerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.scannerSafeArea}>
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isProcessing ? undefined : onBarcodeScanned}
          />

          <View style={styles.overlayLayer}>
            <View style={styles.scannerTopBar}>
              <TouchableOpacity
                style={styles.scannerControlBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>

              <Text style={styles.scannerScreenTitle}>Attendance Scanner</Text>

              <TouchableOpacity
                style={[styles.scannerControlBtn, torchOn && styles.scannerTorchActive]}
                onPress={onToggleTorch}
                activeOpacity={0.8}
              >
                <Ionicons name={torchOn ? 'flashlight' : 'flashlight-outline'} size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.viewfinderCenterWrap}>
              <View style={styles.viewfinderFrame}>
                <View style={[styles.reticleCorner, styles.cornerTopLeft]} />
                <View style={[styles.reticleCorner, styles.cornerTopRight]} />
                <View style={[styles.reticleCorner, styles.cornerBottomLeft]} />
                <View style={[styles.reticleCorner, styles.cornerBottomRight]} />
              </View>
              <Text style={styles.viewfinderHint}>
                Position singer's QR code within the frame
              </Text>
            </View>

            <View style={styles.scannerBottomHUD}>
              <View
                style={[
                  styles.feedbackCard,
                  scanFeedback.type === 'success' && styles.feedbackSuccess,
                  scanFeedback.type === 'duplicate' && styles.feedbackDuplicate,
                  scanFeedback.type === 'error' && styles.feedbackError,
                ]}
              >
                <View style={styles.feedbackIconWrap}>
                  <Ionicons
                    name={
                      scanFeedback.type === 'success'
                        ? 'checkmark-circle'
                        : scanFeedback.type === 'duplicate'
                        ? 'alert-circle'
                        : scanFeedback.type === 'error'
                        ? 'close-circle'
                        : 'scan-outline'
                    }
                    size={20}
                    color={
                      scanFeedback.type === 'success'
                        ? '#10b981'
                        : scanFeedback.type === 'duplicate'
                        ? '#f59e0b'
                        : scanFeedback.type === 'error'
                        ? '#ef4444'
                        : '#c4b5fd'
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedbackTitle}>{scanFeedback.title}</Text>
                  <Text style={styles.feedbackMessage}>{scanFeedback.message}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.scannerDoneBtn}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.scannerDoneBtnText}>Done Scanning</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
