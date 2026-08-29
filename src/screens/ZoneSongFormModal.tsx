import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import { useZoneContext } from '../context/ZoneContext';

export interface ZoneSong {
  id: string;
  title?: string;
  writer?: string;
  key?: string;
  tempo?: string;
  category?: string;
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
  const { activeZone } = useZoneContext();
  const [form, setForm] = useState({ title: '', writer: '', key: '', tempo: '', category: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editSong) {
      setForm({
        title: editSong.title || '',
        writer: editSong.writer || '',
        key: editSong.key || '',
        tempo: editSong.tempo || '',
        category: editSong.category || '',
      });
    } else {
      setForm({ title: '', writer: '', key: '', tempo: '', category: '' });
    }
    setFormError('');
  }, [editSong, visible]);

  async function handleSave() {
    if (!form.title.trim()) { setFormError('Song title is required.'); return; }
    setSaving(true);
    try {
      if (editSong) {
        await apiClient.patch(`/subgroups/songs/${editSong.id}`, {
          title: form.title.trim(),
          writer: form.writer.trim(),
          key: form.key.trim(),
          tempo: form.tempo.trim(),
          category: form.category.trim(),
        });
      } else {
        await apiClient.post('/subgroups/songs', {
          title: form.title.trim(),
          writer: form.writer.trim(),
          key: form.key.trim(),
          tempo: form.tempo.trim(),
          category: form.category.trim(),
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
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: Colors.textPrimary, fontSize: 17, fontWeight: '800' }}>{editSong ? 'Edit Zone Song' : 'Add Zone Song'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          {formError ? <Text style={{ color: Colors.danger, fontSize: 12, marginBottom: 8 }}>{formError}</Text> : null}
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'Title *', key: 'title', placeholder: 'Song title' },
              { label: 'Writer', key: 'writer', placeholder: 'Composer / songwriter' },
              { label: 'Key', key: 'key', placeholder: 'e.g. C Major' },
              { label: 'Tempo', key: 'tempo', placeholder: 'e.g. 80' },
              { label: 'Category', key: 'category', placeholder: 'e.g. Worship' },
            ].map(field => (
              <View key={field.key} style={{ marginBottom: 12 }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[field.key]}
                  onChangeText={t => { setForm(p => ({ ...p, [field.key]: t })); setFormError(''); }}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            ))}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
