import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import { useZoneContext } from '../context/ZoneContext';
import MediaSelectionModal from './MediaSelectionModal';

export interface ZoneSong {
  id: string;
  title?: string;
  writer?: string;
  key?: string;
  tempo?: string;
  category?: string;
  audioFile?: string;
  zoneId?: string;
  subGroupId?: string;
}

interface ZoneSongFormModalProps {
  visible: boolean;
  editSong: ZoneSong | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ZoneSongFormModal({ visible, editSong, onClose, onSaved }: ZoneSongFormModalProps) {
  const insets = useSafeAreaInsets();
  const { activeZone } = useZoneContext();
  const [form, setForm] = useState({ title: '', writer: '', key: '', tempo: '', category: '', audioFile: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  useEffect(() => {
    if (editSong) {
      setForm({
        title: editSong.title || '',
        writer: editSong.writer || '',
        key: editSong.key || '',
        tempo: editSong.tempo || '',
        category: editSong.category || '',
        audioFile: editSong.audioFile || '',
      });
    } else {
      setForm({ title: '', writer: '', key: '', tempo: '', category: '', audioFile: '' });
    }
    setFormError('');
  }, [editSong, visible]);

  async function handleSave() {
    if (!form.title.trim()) { setFormError('Song title is required.'); return; }
    setSaving(true);
    try {
      if (editSong) {
        await api.songs.updateSubgroupSong(editSong.id, {
          title: form.title.trim(),
          writer: form.writer.trim(),
          key: form.key.trim(),
          tempo: form.tempo.trim(),
          category: form.category.trim(),
          audioFile: form.audioFile.trim(),
        });
      } else {
        await api.songs.createSubgroupSong({
          title: form.title.trim(),
          writer: form.writer.trim(),
          key: form.key.trim(),
          tempo: form.tempo.trim(),
          category: form.category.trim(),
          audioFile: form.audioFile.trim(),
          zoneId: activeZone?.id,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setFormError(e.message || 'Failed to save song.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View
            style={[
              styles.sheetCard,
              {
                marginTop: Math.max(insets.top + 20, 60),
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.dragHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
                {editSong ? 'Edit Zone Song' : 'Add Zone Song'}
              </Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {formError ? <Text style={{ color: Colors.danger, fontSize: 12, marginBottom: 8, fontWeight: '600' }}>{formError}</Text> : null}
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Title *', key: 'title', placeholder: 'Song title' },
                { label: 'Writer', key: 'writer', placeholder: 'Composer / songwriter' },
                { label: 'Key', key: 'key', placeholder: 'e.g. C Major' },
                { label: 'Tempo', key: 'tempo', placeholder: 'e.g. 80 BPM' },
                { label: 'Category', key: 'category', placeholder: 'e.g. Worship' },
              ].map(field => (
                <View key={field.key} style={{ marginBottom: 12 }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(form as any)[field.key]}
                    onChangeText={t => { setForm(p => ({ ...p, [field.key]: t })); setFormError(''); }}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              ))}

              {/* Audio File with Pick from Media Library */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: '700' }}>Audio File / Link</Text>
                  <TouchableOpacity
                    onPress={() => setShowMediaModal(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1, borderColor: '#ddd6fe' }}
                  >
                    <Ionicons name="folder-open-outline" size={12} color="#7c3aed" style={{ marginRight: 3 }} />
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#7c3aed' }}>Pick from Media Library</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={form.audioFile}
                  onChangeText={t => setForm(p => ({ ...p, audioFile: t }))}
                  placeholder="https://... audio URL"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editSong ? 'Save Changes' : 'Add Song'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      <MediaSelectionModal
        visible={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        allowedType="audio"
        title="Select Song Audio"
        onSelect={(url) => {
          setForm(p => ({ ...p, audioFile: url }));
          setShowMediaModal(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
});
