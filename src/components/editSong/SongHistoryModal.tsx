import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MediaSelectionModal from '../MediaSelectionModal';
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

  // Add / Audio features
  onAddHistory?: (typeKey?: string, fromList?: boolean) => void;
  currentSongAudioFile?: string;
  playingAudioUrl?: string | null;
  onTogglePlay?: (url: string) => void;
  audioLoading?: boolean;

  // Form modal
  showHistoryForm: boolean;
  editingHistoryEntryId: string | null;
  historyFormType: string;
  setHistoryFormType?: (type: string) => void;
  historyFormTitle: string;
  setHistoryFormTitle: (title: string) => void;
  historyFormDesc: string;
  setHistoryFormDesc: (desc: string) => void;
  originalHistoryValues: any;
  setOriginalHistoryValues: React.Dispatch<React.SetStateAction<any>>;
  onSaveHistoryEntry: () => void;
  onCloseHistoryForm: () => void;
  onSelectHistoryType?: (typeKey: string) => void;
  insetsBottom?: number;

  // Current Song Meta for Visual Checkpoint Card
  songTitle?: string;
  songKey?: string;
  songTempo?: string;
  songCategories?: string[];
  songStatus?: string;
}

export default function SongHistoryModal({
  showHistoryList,
  onCloseHistoryList,
  historyEntries,
  onEditEntry,
  onDeleteEntry,
  formatHistoryType,
  isTablet = false,

  onAddHistory,
  currentSongAudioFile = '',
  playingAudioUrl = null,
  onTogglePlay,
  audioLoading = false,

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
  onSelectHistoryType,
  insetsBottom = 0,

  songTitle = '',
  songKey = '',
  songTempo = '',
  songCategories = [],
  songStatus = '',
}: SongHistoryModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'audio' | 'lyrics' | 'details' | 'personnel'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSnapshots, setExpandedSnapshots] = useState<Record<string, boolean>>({});
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showRawEditor, setShowRawEditor] = useState(false);

  const toggleSnapshot = (id: string) => {
    setExpandedSnapshots(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getEntryAudioUrl = (entry: any): string | null => {
    if (entry?.audioUrl && typeof entry.audioUrl === 'string' && entry.audioUrl.trim().startsWith('http')) {
      return entry.audioUrl.trim();
    }
    const val = entry?.new_value ?? entry?.newValue ?? entry?.old_value ?? entry?.oldValue ?? '';
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (
        trimmed.startsWith('http') ||
        trimmed.includes('.mp3') ||
        trimmed.includes('.wav') ||
        trimmed.includes('.m4a') ||
        trimmed.includes('.aac') ||
        trimmed.includes('.opus')
      ) {
        return trimmed;
      }
    }
    return null;
  };

  const isAudioEntry = (entry: any): boolean => {
    const t = (entry?.type || '').toLowerCase();
    return t === 'audio' || Boolean(getEntryAudioUrl(entry));
  };

  const audioCount = useMemo(() => historyEntries.filter(isAudioEntry).length, [historyEntries]);
  const lyricsCount = useMemo(
    () => historyEntries.filter(h => (h.type || '').toLowerCase() === 'lyrics').length,
    [historyEntries]
  );
  const detailsCount = useMemo(
    () => historyEntries.filter(h => (h.type || '').includes('details')).length,
    [historyEntries]
  );
  const personnelCount = useMemo(
    () => historyEntries.filter(h => (h.type || '').toLowerCase() === 'personnel').length,
    [historyEntries]
  );

  const filterTabs = useMemo(() => {
    return [
      { key: 'all' as const, label: 'All', count: historyEntries.length },
      { key: 'audio' as const, label: 'Audio', count: audioCount, icon: 'musical-notes' },
      { key: 'lyrics' as const, label: 'Lyrics', count: lyricsCount, icon: 'document-text' },
      { key: 'details' as const, label: 'Details', count: detailsCount, icon: 'information-circle' },
      ...(personnelCount > 0
        ? [{ key: 'personnel' as const, label: 'Personnel', count: personnelCount, icon: 'people' }]
        : []),
    ];
  }, [historyEntries.length, audioCount, lyricsCount, detailsCount, personnelCount]);

  const filteredEntries = useMemo(() => {
    return historyEntries.filter(entry => {
      // 1. Tab filter
      if (selectedFilter === 'audio' && !isAudioEntry(entry)) return false;
      if (selectedFilter === 'lyrics' && (entry.type || '').toLowerCase() !== 'lyrics') return false;
      if (selectedFilter === 'details' && !(entry.type || '').includes('details')) return false;
      if (selectedFilter === 'personnel' && (entry.type || '').toLowerCase() !== 'personnel') return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (entry.title || '').toLowerCase();
        const desc = (entry.description || '').toLowerCase();
        const notes = (entry.notes || '').toLowerCase();
        const url = (getEntryAudioUrl(entry) || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || notes.includes(q) || url.includes(q);
      }

      return true;
    });
  }, [historyEntries, selectedFilter, searchQuery]);

  const handleAddHistoryPress = () => {
    const typeToUse = selectedFilter === 'audio' ? 'audio' : 'song-details';
    onAddHistory?.(typeToUse, true);
  };

  const selectedAudioUrl =
    typeof originalHistoryValues.new_value === 'string' ? originalHistoryValues.new_value : '';

  return (
    <>
      {/* ── Version History List Sheet Modal ─────────────────────────────── */}
      <Modal visible={showHistoryList} transparent animationType="slide" onRequestClose={onCloseHistoryList}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.historyListSheet, isTablet && styles.historySheetCentered]}>
            {/* Header with Title and Add History Button */}
            <View style={styles.historySheetHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.historySheetTitle}>Song Version History</Text>
                <Text style={styles.historySheetSubtitle}>
                  Check past recordings, lyrics, and metadata revisions.
                </Text>
              </View>
              <View style={styles.historyHeaderRight}>
                <TouchableOpacity
                  style={styles.historyAddBtnHeader}
                  onPress={handleAddHistoryPress}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.historyAddBtnHeaderText}>Add History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onCloseHistoryList}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Tabs Bar (Browser-like categories) */}
            <View style={styles.historyFilterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.historyFilterScroll}
              >
                {filterTabs.map(tab => {
                  const isActive = selectedFilter === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.historyFilterChip, isActive && styles.historyFilterChipActive]}
                      onPress={() => setSelectedFilter(tab.key)}
                      activeOpacity={0.7}
                    >
                      {tab.icon && (
                        <Ionicons
                          name={tab.icon as any}
                          size={12}
                          color={isActive ? '#ffffff' : '#64748b'}
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.historyFilterChipText,
                          isActive && styles.historyFilterChipTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                      <View
                        style={[
                          styles.historyFilterCountBadge,
                          isActive && styles.historyFilterCountBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyFilterCountText,
                            isActive && styles.historyFilterCountTextActive,
                          ]}
                        >
                          {tab.count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Search Input Bar */}
            {historyEntries.length > 1 && (
              <View style={styles.historySearchContainer}>
                <Ionicons name="search-outline" size={15} color="#94a3b8" />
                <TextInput
                  style={styles.historySearchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search versions, audio files, or notes..."
                  placeholderTextColor="#94a3b8"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="close-circle" size={15} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {/* Current Active Song Audio Track Banner */}
            {(selectedFilter === 'all' || selectedFilter === 'audio') && currentSongAudioFile ? (
              <View style={styles.activeAudioBanner}>
                <View style={styles.activeAudioBannerLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' }} />
                    <Text style={styles.activeAudioBannerTitle}>CURRENT SONG AUDIO TRACK</Text>
                  </View>
                  <Text style={styles.activeAudioBannerFileName} numberOfLines={1}>
                    {currentSongAudioFile.split('/').pop()?.split('?')[0] || 'Active Audio Track'}
                  </Text>
                </View>

                {onTogglePlay && (
                  <TouchableOpacity
                    style={[
                      styles.browserAudioPlayBtn,
                      playingAudioUrl === currentSongAudioFile && styles.browserAudioPlayBtnActive,
                    ]}
                    onPress={() => onTogglePlay(currentSongAudioFile)}
                  >
                    {audioLoading && playingAudioUrl === currentSongAudioFile ? (
                      <ActivityIndicator size="small" color="#7c3aed" />
                    ) : (
                      <>
                        <Ionicons
                          name={playingAudioUrl === currentSongAudioFile ? 'pause' : 'play'}
                          size={13}
                          color={playingAudioUrl === currentSongAudioFile ? '#ffffff' : '#7c3aed'}
                        />
                        <Text
                          style={[
                            styles.browserAudioPlayBtnText,
                            playingAudioUrl === currentSongAudioFile && styles.browserAudioPlayBtnTextActive,
                          ]}
                        >
                          {playingAudioUrl === currentSongAudioFile ? 'Pause' : 'Play'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* History List Entries */}
            <ScrollView style={{ maxHeight: 400, paddingHorizontal: 16, paddingTop: 10 }}>
              {filteredEntries.length > 0 ? (
                filteredEntries.map(h => {
                  const audioUrl = getEntryAudioUrl(h);
                  const isAudio = isAudioEntry(h) && Boolean(audioUrl);
                  const fileName = audioUrl ? audioUrl.split('/').pop()?.split('?')[0] || 'Audio File' : '';
                  const isActiveTrack = Boolean(currentSongAudioFile && audioUrl && currentSongAudioFile === audioUrl);
                  const snapshotText =
                    typeof h.new_value === 'string'
                      ? h.new_value
                      : typeof h.newValue === 'string'
                      ? h.newValue
                      : typeof h.old_value === 'string'
                      ? h.old_value
                      : '';
                  const isExpanded = Boolean(expandedSnapshots[h.id]);

                  return (
                    <View key={h.id} style={styles.webHistoryCard}>
                      <View style={styles.webHistoryCardTop}>
                        <View style={{ flex: 1, marginRight: 6 }}>
                          <View style={styles.webHistoryTagRow}>
                            <View
                              style={[
                                styles.webHistoryTypeBadge,
                                isAudio && { backgroundColor: '#f3e8ff' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.webHistoryTypeBadgeText,
                                  isAudio && { color: '#7c3aed' },
                                ]}
                              >
                                {isAudio ? 'Audio Track' : formatHistoryType(h.type || 'song-details')}
                              </Text>
                            </View>
                            <Text style={styles.webHistoryDateText}>
                              {h.created_at ? new Date(h.created_at).toLocaleString() : h.date || 'Recent'}
                            </Text>
                          </View>

                          <Text style={styles.webHistoryTitleText}>{h.title}</Text>
                          {h.description && h.description !== h.title ? (
                            <Text style={styles.webHistoryDescText}>{h.description}</Text>
                          ) : null}
                          <Text style={styles.webHistoryAuthorText}>
                            Created by: {h.created_by || 'Coordinator'}
                          </Text>
                        </View>

                        {/* Edit & Delete Action Icons */}
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

                      {/* ── BROWSER-STYLE AUDIO CHECK BOX ── */}
                      {isAudio && audioUrl ? (
                        <View style={styles.browserAudioBox}>
                          <View style={styles.browserAudioUrlRow}>
                            <Ionicons name="musical-notes" size={16} color="#7c3aed" />
                            <View style={styles.browserAudioInfo}>
                              <Text style={styles.browserAudioFileName} numberOfLines={1}>
                                {fileName}
                              </Text>
                              <Text style={styles.browserAudioUrlText} numberOfLines={1}>
                                {audioUrl}
                              </Text>
                            </View>

                            {onTogglePlay && (
                              <TouchableOpacity
                                style={[
                                  styles.browserAudioPlayBtn,
                                  playingAudioUrl === audioUrl && styles.browserAudioPlayBtnActive,
                                ]}
                                onPress={() => onTogglePlay(audioUrl)}
                              >
                                {audioLoading && playingAudioUrl === audioUrl ? (
                                  <ActivityIndicator size="small" color="#7c3aed" />
                                ) : (
                                  <>
                                    <Ionicons
                                      name={playingAudioUrl === audioUrl ? 'pause' : 'play'}
                                      size={13}
                                      color={playingAudioUrl === audioUrl ? '#ffffff' : '#7c3aed'}
                                    />
                                    <Text
                                      style={[
                                        styles.browserAudioPlayBtnText,
                                        playingAudioUrl === audioUrl && styles.browserAudioPlayBtnTextActive,
                                      ]}
                                    >
                                      {playingAudioUrl === audioUrl ? 'Playing' : 'Play'}
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>

                          {isActiveTrack ? (
                            <View style={[styles.browserAudioActiveBadge, { alignSelf: 'flex-start', marginTop: 8 }]}>
                              <Ionicons name="checkmark-circle" size={13} color="#15803d" />
                              <Text style={styles.browserAudioActiveBadgeText}>Current Song Audio</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {/* ── NON-AUDIO CONTENT SNAPSHOT ── */}
                      {!isAudio && snapshotText ? (
                        <View style={{ marginTop: 6 }}>
                          <TouchableOpacity
                            style={styles.snapshotToggleBtn}
                            onPress={() => toggleSnapshot(h.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                              size={14}
                              color="#2563eb"
                            />
                            <Text style={styles.snapshotToggleBtnText}>
                              {isExpanded ? 'Hide Snapshot' : 'View Snapshot Content'}
                            </Text>
                          </TouchableOpacity>

                          {isExpanded && (
                            <View style={styles.snapshotPreviewBox}>
                              <ScrollView nestedScrollEnabled style={{ maxHeight: 110 }}>
                                <Text style={styles.snapshotPreviewText}>{snapshotText}</Text>
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={42} color="#cbd5e1" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginTop: 10 }}>
                    {historyEntries.length === 0
                      ? 'No history entries recorded yet.'
                      : 'No revisions match your filter.'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
                    {historyEntries.length === 0
                      ? 'Tap "+ Add History" above to save a version of your audio or song details.'
                      : 'Try selecting another tab or clearing search.'}
                  </Text>
                  {historyEntries.length === 0 && (
                    <TouchableOpacity
                      style={[styles.historyAddBtnHeader, { marginTop: 14, paddingHorizontal: 16, paddingVertical: 8 }]}
                      onPress={handleAddHistoryPress}
                    >
                      <Ionicons name="add" size={16} color="#ffffff" />
                      <Text style={styles.historyAddBtnHeaderText}>Add First History Entry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.closeHistorySheetBtn} onPress={onCloseHistoryList}>
              <Text style={styles.closeHistorySheetBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Add / Edit History Form Modal (Refined Apple iOS Sheet) ────────── */}
      <Modal
        visible={showHistoryForm && !showMediaPicker}
        transparent
        animationType="slide"
        onRequestClose={onCloseHistoryForm}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.pickerOverlay}>
          <View
            style={[
              styles.historyListSheet,
              isTablet && styles.historySheetCentered,
              { paddingBottom: Math.max(insetsBottom, 16) },
            ]}
          >
            {/* Sheet Top Grab Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 10 }} />

            {/* Header */}
            <View style={[styles.historySheetHeader, { borderBottomWidth: 0, paddingBottom: 10 }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.historySheetTitle} numberOfLines={1}>
                  {editingHistoryEntryId ? 'Update History Entry' : `Save ${formatHistoryType(historyFormType)} Version`}
                </Text>
                <Text style={styles.historySheetSubtitle}>
                  {editingHistoryEntryId
                    ? 'Update details of this revision'
                    : 'Record a new checkpoint of your song content'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onCloseHistoryForm}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
              {/* Type selector chips when adding new */}
              {!editingHistoryEntryId && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.fieldLabel, { fontSize: 11, letterSpacing: 0.5, marginBottom: 8 }]}>
                    SECTION TYPE
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                  >
                    {[
                      { key: 'audio', label: 'Audio Track', icon: 'musical-notes' },
                      { key: 'song-details', label: 'Song Details', icon: 'information-circle' },
                      { key: 'lyrics', label: 'Lyrics', icon: 'document-text' },
                      { key: 'personnel', label: 'Personnel', icon: 'people' },
                      { key: 'solfas', label: 'Solfas', icon: 'musical-note' },
                      { key: 'comments', label: 'Comments', icon: 'chatbox-ellipses' },
                    ].map(tab => {
                      const isActive = historyFormType === tab.key;
                      return (
                        <TouchableOpacity
                          key={tab.key}
                          style={[styles.historyTypeSelectChip, isActive && styles.historyTypeSelectChipActive]}
                          onPress={() => onSelectHistoryType?.(tab.key)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={tab.icon as any}
                            size={13}
                            color={isActive ? '#ffffff' : '#64748b'}
                            style={{ marginRight: 5 }}
                          />
                          <Text
                            style={[
                              styles.historyTypeSelectChipText,
                              isActive && styles.historyTypeSelectChipTextActive,
                            ]}
                          >
                            {tab.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Version Title */}
              <Text style={[styles.fieldLabel, { fontSize: 11, letterSpacing: 0.5 }]}>VERSION TITLE *</Text>
              <TextInput
                style={[styles.inputPrimary, { marginBottom: 12, height: 44 }]}
                value={historyFormTitle}
                onChangeText={setHistoryFormTitle}
                placeholder="e.g., Rehearsal Take 1, Final Arrangement"
                placeholderTextColor="#94a3b8"
              />

              {/* ── GORGEOUS VISUAL SNAPSHOT CARD (NO UGLY MONOSPACE CODE DUMP) ── */}
              <Text style={[styles.fieldLabel, { fontSize: 11, letterSpacing: 0.5 }]}>SNAPSHOT CONTENT</Text>
              {historyFormType === 'audio' ? (
                <View style={{ marginBottom: 12 }}>
                  {selectedAudioUrl ? (
                    <View style={styles.audioFilePlayerBox}>
                      <View style={styles.audioFileMetaRow}>
                        <View style={styles.audioDotPurple} />
                        <Text style={styles.audioFileName} numberOfLines={1}>
                          {selectedAudioUrl.split('/').pop()?.split('?')[0] || 'Selected Audio File'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        {onTogglePlay && (
                          <TouchableOpacity
                            style={[
                              styles.miniPlayBtn,
                              playingAudioUrl === selectedAudioUrl && styles.miniPlayBtnActive,
                            ]}
                            onPress={() => onTogglePlay(selectedAudioUrl)}
                          >
                            {audioLoading && playingAudioUrl === selectedAudioUrl ? (
                              <ActivityIndicator size="small" color="#7c3aed" />
                            ) : (
                              <>
                                <Ionicons
                                  name={playingAudioUrl === selectedAudioUrl ? 'pause' : 'play'}
                                  size={13}
                                  color={playingAudioUrl === selectedAudioUrl ? '#ffffff' : '#7c3aed'}
                                />
                                <Text
                                  style={[
                                    styles.miniPlayBtnText,
                                    playingAudioUrl === selectedAudioUrl && styles.miniPlayBtnTextActive,
                                  ]}
                                >
                                  {playingAudioUrl === selectedAudioUrl ? 'Playing' : 'Play Audio'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.selectFromMediaBtn}
                          onPress={() => setShowMediaPicker(true)}
                        >
                          <Ionicons name="folder-open-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
                          <Text style={styles.selectFromMediaBtnText}>Change File</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity
                        style={styles.browseMediaPrimaryBtn}
                        onPress={() => setShowMediaPicker(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="musical-notes-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.browseMediaPrimaryBtnText}>Browse Audio Files</Text>
                      </TouchableOpacity>

                      {currentSongAudioFile ? (
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#f5f3ff',
                            borderWidth: 1,
                            borderColor: '#ddd6fe',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                          }}
                          onPress={() => {
                            setOriginalHistoryValues((prev: any) => ({ ...prev, new_value: currentSongAudioFile }));
                          }}
                        >
                          <Ionicons name="flash-outline" size={14} color="#7c3aed" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#7c3aed' }} numberOfLines={1}>
                            Use Current Song Track: {currentSongAudioFile.split('/').pop()?.split('?')[0]}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </View>
              ) : historyFormType === 'song-details' ? (
                <View style={styles.snapshotCard}>
                  <View style={styles.snapshotCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                      <Ionicons name="information-circle" size={16} color="#7c3aed" />
                      <Text style={styles.snapshotCardTitle} numberOfLines={1}>
                        {songTitle || 'Current Song Parameters'}
                      </Text>
                    </View>
                    <View style={[styles.snapshotPill, styles.snapshotPillPurple]}>
                      <Text style={[styles.snapshotPillText, styles.snapshotPillPurpleText]}>Song Details</Text>
                    </View>
                  </View>

                  <View style={styles.snapshotPillRow}>
                    {songKey ? (
                      <View style={[styles.snapshotPill, styles.snapshotPillPurple]}>
                        <Text style={[styles.snapshotPillText, styles.snapshotPillPurpleText]}>Key: {songKey}</Text>
                      </View>
                    ) : null}
                    {songTempo ? (
                      <View style={styles.snapshotPill}>
                        <Text style={styles.snapshotPillText}>Tempo: {songTempo} BPM</Text>
                      </View>
                    ) : null}
                    {songStatus ? (
                      <View style={styles.snapshotPill}>
                        <Text style={styles.snapshotPillText}>Status: {songStatus}</Text>
                      </View>
                    ) : null}
                    {songCategories && songCategories.length > 0 ? (
                      <View style={styles.snapshotPill}>
                        <Text style={styles.snapshotPillText}>{songCategories.join(', ')}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.snapshotFooterNote}>
                    All current song parameters will be captured in this checkpoint.
                  </Text>
                </View>
              ) : historyFormType === 'lyrics' ? (
                <View style={styles.snapshotCard}>
                  <View style={styles.snapshotCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="document-text" size={16} color="#7c3aed" />
                      <Text style={styles.snapshotCardTitle}>Current Lyrics Content</Text>
                    </View>
                    <View style={[styles.snapshotPill, styles.snapshotPillPurple]}>
                      <Text style={[styles.snapshotPillText, styles.snapshotPillPurpleText]}>
                        {typeof originalHistoryValues.new_value === 'string'
                          ? `${originalHistoryValues.new_value.split('\n').filter(Boolean).length} lines`
                          : 'Lyrics'}
                      </Text>
                    </View>
                  </View>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 90, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }} numberOfLines={4}>
                      {typeof originalHistoryValues.new_value === 'string' && originalHistoryValues.new_value.trim()
                        ? originalHistoryValues.new_value.trim()
                        : 'No lyrics entered yet'}
                    </Text>
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.snapshotCard}>
                  <View style={styles.snapshotCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="bookmark" size={16} color="#7c3aed" />
                      <Text style={styles.snapshotCardTitle}>{formatHistoryType(historyFormType)}</Text>
                    </View>
                    <View style={[styles.snapshotPill, styles.snapshotPillPurple]}>
                      <Text style={[styles.snapshotPillText, styles.snapshotPillPurpleText]}>Checkpoint</Text>
                    </View>
                  </View>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 80, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 17 }}>
                      {typeof originalHistoryValues.new_value === 'string' && originalHistoryValues.new_value.trim()
                        ? originalHistoryValues.new_value.trim()
                        : 'Current section content will be captured.'}
                    </Text>
                  </ScrollView>
                </View>
              )}

              {/* Subtle Raw Text Editor Toggle (Only if user needs to tweak raw snapshot) */}
              {historyFormType !== 'audio' && (
                <View style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => setShowRawEditor(prev => !prev)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 }}
                  >
                    <Ionicons
                      name={showRawEditor ? 'chevron-up' : 'chevron-down'}
                      size={13}
                      color="#64748b"
                    />
                    <Text style={{ fontSize: 11.5, color: '#64748b', fontWeight: '600' }}>
                      {showRawEditor ? 'Hide raw snapshot text' : 'Edit raw snapshot text (optional)'}
                    </Text>
                  </TouchableOpacity>

                  {showRawEditor && (
                    <TextInput
                      style={[
                        styles.inputPrimary,
                        styles.multilineEditor,
                        styles.fontMono,
                        { minHeight: 70, fontSize: 11.5, marginTop: 6 },
                      ]}
                      multiline
                      value={
                        typeof originalHistoryValues.new_value === 'string'
                          ? originalHistoryValues.new_value
                          : JSON.stringify(originalHistoryValues.new_value, null, 2)
                      }
                      onChangeText={v => setOriginalHistoryValues((prev: any) => ({ ...prev, new_value: v }))}
                      placeholder="Snapshot text content..."
                      placeholderTextColor="#94a3b8"
                    />
                  )}
                </View>
              )}

              {/* Notes Field (Clean, starts empty, intelligent placeholder) */}
              <Text style={[styles.fieldLabel, { fontSize: 11, letterSpacing: 0.5 }]}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.inputPrimary, styles.multilineEditor, { minHeight: 52, marginBottom: 14 }]}
                multiline
                numberOfLines={2}
                value={historyFormDesc}
                onChangeText={setHistoryFormDesc}
                placeholder="What changed? (e.g., Key adjusted to A, updated lyrics)"
                placeholderTextColor="#94a3b8"
              />
            </ScrollView>

            {/* Apple Standard Balanced Actions Row */}
            <View style={styles.historyFormActionsRow}>
              <TouchableOpacity
                style={styles.historyFormCancelBtn}
                onPress={onCloseHistoryForm}
                activeOpacity={0.7}
              >
                <Text style={styles.historyFormCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.historyFormSaveBtn}
                onPress={onSaveHistoryEntry}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={17} color="#ffffff" />
                <Text style={styles.historyFormSaveBtnText}>Save Checkpoint</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Media Selection Modal for History Audio Picking ── */}
      <MediaSelectionModal
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        allowedType="audio"
        title="Select Audio File for History"
        onSelect={(url, file) => {
          setOriginalHistoryValues((prev: any) => ({ ...prev, new_value: url }));
          if (file?.name && (!historyFormTitle || historyFormTitle.startsWith('Audio Version'))) {
            const cleanName = file.name.replace(/\.[^/.]+$/, '');
            setHistoryFormTitle(`${cleanName} (${new Date().toLocaleDateString()})`);
          }
          setShowMediaPicker(false);
        }}
      />
    </>
  );
}
