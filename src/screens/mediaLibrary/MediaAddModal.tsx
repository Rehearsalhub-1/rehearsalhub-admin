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
import { MediaType } from './types';
import { styles } from './mediaLibraryStyles';
import { formatFileSize, getYouTubeId } from './mediaLibraryUtils';

interface MediaAddModalProps {
  visible: boolean;
  inputSource: 'device' | 'url';
  setInputSource: (val: 'device' | 'url') => void;
  selectedFile: { uri: string; name: string; type: string; size?: number } | null;
  selectedFiles?: Array<{ uri: string; name: string; type: string; size?: number }>;
  onRemoveSelectedFile?: (index: number) => void;
  bulkUploadProgress?: { current: number; total: number; currentName: string } | null;
  formTitle: string;
  setFormTitle: (val: string) => void;
  formUrl: string;
  setFormUrl: (val: string) => void;
  formCategory: MediaType;
  setFormCategory: (val: MediaType) => void;
  formNotes: string;
  setFormNotes: (val: string) => void;
  saving: boolean;
  onPickDocument: () => void;
  onClose: () => void;
  onSave: () => void;
}

const CATEGORIES = [
  { id: 'audio', label: 'Audio Stem', icon: 'musical-note' },
  { id: 'image', label: 'Photo / Image', icon: 'image' },
  { id: 'video', label: 'Video', icon: 'videocam' },
  { id: 'document', label: 'Sheet Music', icon: 'document-text' },
] as const;

