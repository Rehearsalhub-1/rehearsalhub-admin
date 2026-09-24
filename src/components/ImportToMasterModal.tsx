import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { customAlert } from '../context/AlertContext';

interface ImportToMasterModalProps {
  visible: boolean;
  onClose: () => void;
  onImportSuccess: (importedSongs: any[]) => void;
}

export default function ImportToMasterModal({
  visible,
  onClose,
  onImportSuccess,
}: ImportToMasterModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const [programs, setPrograms] = useState<any[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null);

  const [programSongs, setProgramSongs] = useState<any[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

  const [importing, setImporting] = useState(false);

  // Load programs when modal opens
  useEffect(() => {
    if (!visible) {
      setSelectedProgram(null);
      setProgramSongs([]);
      setSelectedSongIds(new Set());
      setSongSearch('');
      return;
    }

    setLoadingPrograms(true);
    api.programs.getAll({ category: 'all', includeChurch: true, zoneId: 'all' })
      .then(res => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const valid = rows
          .map((p: any) => ({
            id: String(p.id),
            name: p.name || p.title || 'Untitled Program',
            date: p.date || p.scheduledDate || p.createdAt || '',
            category: p.category || '',
            zoneName: p.zone?.name || p.zoneName || '',
          }))
          .filter(p => p.id && p.name);
        setPrograms(valid);
        if (valid.length > 0 && !selectedProgram) {
          handleSelectProgram(valid[0]);
        }
      })
      .catch(() => setPrograms([]))
      .finally(() => setLoadingPrograms(false));
  }, [visible]);

  const handleSelectProgram = async (prog: any) => {
    setSelectedProgram(prog);
    setSelectedSongIds(new Set());
    setLoadingSongs(true);
    try {
      const [progRes, songsRes] = await Promise.allSettled([
        api.programs.getById(prog.id),
        api.songs.getPraiseNightSongs(prog.id),
      ]);

      const progData = progRes.status === 'fulfilled'
        ? (progRes.value?.data || progRes.value)
        : null;
      const junctionSongs = progData && Array.isArray(progData.songs)
        ? progData.songs
        : (Array.isArray(progData?.programSongs) ? progData.programSongs : []);

      const directSongs = songsRes.status === 'fulfilled'
        ? (Array.isArray(songsRes.value?.data) ? songsRes.value.data : (Array.isArray(songsRes.value) ? songsRes.value : []))
        : [];

      const seenIds = new Set<string>();
      const combined: any[] = [];
      [...junctionSongs, ...directSongs].forEach((item: any) => {
        const s = item.song || item;
        const id = s.id || item.songId || item.id;
        if (id && !seenIds.has(String(id))) {
          seenIds.add(String(id));
          combined.push({
            ...s,
            id: String(id),
            title: s.title || item.title || 'Untitled Song',
            leadSinger: s.leadSinger || item.leadSinger || '',
            writer: s.writer || item.writer || '',
            category: s.category || item.category || '',
            key: s.key || item.key || '',
            tempo: s.tempo || item.tempo || '',
            audioUrl: s.audioUrl || item.audioUrl || '',
            isMaster: Boolean(s.isMaster || item.isMaster),
          });
        }
      });

      setProgramSongs(combined);
    } catch {
      setProgramSongs([]);
    } finally {
      setLoadingSongs(false);
    }
  };

  const toggleSelectSong = (id: string) => {
    setSelectedSongIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedSongIds.size === filteredSongs.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(filteredSongs.map(s => s.id)));
    }
  };

  const handleImport = async (targetIds: string[]) => {
    if (targetIds.length === 0) {
      customAlert('Select Songs', 'Please select at least one song to import.');
      return;
    }

    setImporting(true);
    try {
      const res = await api.songs.importToMaster(targetIds);
      if (!res?.success) {
        throw new Error((res as any)?.error || res?.message || 'Failed to import songs.');
      }
      const imported = Array.isArray(res.data) ? res.data : [];
      customAlert('Import Successful', `Successfully imported ${imported.length} song(s) into All Ministered catalog.`);
      onImportSuccess(imported);
      onClose();
    } catch (err: any) {
      customAlert('Import Error', err?.message || 'Could not import selected songs.');
    } finally {
      setImporting(false);
    }
  };

  const filteredSongs = programSongs.filter(s => {
    if (!songSearch.trim()) return true;
    const q = songSearch.toLowerCase().trim();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.leadSinger || '').toLowerCase().includes(q) ||
      (s.writer || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        if (!importing) onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.dialogCard, isDesktop && styles.dialogCardDesktop]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="download-outline" size={18} color="#7c3aed" />
                </View>
                <Text style={styles.headerTitle}>Import Songs to All Ministered</Text>
              </View>
              <Text style={styles.headerSub}>
                Select a program to import songs into the All Ministered master catalog
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!importing) onClose();
              }}
              disabled={importing}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {/* 1. Program Selector */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>CHOOSE PROGRAM</Text>
              {loadingPrograms && <ActivityIndicator size="small" color="#7c3aed" />}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.programsScrollContainer}
              contentContainerStyle={styles.programsScroll}
            >
              {programs.map(prog => {
                const isSelected = selectedProgram?.id === prog.id;
                return (
                  <TouchableOpacity
                    key={prog.id}
                    style={[styles.programChip, isSelected && styles.programChipActive]}
                    onPress={() => handleSelectProgram(prog)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={14}
                      color={isSelected ? '#ffffff' : '#64748b'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[styles.programChipText, isSelected && styles.programChipTextActive]}
                      numberOfLines={1}
                    >
                      {prog.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {programs.length === 0 && !loadingPrograms && (
                <Text style={styles.emptyNotice}>No programs found.</Text>
              )}
            </ScrollView>

            {/* 2. Songs in Selected Program */}
            {selectedProgram && (
              <View style={styles.songsSection}>
                <View style={styles.songsHeaderRow}>
                  <Text style={styles.sectionLabel} numberOfLines={1}>
                    SONGS IN "{selectedProgram.name.toUpperCase()}" ({filteredSongs.length})
                  </Text>
                  {filteredSongs.length > 0 && (
                    <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
                      <Text style={styles.selectAllBtnText}>
                        {selectedSongIds.size === filteredSongs.length ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Search */}
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Filter songs by title or lead singer..."
                    placeholderTextColor="#94a3b8"
                    value={songSearch}
                    onChangeText={setSongSearch}
                  />
                  {songSearch ? (
                    <TouchableOpacity onPress={() => setSongSearch('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Songs List */}
                {loadingSongs ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#7c3aed" />
                    <Text style={styles.loadingText}>Loading songs...</Text>
                  </View>
                ) : filteredSongs.length === 0 ? (
                  <View style={styles.emptySongsBox}>
                    <Ionicons name="musical-notes-outline" size={32} color="#cbd5e1" />
                    <Text style={styles.emptySongsText}>No songs found in this program.</Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.songsListScroll}
                    contentContainerStyle={styles.songsListContent}
                    showsVerticalScrollIndicator={true}
                  >
                    {filteredSongs.map(song => {
                      const isChecked = selectedSongIds.has(song.id);
                      return (
                        <TouchableOpacity
                          key={song.id}
                          style={[styles.songRow, isChecked && styles.songRowSelected]}
                          onPress={() => toggleSelectSong(song.id)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.checkCircle, isChecked && styles.checkCircleActive]}>
                            {isChecked && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                          </View>

                          <View style={{ flex: 1, marginHorizontal: 10, minWidth: 0 }}>
                            <Text style={styles.songTitle} numberOfLines={1}>
                              {song.title || 'Untitled Song'}
                            </Text>
                            <View style={styles.songMetaRow}>
                              {song.leadSinger ? (
                                <Text style={styles.songLeadSinger} numberOfLines={1}>
                                  {song.leadSinger}
                                </Text>
                              ) : null}
                              {song.key ? (
                                <View style={styles.badgeChip}>
                                  <Text style={styles.badgeChipText}>{song.key}</Text>
                                </View>
                              ) : null}
                              {song.tempo ? (
                                <Text style={styles.tempoText}>
                                  {String(song.tempo).toUpperCase().includes('BPM')
                                    ? song.tempo
                                    : `${song.tempo} BPM`}
                                </Text>
                              ) : null}
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.singleImportBtn}
                            onPress={() => handleImport([song.id])}
                            disabled={importing}
                          >
                            <Ionicons name="add" size={14} color="#7c3aed" style={{ marginRight: 2 }} />
                            <Text style={styles.singleImportBtnText}>Import</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={importing}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.batchImportBtn,
                (selectedSongIds.size === 0 || importing) && styles.batchImportBtnDisabled,
              ]}
              onPress={() => handleImport(Array.from(selectedSongIds))}
              disabled={selectedSongIds.size === 0 || importing}
              activeOpacity={0.85}
            >
              {importing ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.batchImportBtnText}>Importing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="download" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.batchImportBtnText}>
                    {selectedSongIds.size > 0
                      ? `Import ${selectedSongIds.size} Song${selectedSongIds.size > 1 ? 's' : ''}`
                      : 'Select Songs to Import'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  dialogCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    height: '90%',
    maxHeight: 700,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  dialogCardDesktop: {
    maxWidth: 680,
    height: '85%',
    maxHeight: 720,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    flexShrink: 0,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  programsScrollContainer: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 44,
    marginBottom: 12,
  },
  programsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  programChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  programChipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  programChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  programChipTextActive: {
    color: '#ffffff',
  },
  emptyNotice: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  songsSection: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  songsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexShrink: 0,
  },
  selectAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  emptySongsBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySongsText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
  },
  songsListScroll: {
    flex: 1,
    minHeight: 0,
  },
  songsListContent: {
    paddingBottom: 8,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    marginBottom: 6,
  },
  songRowSelected: {
    backgroundColor: '#faf5ff',
    borderColor: '#d8b4fe',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    flexShrink: 0,
  },
  checkCircleActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  songMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  songLeadSinger: {
    fontSize: 11,
    color: '#64748b',
    maxWidth: 160,
  },
  badgeChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  tempoText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  singleImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    flexShrink: 0,
  },
  singleImportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 10,
    flexShrink: 0,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  batchImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  batchImportBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  batchImportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
