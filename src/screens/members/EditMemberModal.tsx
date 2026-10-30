import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './membersStyles';
import type { Member } from '../../hooks/useMembers';

interface EditMemberModalProps {
  visible: boolean;
  member: Member | null;
  onClose: () => void;
  onSave: (updated: { firstName: string; lastName: string; phone: string; designation: string; role?: Member['role'] }) => Promise<void>;
  loading: boolean;
  isChurchMode?: boolean;
}

export default function EditMemberModal({
  visible,
  member,
  onClose,
  onSave,
  loading,
  isChurchMode = false,
}: EditMemberModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState<Member['role']>('member');

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name || '');
      setLastName(member.last_name || '');
      setPhone(member.phone || '');
      setDesignation(member.designation || '');
      setRole(member.role || 'member');
    }
  }, [member]);

  const handleSubmit = () => {
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      designation: designation.trim(),
      role,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxHeight: '90%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Member Profile</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Update this singer's name and details. Changes will reflect in attendance and directories immediately.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>FIRST NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. David"
              placeholderTextColor="#94a3b8"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />

            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>LAST NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Kalaya"
              placeholderTextColor="#94a3b8"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>PHONE NUMBER</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. +234 812 345 6789"
              placeholderTextColor="#94a3b8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>VOICE PART / DESIGNATION</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Soprano, Tenor, Alto, Bass"
              placeholderTextColor="#94a3b8"
              value={designation}
              onChangeText={setDesignation}
              autoCapitalize="words"
            />

            {member?.role !== 'hq_admin' && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6 }}>MEMBER ROLE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  {(
                    isChurchMode
                      ? [
                          { id: 'member', label: 'Singer' },
                          { id: 'church_admin', label: 'Church Admin' },
                        ]
                      : [
                          { id: 'member', label: 'Singer' },
                          { id: 'church_admin', label: 'Church Admin' },
                          { id: 'zone_admin', label: 'Zone Admin' },
                        ]
                  ).map(opt => {
                    const isSelected =
                      opt.id === 'zone_admin'
                        ? role === 'zone_admin' || role === 'zone_coordinator'
                        : role === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isSelected ? '#7c3aed' : '#e2e8f0',
                          backgroundColor: isSelected ? '#f5f3ff' : '#f8fafc',
                          alignItems: 'center',
                        }}
                        onPress={() => setRole(opt.id as Member['role'])}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isSelected ? '#7c3aed' : '#475569',
                          }}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalActionsRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
