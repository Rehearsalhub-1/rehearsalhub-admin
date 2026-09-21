import React from 'react';
import {
  View,
  Text,
  Modal,
  KeyboardAvoidingView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './attendanceStyles';

interface AttendanceCheckInModalProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  setName: (val: string) => void;
  event: string;
  setEvent: (val: string) => void;
  onSubmit: () => void;
}

export default function AttendanceCheckInModal({
  visible,
  onClose,
  name,
  setName,
  event,
  setEvent,
  onSubmit,
}: AttendanceCheckInModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.actionSheetOverlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.actionSheetContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={styles.grabBar} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manual Clock-In</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 6 }}>
            <Text style={styles.inputLabel}>Singer Full Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. David Adeyemi"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Rehearsal Event</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Saturday Praise Night Rehearsal"
              placeholderTextColor="#94a3b8"
              value={event}
              onChangeText={setEvent}
            />

            <TouchableOpacity
              style={styles.submitManualBtn}
              onPress={onSubmit}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.submitManualBtnText}>Log Attendance</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
