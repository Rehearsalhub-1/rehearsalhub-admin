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
import { Ionicons } from '@expo/vector-icons';
import { styles } from './scheduleStyles';

interface ScheduleGenericItemModalProps {
  visible: boolean;
  onClose: () => void;
  activeTab: string;
  field1: string;
  setField1: (val: string) => void;
  field2: string;
  setField2: (val: string) => void;
  field3: string;
  setField3: (val: string) => void;
  field4: string;
  setField4: (val: string) => void;
  field5: string;
  setField5: (val: string) => void;
  genericBool: boolean;
  setGenericBool: (val: boolean) => void;
  onSave: () => void;
}

export default function ScheduleGenericItemModal({
  visible,
  onClose,
  activeTab,
  field1,
  setField1,
  field2,
  setField2,
  field3,
  setField3,
  field4,
  setField4,
  field5,
  setField5,
  genericBool,
  setGenericBool,
  onSave,
}: ScheduleGenericItemModalProps) {
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
            <Text style={styles.sheetTitle}>
              {activeTab === 'new'
                ? 'Add New Song Submission'
                : activeTab === 'carried'
                ? 'Add Carried Over Song'
                : activeTab === 'swapped'
                ? 'Record Swapped Song'
                : activeTab === 'renamed'
                ? 'Record Name Change'
                : activeTab === 'invalid'
                ? 'Add Invalid Song'
                : 'Manage Submitter'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {activeTab === 'new' && (
                <>
                  <Text style={styles.inputLabel}>Song Title</Text>
                  <TextInput style={styles.sheetInput} value={field1} onChangeText={setField1} placeholder="Title" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Key</Text>
                  <TextInput style={styles.sheetInput} value={field2} onChangeText={setField2} placeholder="Key (e.g. C, Ab)" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Duration</Text>
                  <TextInput style={styles.sheetInput} value={field3} onChangeText={setField3} placeholder="e.g. 5:20" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Submitted By</Text>
                  <TextInput style={styles.sheetInput} value={field4} onChangeText={setField4} placeholder="Minister name" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'carried' && (
                <>
                  <Text style={styles.inputLabel}>Song Title</Text>
                  <TextInput style={styles.sheetInput} value={field1} onChangeText={setField1} placeholder="Title" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Prior Rehearsal Count</Text>
                  <TextInput style={styles.sheetInput} value={field2} onChangeText={setField2} keyboardType="numeric" placeholder="1" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Original Program Name</Text>
                  <TextInput style={styles.sheetInput} value={field3} onChangeText={setField3} placeholder="Program" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Key</Text>
                  <TextInput style={styles.sheetInput} value={field4} onChangeText={setField4} placeholder="Key" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Reason for Carrying Over</Text>
                  <TextInput style={styles.sheetInput} value={field5} onChangeText={setField5} placeholder="e.g. More practice needed" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'swapped' && (
                <>
                  <Text style={styles.inputLabel}>Original Song Title</Text>
                  <TextInput style={styles.sheetInput} value={field1} onChangeText={setField1} placeholder="Original" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Replacement Song Title</Text>
                  <TextInput style={styles.sheetInput} value={field2} onChangeText={setField2} placeholder="Replacement" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Swapped By</Text>
                  <TextInput style={styles.sheetInput} value={field3} onChangeText={setField3} placeholder="Director name" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Reason</Text>
                  <TextInput style={styles.sheetInput} value={field5} onChangeText={setField5} placeholder="Reason for swap" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'renamed' && (
                <>
                  <Text style={styles.inputLabel}>Original Title</Text>
                  <TextInput style={styles.sheetInput} value={field1} onChangeText={setField1} placeholder="From" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>New Confirmed Title</Text>
                  <TextInput style={styles.sheetInput} value={field2} onChangeText={setField2} placeholder="To" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Changed By</Text>
                  <TextInput style={styles.sheetInput} value={field3} onChangeText={setField3} placeholder="Author or Director" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Reason</Text>
                  <TextInput style={styles.sheetInput} value={field5} onChangeText={setField5} placeholder="Reason" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'invalid' && (
                <>
                  <Text style={styles.inputLabel}>Invalid Song Title</Text>
                  <TextInput style={styles.sheetInput} value={field1} onChangeText={setField1} placeholder="Title" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Invalidated By</Text>
                  <TextInput style={styles.sheetInput} value={field2} onChangeText={setField2} placeholder="HQ Admin / Reviewer" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Replaced By (Optional)</Text>
                  <TextInput style={styles.sheetInput} value={field3} onChangeText={setField3} placeholder="Replacement song if any" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Reason</Text>
                  <TextInput style={styles.sheetInput} value={field5} onChangeText={setField5} placeholder="Reason for invalidation" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'eligibility' && (
                <>
                  <Text style={styles.inputLabel}>Submitter Name</Text>
                  <TextInput style={styles.sheetInput} value={field1} onChangeText={setField1} placeholder="Full Name" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Role</Text>
                  <TextInput style={styles.sheetInput} value={field2} onChangeText={setField2} placeholder="e.g. Vocal Lead, Tenor" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Quota Limit</Text>
                  <TextInput style={styles.sheetInput} value={field4} onChangeText={setField4} keyboardType="numeric" placeholder="3" placeholderTextColor="#94a3b8" />
                  <TouchableOpacity
                    style={[styles.blockToggleBtn, genericBool && styles.blockToggleBtnActive]}
                    onPress={() => setGenericBool(!genericBool)}
                  >
                    <Ionicons
                      name={genericBool ? 'ban' : 'checkmark-circle'}
                      size={16}
                      color={genericBool ? '#ef4444' : '#10b981'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.blockToggleBtnText, genericBool && { color: '#ef4444' }]}>
                      {genericBool ? 'Blocked from submitting' : 'Eligible to submit'}
                    </Text>
                  </TouchableOpacity>
                  {genericBool && (
                    <>
                      <Text style={styles.inputLabel}>Block Reason</Text>
                      <TextInput style={styles.sheetInput} value={field5} onChangeText={setField5} placeholder="e.g. Exceeded quota limit" placeholderTextColor="#94a3b8" />
                    </>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={onSave}>
                <Text style={styles.modalSubmitBtnText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
