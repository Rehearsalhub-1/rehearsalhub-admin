import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './scheduleStyles';

interface ScheduleSlotModalProps {
  visible: boolean;
  onClose: () => void;
  editingSlotId: string | null;
  weekName: string;
  dayName: string;
  slotTime: string;
  setSlotTime: (val: string) => void;
  slotAllotment: string;
  setSlotAllotment: (val: string) => void;
  slotTitle: string;
  setSlotTitle: (val: string) => void;
  slotKey: string;
  setSlotKey: (val: string) => void;
  slotStatus: 'rehearsed' | 'not-rehearsed' | 'break';
  setSlotStatus: (val: 'rehearsed' | 'not-rehearsed' | 'break') => void;
  slotNote: string;
  setSlotNote: (val: string) => void;
  onSave: () => void;
}

export default function ScheduleSlotModal({
  visible,
  onClose,
  editingSlotId,
  weekName,
  dayName,
  slotTime,
  setSlotTime,
  slotAllotment,
  setSlotAllotment,
  slotTitle,
  setSlotTitle,
  slotKey,
  setSlotKey,
  slotStatus,
  setSlotStatus,
  slotNote,
  setSlotNote,
  onSave,
}: ScheduleSlotModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editingSlotId ? 'Edit Schedule Slot' : 'Add Timetable Slot'}</Text>
            <Text style={styles.sheetSub}>{weekName} • {dayName}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.formRowSplit}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Start Time (e.g. 09:00)</Text>
                  <TextInput
                    style={styles.sheetInput}
                    value={slotTime}
                    onChangeText={setSlotTime}
                    placeholder="09:00"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Allotment (Mins)</Text>
                  <TextInput
                    style={styles.sheetInput}
                    value={slotAllotment}
                    onChangeText={setSlotAllotment}
                    keyboardType="numeric"
                    placeholder="15"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Song or Session Title</Text>
              <TextInput
                style={styles.sheetInput}
                value={slotTitle}
                onChangeText={setSlotTitle}
                placeholder="e.g. Praise Medley / Vocal Warmup"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Key (Optional)</Text>
              <TextInput
                style={styles.sheetInput}
                value={slotKey}
                onChangeText={setSlotKey}
                placeholder="e.g. C, F#, Eb"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusSelectRow}>
                {(['not-rehearsed', 'rehearsed', 'break'] as const).map(s => {
                  const isSel = slotStatus === s;
                  const label = s === 'rehearsed' ? 'Rehearsed' : s === 'break' ? 'Break' : 'Pending';
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusSelectPill, isSel && styles.statusSelectPillActive]}
                      onPress={() => setSlotStatus(s)}
                    >
                      <Text style={[styles.statusSelectPillText, isSel && styles.statusSelectPillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Notes / Instructions</Text>
              <TextInput
                style={[styles.sheetInput, { height: 64, textAlignVertical: 'top' }]}
                value={slotNote}
                onChangeText={setSlotNote}
                placeholder="Vocal guidance, horn cue, modulation, etc."
                placeholderTextColor="#94a3b8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={onSave}>
                <Text style={styles.modalSubmitBtnText}>Save Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
