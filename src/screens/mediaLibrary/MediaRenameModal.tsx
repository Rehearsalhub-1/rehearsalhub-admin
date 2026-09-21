import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem, MediaType } from './types';
import { styles } from './mediaLibraryStyles';

interface MediaRenameModalProps {
  renamingItem: MediaItem | null;
  renameTitle: string;
  setRenameTitle: (val: string) => void;
  renameCategory: MediaType;
  setRenameCategory: (val: MediaType) => void;
  renameNotes: string;
  setRenameNotes: (val: string) => void;
  renaming: boolean;
  onClose: () => void;
  onSave: () => void;
}

const CATEGORIES = [
  { id: 'audio', label: 'Audio Stem', icon: 'musical-note' },
  { id: 'image', label: 'Photo / Image', icon: 'image' },
  { id: 'video', label: 'Video', icon: 'videocam' },
  { id: 'document', label: 'Sheet Music', icon: 'document-text' },
] as const;

export default function MediaRenameModal({
  renamingItem,
  renameTitle,
  setRenameTitle,
  renameCategory,
  setRenameCategory,
  renameNotes,
  setRenameNotes,
  renaming,
  onClose,
  onSave,
}: MediaRenameModalProps) {
  return (
    <Modal
      visible={!!renamingItem}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (!renaming) onClose();
      }}
    >
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Rename Media File</Text>
                <Text style={styles.sheetSub}>Update file title, category and notes</Text>
              </View>
              <TouchableOpacity onPress={onClose} disabled={renaming} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>File Name / Title *</Text>
                <TextInput
                  style={styles.inputBox}
                  placeholder="Enter clean file name..."
                  placeholderTextColor="#94a3b8"
                  value={renameTitle}
                  onChangeText={setRenameTitle}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = renameCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catBtn, isSelected && styles.catBtnSelected]}
                        onPress={() => setRenameCategory(cat.id as MediaType)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={14}
                          color={isSelected ? '#ffffff' : '#475569'}
                          style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.catBtnText, isSelected && styles.catBtnTextSelected]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Rehearsal Notes</Text>
                <TextInput
                  style={[styles.inputBox, styles.notesBox]}
                  placeholder="Optional notes or singer directions..."
                  placeholderTextColor="#94a3b8"
                  value={renameNotes}
                  onChangeText={setRenameNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={onClose}
                disabled={renaming}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetSaveBtn, renaming && styles.sheetSaveBtnDisabled]}
                onPress={onSave}
                disabled={renaming}
                activeOpacity={0.85}
              >
                {renaming ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetSaveText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetSaveText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
