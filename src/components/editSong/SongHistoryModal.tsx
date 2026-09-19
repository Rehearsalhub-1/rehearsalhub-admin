import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './editSongStyles';

export interface SongHistoryModalProps {
  // List modal
  showHistoryList: boolean;
  onCloseHistoryList: () => void;
  historyEntries: any[];
  onEditEntry: (entry: any) => void;
  onDeleteEntry: (entryId: string) => void;
  formatHistoryType: (type: string) => string;
  isTablet?: boolean;

  // Form modal
  showHistoryForm: boolean;
  editingHistoryEntryId: string | null;
  historyFormType: string;
  historyFormTitle: string;
  setHistoryFormTitle: (title: string) => void;
  historyFormDesc: string;
  setHistoryFormDesc: (desc: string) => void;
  originalHistoryValues: any;
  setOriginalHistoryValues: React.Dispatch<React.SetStateAction<any>>;
  onSaveHistoryEntry: () => void;
  onCloseHistoryForm: () => void;
  insetsBottom?: number;
}

export default function SongHistoryModal({
  showHistoryList,
  onCloseHistoryList,
  historyEntries,
  onEditEntry,
  onDeleteEntry,
  formatHistoryType,
  isTablet = false,

  showHistoryForm,
  editingHistoryEntryId,
  historyFormType,
  historyFormTitle,
  setHistoryFormTitle,
  historyFormDesc,
  setHistoryFormDesc,
  originalHistoryValues,
  setOriginalHistoryValues,
  onSaveHistoryEntry,
  onCloseHistoryForm,
  insetsBottom = 0,
}: SongHistoryModalProps) {
  return (
    <>
      {/* ── Version History List Sheet Modal ─────────────────────────────── */}
      <Modal visible={showHistoryList} transparent animationType="slide" onRequestClose={onCloseHistoryList}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.historyListSheet, isTablet && styles.historySheetCentered]}>
            <View style={styles.historySheetHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.historySheetTitle}>Song Version History</Text>
                <Text style={styles.historySheetSubtitle}>
                  View and manage previous iterations of this song's metadata, lyrics, and solfas.
                </Text>
              </View>
              <TouchableOpacity
                onPress={onCloseHistoryList}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420, paddingHorizontal: 16, paddingTop: 12 }}>
              {historyEntries.length > 0 ? (
                historyEntries.map(h => (
                  <View key={h.id} style={styles.webHistoryCard}>
                    <View style={styles.webHistoryCardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.webHistoryTagRow}>
                          <View style={styles.webHistoryTypeBadge}>
                            <Text style={styles.webHistoryTypeBadgeText}>{formatHistoryType(h.type || 'song-details')}</Text>
                          </View>
                          <Text style={styles.webHistoryDateText}>
                            {h.created_at ? new Date(h.created_at).toLocaleString() : h.date || 'Recent'}
                          </Text>
                        </View>
                        <Text style={styles.webHistoryTitleText}>{h.title}</Text>
                        {h.description && h.description !== h.title ? (
                          <Text style={styles.webHistoryDescText}>{h.description}</Text>
                        ) : null}
                        <Text style={styles.webHistoryAuthorText}>Created by: {h.created_by || 'Coordinator'}</Text>
                      </View>
                      <View style={styles.webHistoryActionsRow}>
                        <TouchableOpacity
                          style={styles.webHistoryEditBtn}
                          onPress={() => onEditEntry(h)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="create-outline" size={16} color="#16a34a" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.webHistoryDeleteBtn}
                          onPress={() => onDeleteEntry(h.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={44} color="#cbd5e1" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginTop: 10 }}>
                    No history entries found for this song.
                  </Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
                    Create your first history entry using the "Add History" buttons.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeHistorySheetBtn}
              onPress={onCloseHistoryList}
            >
              <Text style={styles.closeHistorySheetBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Add / Edit History Form Modal (Web Admin 1:1 Parity) ──────────── */}
      <Modal visible={showHistoryForm} transparent animationType="slide" onRequestClose={onCloseHistoryForm}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.pickerOverlay}>
          <View style={[styles.historyListSheet, isTablet && styles.historySheetCentered, { paddingBottom: Math.max(insetsBottom, 16) }]}>
            <View style={styles.historySheetHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.historySheetTitle} numberOfLines={1}>
                  {editingHistoryEntryId ? 'Update History Entry' : `Save ${formatHistoryType(historyFormType)} Version`}
                </Text>
                <Text style={styles.historySheetSubtitle}>
                  {editingHistoryEntryId
                    ? 'Update the selected history entry'
                    : `Create a history entry for the current ${formatHistoryType(historyFormType).toLowerCase()} content`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onCloseHistoryForm}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440, paddingHorizontal: 16, paddingTop: 12 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Version Title *</Text>
              <TextInput
                style={[styles.inputPrimary, { marginBottom: 12 }]}
                value={historyFormTitle}
                onChangeText={setHistoryFormTitle}
                placeholder="e.g., Lyrics Version 1.2"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.historyTypeHeaderRow}>
                <Text style={styles.fieldLabel}>SECTION / REVISION TYPE</Text>
                <View style={styles.singleTypeBadge}>
                  <Ionicons name="bookmark" size={12} color="#1e40af" style={{ marginRight: 5 }} />
                  <Text style={styles.singleTypeBadgeText}>
                    {formatHistoryType(historyFormType)}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.inputPrimary, styles.multilineEditor, { minHeight: 60, marginBottom: 12 }]}
                multiline
                numberOfLines={2}
                value={historyFormDesc}
                onChangeText={setHistoryFormDesc}
                placeholder="What changed in this version?"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.fieldLabel}>Historical Snapshot</Text>
              <TextInput
                style={[styles.inputPrimary, styles.multilineEditor, styles.fontMono, { minHeight: 70, fontSize: 12, marginBottom: 12 }]}
                multiline
                value={typeof originalHistoryValues.new_value === 'string' ? originalHistoryValues.new_value : JSON.stringify(originalHistoryValues.new_value, null, 2)}
                onChangeText={v => setOriginalHistoryValues((prev: any) => ({ ...prev, new_value: v }))}
                placeholder="Historical content snapshot..."
                placeholderTextColor="#94a3b8"
              />

              {/* Blue Info Box matching Web Admin */}
              <View style={styles.webHistoryInfoCallout}>
                <Ionicons name="information-circle" size={18} color="#1e40af" style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.webHistoryInfoCalloutText}>
                  {editingHistoryEntryId
                    ? 'History entry will be updated with your changes.'
                    : `Current ${formatHistoryType(historyFormType)} content will be saved as a new version.`}
                  {'\n'}You can create multiple versions and switch between them later.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.historyFormActionsRow}>
              <TouchableOpacity
                style={styles.historyFormCancelBtn}
                onPress={onCloseHistoryForm}
              >
                <Text style={styles.historyFormCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.historyFormSaveBtn}
                onPress={onSaveHistoryEntry}
              >
                <Text style={styles.historyFormSaveBtnText}>Save & Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