export default function MediaAddModal({
  visible,
  inputSource,
  setInputSource,
  selectedFile,
  selectedFiles = [],
  onRemoveSelectedFile,
  bulkUploadProgress,
  formTitle,
  setFormTitle,
  formUrl,
  setFormUrl,
  formCategory,
  setFormCategory,
  formNotes,
  setFormNotes,
  saving,
  onPickDocument,
  onClose,
  onSave,
}: MediaAddModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Add to Media Library</Text>
                <Text style={styles.sheetSub}>Upload stems, photos, videos, or scores</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!saving) onClose();
                }}
                disabled={saving}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Simple 2-Way Source Selector */}
              <View style={styles.sourceSelector}>
                <TouchableOpacity
                  style={[styles.sourceBtn, inputSource === 'device' && styles.sourceBtnActive]}
                  onPress={() => setInputSource('device')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="folder-outline"
                    size={16}
                    color={inputSource === 'device' ? '#7c3aed' : '#64748b'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.sourceBtnText, inputSource === 'device' && styles.sourceBtnTextActive]}>
                    Choose File from Phone
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sourceBtn, inputSource === 'url' && styles.sourceBtnActive]}
                  onPress={() => setInputSource('url')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="link-outline"
                    size={16}
                    color={inputSource === 'url' ? '#7c3aed' : '#64748b'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.sourceBtnText, inputSource === 'url' && styles.sourceBtnTextActive]}>
                    Web or YouTube Link
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Source Option 1: File from Device */}
              {inputSource === 'device' ? (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Selected File{selectedFiles.length > 1 ? 's' : ''}</Text>
                  {selectedFiles.length > 1 ? (
                    <View>
                      <View style={styles.bulkBadgeRow}>
                        <View style={styles.bulkBadge}>
                          <Ionicons name="documents" size={13} color="#7c3aed" style={{ marginRight: 5 }} />
                          <Text style={styles.bulkBadgeText}>Bulk Upload: {selectedFiles.length} files selected</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.changeFileBtn}
                          onPress={onPickDocument}
                          disabled={saving}
                        >
                          <Text style={styles.changeFileText}>+ Add More</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView style={styles.bulkFilesScroll} nestedScrollEnabled={true}>
                        {selectedFiles.map((file, idx) => (
                          <View key={`${file.name}-${idx}`} style={styles.bulkFileRow}>
                            <Ionicons
                              name={
                                file.type.includes('audio') ? 'musical-notes' :
                                file.type.includes('video') ? 'videocam' :
                                file.type.includes('image') ? 'image' : 'document-text'
                              }
                              size={17}
                              color="#7c3aed"
                              style={{ marginRight: 8 }}
                            />
                            <Text style={styles.bulkFileName} numberOfLines={1}>
                              {file.name}
                            </Text>
                            <Text style={styles.bulkFileSize}>
                              {file.size ? formatFileSize(file.size) : ''}
                            </Text>
                            {!saving && onRemoveSelectedFile && (
                              <TouchableOpacity
                                onPress={() => onRemoveSelectedFile(idx)}
                                style={styles.bulkRemoveFileBtn}
                              >
                                <Ionicons name="close-circle" size={17} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </ScrollView>
                      <Text style={styles.bulkUploadNotice}>
                        Files will be uploaded with their filenames as display titles and categorized automatically.
                      </Text>
                    </View>
                  ) : selectedFile ? (
                    <View style={styles.fileSelectedBox}>
                      <Ionicons name="document-text" size={22} color="#7c3aed" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fileSelectedName} numberOfLines={1}>
                          {selectedFile.name}
                        </Text>
                        <Text style={styles.fileSelectedSize}>
                          {selectedFile.size ? formatFileSize(selectedFile.size) : 'Ready'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.changeFileBtn}
                        onPress={onPickDocument}
                        disabled={saving}
                      >
                        <Text style={styles.changeFileText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickFileCard}
                      onPress={onPickDocument}
                      activeOpacity={0.78}
                      disabled={saving}
                    >
                      <Ionicons name="cloud-upload-outline" size={28} color="#7c3aed" />
                      <Text style={styles.pickFileTitle}>Tap to Select File(s)</Text>
                      <Text style={styles.pickFileSub}>Bulk upload audio stems, photos, PDF scores, or videos</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* Source Option 2: Link */
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Media Link or YouTube URL *</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="https://youtube.com/watch?v=... or direct link"
                    placeholderTextColor="#94a3b8"
                    value={formUrl}
                    onChangeText={setFormUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {getYouTubeId(formUrl) ? (
                    <Text style={styles.ytTag}>✓ YouTube video recognized</Text>
                  ) : null}
                </View>
              )}

              {/* Title Field with Renaming Guidance (Hidden when multi-file bulk upload) */}
              {!(inputSource === 'device' && selectedFiles.length > 1) && (
                <View style={styles.formField}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <Text style={styles.fieldLabel}>File Name / Display Title *</Text>
                    <Text style={{ fontSize: 11, color: '#7c3aed', fontWeight: '700' }}>Rename freely</Text>
                  </View>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="e.g. Grace & Peace - Soprano Lead Stem"
                    placeholderTextColor="#94a3b8"
                    value={formTitle}
                    onChangeText={setFormTitle}
                  />
                  <Text style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                    You can rename this file as desired before uploading.
                  </Text>
                </View>
              )}

              {/* Category Options */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = formCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catBtn, isSelected && styles.catBtnSelected]}
                        onPress={() => setFormCategory(cat.id as MediaType)}
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

              {/* Optional Notes */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Rehearsal Notes (Optional)</Text>
                <TextInput
                  style={[styles.inputBox, styles.notesBox]}
                  placeholder="e.g. Practice key modulation at the second verse..."
                  placeholderTextColor="#94a3b8"
                  value={formNotes}
                  onChangeText={setFormNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetSaveBtn, saving && styles.sheetSaveBtnDisabled]}
                onPress={onSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetSaveText}>
                      {bulkUploadProgress
                        ? `Uploading ${bulkUploadProgress.current} of ${bulkUploadProgress.total}...`
                        : 'Saving...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetSaveText}>
                      {inputSource === 'device' && selectedFiles.length > 1
                        ? `Upload ${selectedFiles.length} Files`
                        : 'Save Media'}
                    </Text>
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
