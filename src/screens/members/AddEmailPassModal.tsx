import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './membersStyles';

interface AddEmailPassModalProps {
  visible: boolean;
  onClose: () => void;
  email: string;
  onChangeEmail: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export default function AddEmailPassModal({
  visible,
  onClose,
  email,
  onChangeEmail,
  onSubmit,
  loading,
}: AddEmailPassModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Grant Feature Pass by Email</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Enter the singer's registered email address to instantly grant them full access to Archive, Ongoing, Pre-Rehearsal, and Annotation.
          </Text>

          <TextInput
            style={styles.modalInput}
            placeholder="singer@loveworldsingers.org"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={onChangeEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.modalActionsRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, loading && styles.btnDisabled]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Grant Pass</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
