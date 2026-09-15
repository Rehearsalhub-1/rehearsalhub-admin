import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActionSheetIOS,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';
import { EmptyState, Badge } from '../components/ui';
import MediaSelectionModal from '../components/MediaSelectionModal';
import { ProgramModal, normalizeProgramStage } from './ProgramsScreen';
import SongModal from '../components/SongModal';
import { customAlert } from '../context/AlertContext';

export function addSong(songIds: string[], newId: string): string[] {
  if (songIds.includes(newId)) return songIds;
  return [...songIds, newId];
}

export function removeSong(songIds: string[], removeId: string): string[] {
  return songIds.filter(id => id !== removeId);
}

interface PraiseSong {
  id: string;
  title?: string;
  key?: string;
  tempo?: string;
  leadSinger?: string;
  conductor?: string;
  writer?: string;
  category?: string;
  categories?: string[];
  lyrics?: string;
  solfa?: string;
  solfas?: string;
  notation?: string;
  rehearsalCount?: number;
  imageUrl?: string;
  audioFile?: string;
  audioUrl?: string;
  audioUrls?: Record<string, string>;
  customParts?: Record<string, string> | string[];
  leadKeyboardist?: string;
  leadGuitarist?: string;
  drummer?: string;
  coordinatorComment?: string;
  coordinatorAudioUrl?: string;
  isActive?: boolean;
  isLive?: boolean;
  isHeard?: boolean;
  heard?: boolean;
  status?: string;
  comments?: any[];
  programId?: string;
  praiseNightId?: string;
}

interface MasterSong {
  id: string;
  title?: string;
  writer?: string;
  leadSinger?: string;
  key?: string;
  tempo?: string;
  category?: string;
  audioFile?: string;
  audioUrls?: Record<string, string>;
  lyrics?: string;
  solfa?: string;
}

interface Program {
  id: string;
  name?: string;
  date?: string;
  location?: string;
  status?: string;
  category?: string;
  description?: string;
  songIds?: string[];
  categoryOrder?: string[];
}

const SONG_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const STATUS_OPTIONS: { value: string; label: string; color: string; bg: string; border: string }[] = [
  { value: 'ongoing', label: '🟢 Ongoing', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  { value: 'pre-rehearsal', label: '🟡 Pre-Reh', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  { value: 'archive', label: '📦 Archive', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  { value: 'draft', label: '📝 Draft', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
];

function formatDisplayDate(dateStr?: string) {
  if (!dateStr) return 'Date TBD';
  const parsed = new Date(dateStr);
  if (!parsed || isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ────────────────────────────────────────────────────────────────────────────────
// 1. HIGH-END SONG DETAILS & EDIT MODAL (Native Sheet with Safe Area)
// ────────────────────────────────────────────────────────────────────────────────

interface SongDetailsModalProps {
  visible: boolean;
  song: PraiseSong | null;
  programId?: string;
  onClose: () => void;
  onSave: (updated: PraiseSong) => void;
}

function SongDetailsModal({ visible, song, programId = '', onClose, onSave, onDelete }: SongDetailsModalProps & { onDelete?: (id: string) => void }) {
  return (
    <SongModal
      visible={visible}
      song={song}
      programId={programId}
      onClose={onClose}
      onSaved={(updated) => onSave(updated as PraiseSong)}
      onDelete={onDelete}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// 2. CLONE FROM ALL MINISTERED MODAL (High-End Safe Sheet)
// ────────────────────────────────────────────────────────────────────────────────

interface CloneModalProps {
  visible: boolean;
  programId: string;
  existingIds: string[];
  onClose: () => void;
  onCloned: (clonedSong?: PraiseSong) => void;
}

function CloneFromMasterModal({ visible, programId, existingIds, onClose, onCloned }: CloneModalProps) {
  const insets = useSafeAreaInsets();
  const [songs, setSongs] = useState<MasterSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setLoading(true);
      setSongs([]);
      api.songs.getMasterSongs()
        .then(res => {
          setSongs(Array.isArray(res?.data) ? res.data : []);
        })
        .catch(() => {
          setSongs([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible]);

  const filteredSongs = useMemo(() => {
    const existing = new Set(existingIds);
    let list = songs.filter(s => !existing.has(s.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.writer || '').toLowerCase().includes(q) ||
        (s.leadSinger || '').toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [songs, existingIds, search]);

  async function handleClone(masterSong: MasterSong) {
    setCloningId(masterSong.id);
    try {
      const clonedSong: PraiseSong = {
        id: `song-${Date.now()}`,
        title: masterSong.title || 'Untitled',
        category: masterSong.category || 'Standard',
        categories: masterSong.category ? [masterSong.category] : ['Standard'],
        writer: masterSong.writer || '',
        leadSinger: masterSong.leadSinger || '',
        key: masterSong.key || '',
        tempo: masterSong.tempo || '',
        lyrics: masterSong.lyrics || '',
        solfas: masterSong.solfa || '',
        audioFile: masterSong.audioFile || '',
        audioUrls: masterSong.audioUrls || {},
        status: 'unheard',
        isHeard: false,
        heard: false,
        isActive: false,
      };

      const result = await api.songs.create({
        ...clonedSong,
        programId,
        praiseNightId: programId,
      });
      if (!result?.success) {
        throw new Error('Failed to save cloned song.');
      }

      onCloned(result.data || clonedSong);
      onClose();
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to clone song.');
    } finally {
      setCloningId(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <View
          style={[
            sheetStyles.sheetCard,
            {
              marginTop: Math.max(insets.top + 16, 54),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={sheetStyles.dragHandle} />

          <View style={sheetStyles.header}>
            <TouchableOpacity onPress={onClose} style={sheetStyles.headerActionBtn}>
              <Text style={sheetStyles.cancelText}>Done</Text>
            </TouchableOpacity>

            <View style={sheetStyles.headerCenter}>
              <Text style={sheetStyles.headerTitle}>Clone from All Ministered</Text>
            </View>

            <View style={{ width: 48 }} />
          </View>

          {/* Search bar */}
          <View style={sheetStyles.searchWrap}>
            <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={sheetStyles.searchInput}
              placeholder="Search all ministered songs..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 12, fontWeight: '500' }}>
                Loading all ministered songs...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredSongs}
              keyExtractor={i => i.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon="search-outline"
                  title="No Songs Found"
                  description="All available songs may already be in this setlist."
                />
              }
              renderItem={({ item }) => (
                <View style={sheetStyles.cloneSongRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={sheetStyles.cloneSongTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      {item.leadSinger ? <Text style={sheetStyles.cloneSongMeta}>🎤 {item.leadSinger}</Text> : null}
                      {item.writer ? <Text style={sheetStyles.cloneSongMeta}>• {item.writer}</Text> : null}
                      {item.key ? <Badge label={item.key} variant="key" size="sm" /> : null}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={sheetStyles.cloneAddBtn}
                    onPress={() => handleClone(item)}
                    disabled={cloningId === item.id}
                    activeOpacity={0.8}
                  >
                    {cloningId === item.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                        <Text style={sheetStyles.cloneAddBtnText}>Add</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// 3. CREATE SONG MODAL (High-End Safe Sheet with Media Library)
// ────────────────────────────────────────────────────────────────────────────────

interface CreateSongModalProps {
  visible: boolean;
  programId: string;
  existingIds: string[];
  onClose: () => void;
  onCreated: (newSong?: PraiseSong) => void;
}

function CreateSongModal({ visible, programId, existingIds, onClose, onCreated }: CreateSongModalProps) {
  return (
    <SongModal
      visible={visible}
      song={null}
      programId={programId}
      existingSongIds={existingIds}
      onClose={onClose}
      onSaved={(newSong) => onCreated(newSong as PraiseSong)}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// 4. EDIT PROGRAM MODAL (High-End Safe Sheet)
// ────────────────────────────────────────────────────────────────────────────────

interface EditProgramModalProps {
  visible: boolean;
  program: Program;
  onClose: () => void;
  onSaved: (updated: Program) => void;
}

function EditProgramModal({ visible, program, onClose, onSaved }: EditProgramModalProps) {
  return (
    <ProgramModal
      visible={visible}
      editingProgram={program as any}
      activeZoneId={(program as any).zoneId}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN: Clean, High-End Setlist Experience
// ────────────────────────────────────────────────────────────────────────────────

export default function ProgramSongsScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const initialProgram: Program = route.params?.program || {};
  const [currentProgram, setCurrentProgram] = useState<Program>(initialProgram);

  const [programSongs, setProgramSongs] = useState<PraiseSong[]>(() =>
    Array.isArray((initialProgram as any)?.songs) ? (initialProgram as any).songs : []
  );
  const [loading, setLoading] = useState(
    !Array.isArray((initialProgram as any)?.songs) || (initialProgram as any).songs.length === 0
  );
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'heard' | 'unheard'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Category reordering states
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [reorderCategoriesList, setReorderCategoriesList] = useState<string[]>([]);
  const [isSavingCategoryOrder, setIsSavingCategoryOrder] = useState(false);

  // Modals state
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState<PraiseSong | null>(null);
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [createSongModalVisible, setCreateSongModalVisible] = useState(false);
  const [editProgramModalVisible, setEditProgramModalVisible] = useState(false);

  const fetchSongs = useCallback(async () => {
    if (!currentProgram?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      // Primary fetch: programs/:id always returns a fully-shaped song list
      // via the programSongs junction table — this is the most reliable source.
      const [progRes, songsRes] = await Promise.allSettled([
        api.programs.getById(currentProgram.id),
        api.songs.getPraiseNightSongs(currentProgram.id),
      ]);

      // Songs from the program record (junction table via shapeProgram)
      const progData = progRes.status === 'fulfilled'
        ? (progRes.value?.data || progRes.value)
        : null;
      const junctionSongs: PraiseSong[] =
        progData && Array.isArray(progData.songs) ? progData.songs : [];

      // Songs from the /songs?programId=... endpoint (may include legacy songs)
      const songsList: PraiseSong[] =
        songsRes.status === 'fulfilled'
          ? (Array.isArray(songsRes.value?.data) ? songsRes.value.data : (Array.isArray(songsRes.value) ? songsRes.value : []))
          : [];

      // Merge: start with junction songs (ordered), append any extras from songsList
      const seenIds = new Set<string>(junctionSongs.map((s) => s.id));
      const extras = songsList.filter((s) => !seenIds.has(s.id));
      const merged: PraiseSong[] = [...junctionSongs, ...extras];

      if (merged.length > 0) {
        setProgramSongs(merged);
        if (progData) {
          setCurrentProgram(prev => ({ ...prev, ...progData, songs: merged }));
        }
      } else if (junctionSongs.length === 0 && songsList.length === 0) {
        // Nothing from either — keep whatever was passed via nav params
      }
    } catch (e) {
      console.error('[ProgramSongs] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentProgram?.id]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // Returns the song's actual category, or null if none set
  const getSongDisplayCategory = (s: PraiseSong): string | null => {
    const primary = s.category?.trim();
    if (primary) return primary;
    if (Array.isArray(s.categories) && s.categories.length > 0) {
      const first = s.categories.find(c => c && c.trim());
      if (first) return first.trim();
    }
    return null; // truly no category — will appear under "All" only
  };

  // Compute unique categories (only real ones, no fallback)
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    programSongs.forEach(s => {
      const cat = getSongDisplayCategory(s);
      if (cat) cats.add(cat);
    });
    return Array.from(cats);
  }, [programSongs]);

  const orderedCategories = useMemo(() => {
    const existingOrder = currentProgram.categoryOrder || [];
    const merged = [...existingOrder.filter(c => uniqueCategories.includes(c))];
    uniqueCategories.forEach(cat => {
      if (!merged.includes(cat)) merged.push(cat);
    });
    return merged;
  }, [uniqueCategories, currentProgram.categoryOrder]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    programSongs.forEach(s => {
      const cat = getSongDisplayCategory(s);
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [programSongs]);

  // No truly uncategorized chip — songs without a category show under "All" only
  const uncategorizedCount = 0;

  const handleOpenReorderModal = () => {
    setReorderCategoriesList(orderedCategories.length > 0 ? [...orderedCategories] : [...uniqueCategories]);
    setReorderModalVisible(true);
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const list = [...reorderCategoriesList];
    if (direction === 'up' && index > 0) {
      [list[index - 1], list[index]] = [list[index], list[index - 1]];
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index + 1], list[index]] = [list[index], list[index + 1]];
    }
    setReorderCategoriesList(list);
  };

  const handleSaveCategoryOrder = async () => {
    setIsSavingCategoryOrder(true);
    try {
      await api.programs.updateCategoryOrder(currentProgram.id, reorderCategoriesList);
      setCurrentProgram(prev => ({ ...prev, categoryOrder: reorderCategoriesList }));
      setReorderModalVisible(false);
      customAlert('Categories Reordered', 'Category order updated successfully.');
    } catch (e: any) {
      customAlert('Error', e?.message || 'Failed to save category order');
    } finally {
      setIsSavingCategoryOrder(false);
    }
  };

  function handleOpenActionMenu() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Add Song', 'Clone from All Ministered', 'Reorder Categories', 'Edit Program Details'],
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          if (buttonIndex === 1) setCreateSongModalVisible(true);
          else if (buttonIndex === 2) setCloneModalVisible(true);
          else if (buttonIndex === 3) handleOpenReorderModal();
          else if (buttonIndex === 4) setEditProgramModalVisible(true);
        }
      );
    } else {
      customAlert(
        currentProgram.name || 'Setlist Options',
        'Select an action',
        [
          { text: 'Add Song', onPress: () => setCreateSongModalVisible(true) },
          { text: 'Clone from All Ministered', onPress: () => setCloneModalVisible(true) },
          { text: 'Reorder Categories', onPress: handleOpenReorderModal },
          { text: 'Edit Program Details', onPress: () => setEditProgramModalVisible(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }

  function handleRemoveSong(songId: string, title: string) {
    customAlert('Remove Song', `Remove "${title}" from this setlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const nextSongs = programSongs.filter(s => s.id !== songId);
          setProgramSongs(nextSongs);
          api.programs.updateSongIds(currentProgram.id, nextSongs.map(s => s.id)).catch(() => {});
        },
      },
    ]);
  }

  function handleToggleSongActive(song: PraiseSong) {
    const isCurrentlyLive = song.status === 'live' || Boolean(song.isLive);
    const nextLive = !isCurrentlyLive;
    setProgramSongs(prev =>
      prev.map(s => (s.id === song.id ? { ...s, isLive: nextLive, status: nextLive ? 'live' : (s.isHeard ? 'heard' : 'unheard') } : s))
    );
    api.songs.toggleActive(song.id, nextLive).catch(() => {});
  }

  function handleToggleHeard(song: PraiseSong) {
    const isCurrentlyHeard = Boolean(song.isHeard ?? song.heard ?? song.status === 'heard');
    const next = !isCurrentlyHeard;
    setProgramSongs(prev =>
      prev.map(s => (s.id === song.id ? { ...s, isHeard: next, heard: next, status: next ? 'heard' : 'unheard' } : s))
    );
    api.songs.toggleHeard(song.id, next).catch(() => {});
  }

  function handleSongUpdated(updated: PraiseSong) {
    setProgramSongs(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)));
    if (updated.id) {
      const normalizedImageUrl = updated.imageUrl?.trim()
        ? (updated.imageUrl.trim().startsWith('http://') && !updated.imageUrl.includes('localhost') && !updated.imageUrl.includes('10.0.2.2')
            ? 'https://' + updated.imageUrl.trim().slice(7)
            : updated.imageUrl.trim())
        : '';

      api.songs.update(updated.id, {
        title: updated.title,
        key: updated.key,
        tempo: updated.tempo,
        leadSinger: updated.leadSinger,
        conductor: updated.conductor,
        writer: updated.writer,
        // Pass null explicitly so the API clears the category in the DB.
      // Using || undefined would omit the key and the DB would keep the old value.
      category: 'category' in updated ? (updated.category ?? null) : undefined,
        categories: updated.categories || [],
        lyrics: updated.lyrics,
        solfas: updated.solfas || updated.solfa,
        solfa: updated.solfas || updated.solfa,
        notation: updated.notation,
        imageUrl: normalizedImageUrl,
        audioFile: updated.audioFile || updated.audioUrl,
        audioUrls: updated.audioUrls,
        leadKeyboardist: updated.leadKeyboardist,
        leadGuitarist: updated.leadGuitarist,
        drummer: updated.drummer,
        isActive: updated.isActive,
        isHQOnly: (updated as any).isHQOnly,
        rehearsalCount: updated.rehearsalCount,
        coordinatorComment: updated.coordinatorComment,
      }).catch(e => console.warn('[ProgramSongs] update failed:', e));
    }
  }

  function handleSongCreated(newSong?: PraiseSong) {
    if (newSong) {
      const normalizedImageUrl = newSong.imageUrl?.trim()
        ? (newSong.imageUrl.trim().startsWith('http://') && !newSong.imageUrl.includes('localhost') && !newSong.imageUrl.includes('10.0.2.2')
            ? 'https://' + newSong.imageUrl.trim().slice(7)
            : newSong.imageUrl.trim())
        : '';

      const songPayload: PraiseSong = {
        ...newSong,
        imageUrl: normalizedImageUrl,
        category: newSong.category || undefined,
        categories: newSong.categories || [],
        programId: currentProgram.id,
        praiseNightId: currentProgram.id,
      };

      api.songs.create(songPayload)
        .then(res => {
          if (res?.data?.id) {
            setProgramSongs(prev => prev.map(s => (s.id === newSong.id ? { ...s, ...res.data } : s)));
          }
        })
        .catch(err => console.error('[handleSongCreated] api.songs.create error:', err));

      setProgramSongs(prev => {
        const next = [songPayload, ...prev];
        api.programs.updateSongIds(currentProgram.id, next.map(s => s.id)).catch(() => {});
        return next;
      });
    }
  }

  function handleSongCloned(clonedSong?: PraiseSong) {
    if (clonedSong) {
      setProgramSongs(prev => {
        const next = [clonedSong, ...prev];
        api.programs.updateSongIds(currentProgram.id, next.map(s => s.id)).catch(() => {});
        return next;
      });
    }
  }

  // Progress metrics
  const pageMetrics = useMemo(() => {
    const total = programSongs.length;
    const heard = programSongs.filter(s => s.isHeard || s.heard || s.status === 'heard').length;
    const progressPercent = total > 0 ? Math.round((heard / total) * 100) : 0;
    return { total, heard, unheard: total - heard, progressPercent };
  }, [programSongs]);

  // Filtered songs
  const filteredSongs = useMemo(() => {
    return programSongs.filter(song => {
      const isHeard = Boolean(song.isHeard ?? song.heard ?? song.status === 'heard');
      if (statusFilter === 'heard' && !isHeard) return false;
      if (statusFilter === 'unheard' && isHeard) return false;

      if (selectedCategory !== 'all') {
        // Match against actual category (null = no category = only shown under All)
        const displayCat = getSongDisplayCategory(song);
        if (displayCat !== selectedCategory) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (song.title || '').toLowerCase().includes(q);
        const matchesSinger = (song.leadSinger || '').toLowerCase().includes(q);
        const matchesWriter = (song.writer || '').toLowerCase().includes(q);
        const matchesKey = (song.key || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSinger && !matchesWriter && !matchesKey) {
          return false;
        }
      }
      return true;
    });
  }, [programSongs, statusFilter, selectedCategory, searchQuery]);

  const existingIds = useMemo(() => programSongs.map(s => s.id), [programSongs]);
  const currentCat = normalizeProgramStage(currentProgram);
  const currentStatusOpt = STATUS_OPTIONS.find(o => o.value === currentCat) || STATUS_OPTIONS[1];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── HIGH-END SLIM NAVIGATION BAR ────────────────────────────────────── */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBackBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.navTitleCenter}>
          <Text style={styles.navTitleText} numberOfLines={1}>
            {currentProgram.name || 'Setlist'}
          </Text>
          <Text style={styles.navMetaSub} numberOfLines={1}>
            {formatDisplayDate(currentProgram.date)}
            {currentProgram.location ? ` • ${currentProgram.location}` : ''}
          </Text>
        </View>

        {/* Action Button: opens clean action sheet */}
        <TouchableOpacity onPress={handleOpenActionMenu} style={styles.navActionBtn} activeOpacity={0.75}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* ── STREAMLINED METRICS & FILTER BAR ──────────────────────────────── */}
      <View style={styles.filterSection}>
        {/* Progress & Quick Actions Row */}
        <View style={styles.quickBar}>
          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>
              {pageMetrics.heard}/{pageMetrics.total} Heard ({pageMetrics.progressPercent}%)
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={styles.addBtnSmall}
              onPress={() => setCreateSongModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
              <Text style={styles.addBtnSmallText}>+ Song</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cloneBtnSmall}
              onPress={() => setCloneModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={13} color="#7c3aed" style={{ marginRight: 3 }} />
              <Text style={styles.cloneBtnSmallText}>Clone</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Integrated Search Input */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search songs, singer, key..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 3-Tab Segmented Filter */}
        <View style={styles.segmentContainer}>
          {(['all', 'heard', 'unheard'] as const).map(f => {
            const active = statusFilter === f;
            const count = f === 'all' ? pageMetrics.total : f === 'heard' ? pageMetrics.heard : pageMetrics.unheard;
            const label = f === 'all' ? `All (${count})` : f === 'heard' ? `Heard (${count})` : `Unheard (${count})`;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.segmentTab, active && styles.segmentTabActive]}
                onPress={() => setStatusFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentTabText, active && styles.segmentTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Horizontal Category Chips Filter Bar */}
        {(orderedCategories.length > 0 || uncategorizedCount > 0) && (
          <View style={styles.categoryBarWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryBarScroll}>
              <TouchableOpacity
                style={[styles.catChip, selectedCategory === 'all' && styles.catChipActive]}
                onPress={() => setSelectedCategory('all')}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipText, selectedCategory === 'all' && styles.catChipTextActive]}>
                  All ({programSongs.length})
                </Text>
              </TouchableOpacity>

              {uncategorizedCount > 0 && (
                <TouchableOpacity
                  style={[styles.catChip, selectedCategory === '__uncategorized__' && styles.catChipActive]}
                  onPress={() => setSelectedCategory(selectedCategory === '__uncategorized__' ? 'all' : '__uncategorized__')}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catChipText, selectedCategory === '__uncategorized__' && styles.catChipTextActive]}>
                    Uncategorized ({uncategorizedCount})
                  </Text>
                </TouchableOpacity>
              )}

              {orderedCategories.map(cat => {
                const isSelected = selectedCategory === cat;
                const count = categoryCounts[cat] || 0;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, isSelected && styles.catChipActive]}
                    onPress={() => setSelectedCategory(isSelected ? 'all' : cat)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                      {cat} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.reorderChipBtn}
                onPress={handleOpenReorderModal}
                activeOpacity={0.75}
              >
                <Ionicons name="swap-vertical" size={13} color="#7c3aed" style={{ marginRight: 3 }} />
                <Text style={styles.reorderChipText}>Reorder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── SETLIST QUEUE (TOUCH-FRIENDLY & UNCLUTTERED) ────────────────────── */}
      <FlatList
        data={filteredSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 20 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchSongs}
            tintColor={Colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 50, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.accent} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="musical-notes-outline"
              title={searchQuery || statusFilter !== 'all' ? 'No matching songs' : 'Setlist is Empty'}
              description={
                searchQuery || statusFilter !== 'all'
                  ? 'Try changing the filter or search query.'
                  : 'Tap "+ Song" or "Clone" to add songs to this rehearsal.'
              }
              actionLabel="Add First Song"
              onAction={() => setCreateSongModalVisible(true)}
            />
          )
        }
        renderItem={({ item, index }) => {
          const isHeard = Boolean(item.isHeard ?? item.heard ?? item.status === 'heard');
          const isLive = item.status === 'live' || Boolean(item.isLive);

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setSelectedSong(item);
                setDetailsModalVisible(true);
              }}
              style={[styles.trackCard, isLive && styles.trackCardActive]}
            >
              {/* Left Column: Track Number or Album Art Thumbnail */}
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.artworkThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.trackIndexBox}>
                  <Text style={styles.trackIndexNum}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
              )}

              {/* Middle Column: Song Info & Badges */}
              <View style={styles.trackInfoCol}>
                <Text style={styles.trackTitleText} numberOfLines={1}>
                  {item.title || 'Untitled Song'}
                </Text>

                <View style={styles.trackMetaRow}>
                  {item.leadSinger ? (
                    <Text style={styles.trackSingerText} numberOfLines={1}>
                      {item.leadSinger}
                    </Text>
                  ) : item.writer ? (
                    <Text style={styles.trackSingerText} numberOfLines={1}>
                      {item.writer}
                    </Text>
                  ) : null}

                  {item.key ? (
                    <View style={styles.smallKeyChip}>
                      <Text style={styles.smallKeyChipText}>{item.key}</Text>
                    </View>
                  ) : null}

                  {item.tempo ? (
                    <Text style={styles.smallTempoText}>{item.tempo} BPM</Text>
                  ) : null}
                </View>
              </View>

              {/* Right Column: 1-Tap LIVE Broadcast, Heard Toggle & Delete */}
              <View style={styles.trackRightCol}>
                {/* 1-Tap LIVE Toggle */}
                <TouchableOpacity
                  style={[
                    styles.liveToggleBtn,
                    isLive ? styles.liveToggleBtnActive : styles.liveToggleBtnInactive,
                  ]}
                  onPress={() => handleToggleSongActive(item)}
                  activeOpacity={0.75}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text
                    style={[
                      styles.liveToggleBtnText,
                      isLive ? styles.liveToggleBtnTextActive : styles.liveToggleBtnTextInactive,
                    ]}
                  >
                    {isLive ? '● LIVE' : 'OFF'}
                  </Text>
                </TouchableOpacity>

                {/* 1-Tap Heard Toggle */}
                <TouchableOpacity
                  style={[
                    styles.heardTouchBtn,
                    isHeard ? styles.heardTouchBtnActive : styles.heardTouchBtnInactive,
                  ]}
                  onPress={() => handleToggleHeard(item)}
                  activeOpacity={0.75}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons
                    name={isHeard ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={isHeard ? '#10b981' : '#cbd5e1'}
                  />
                </TouchableOpacity>

                {/* Quick delete on right */}
                <TouchableOpacity
                  style={styles.deleteTrackTouch}
                  onPress={() => handleRemoveSong(item.id, item.title || 'this song')}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={15} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── MODALS (HIGH-END SAFE AREA ARCHITECTURE) ──────────────────────── */}
      <SongDetailsModal
        visible={detailsModalVisible}
        song={selectedSong}
        programId={currentProgram.id}
        onClose={() => setDetailsModalVisible(false)}
        onSave={handleSongUpdated}
        onDelete={(songId) => {
          setProgramSongs(prev => prev.filter(s => s.id !== songId));
          api.songs.delete(songId).catch(() => {});
          setDetailsModalVisible(false);
        }}
      />

      <CloneFromMasterModal
        visible={cloneModalVisible}
        programId={currentProgram.id}
        existingIds={existingIds}
        onClose={() => setCloneModalVisible(false)}
        onCloned={handleSongCloned}
      />

      <CreateSongModal
        visible={createSongModalVisible}
        programId={currentProgram.id}
        existingIds={existingIds}
        onClose={() => setCreateSongModalVisible(false)}
        onCreated={handleSongCreated}
      />

      <EditProgramModal
        visible={editProgramModalVisible}
        program={currentProgram}
        onClose={() => setEditProgramModalVisible(false)}
        onSaved={updated => {
          if (updated) setCurrentProgram(p => ({ ...p, ...updated }));
          setEditProgramModalVisible(false);
        }}
      />

      {/* ── REORDER CATEGORIES MODAL (SYNCED TO MOBILE TABS) ───────────── */}
      <Modal
        visible={reorderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReorderModalVisible(false)}
      >
        <View style={styles.reorderOverlay}>
          <View style={[styles.reorderSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHandle} />

            <View style={styles.reorderHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.reorderTitle}>Reorder Categories</Text>
                <Text style={styles.reorderSubtitle}>
                  Arrange how categories appear in the mobile app tabs
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReorderModalVisible(false)}
                style={styles.reorderCloseBtn}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {reorderCategoriesList.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '500' }}>
                    No categories found in this program.
                  </Text>
                </View>
              ) : (
                reorderCategoriesList.map((category, index) => {
                  const count = categoryCounts[category] || 0;
                  const isFirst = index === 0;
                  const isLast = index === reorderCategoriesList.length - 1;
                  return (
                    <View key={category} style={styles.reorderRow}>
                      <View style={styles.reorderRowIndex}>
                        <Text style={styles.reorderIndexText}>#{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.reorderCategoryName} numberOfLines={1}>
                          {category}
                        </Text>
                        <Text style={styles.reorderCategoryCount}>
                          {count} {count === 1 ? 'song' : 'songs'}
                        </Text>
                      </View>

                      <View style={styles.reorderActions}>
                        <TouchableOpacity
                          style={[styles.arrowBtn, isFirst && styles.arrowBtnDisabled]}
                          onPress={() => handleMoveCategory(index, 'up')}
                          disabled={isFirst}
                        >
                          <Ionicons
                            name="arrow-up"
                            size={18}
                            color={isFirst ? '#cbd5e1' : '#0f172a'}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.arrowBtn, isLast && styles.arrowBtnDisabled]}
                          onPress={() => handleMoveCategory(index, 'down')}
                          disabled={isLast}
                        >
                          <Ionicons
                            name="arrow-down"
                            size={18}
                            color={isLast ? '#cbd5e1' : '#0f172a'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.reorderFooter}>
              <TouchableOpacity
                style={styles.reorderResetBtn}
                onPress={() => setReorderCategoriesList([...uniqueCategories])}
                activeOpacity={0.75}
              >
                <Text style={styles.reorderResetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reorderSaveBtn}
                onPress={handleSaveCategoryOrder}
                disabled={isSavingCategoryOrder}
                activeOpacity={0.8}
              >
                {isSavingCategoryOrder ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.reorderSaveBtnText}>Save Order</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN STYLES (CLEAN, MODERN, HIGH-END)
// ────────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navBackBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  navTitleCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  navTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  navMetaSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  navActionBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  filterSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressPill: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  progressPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addBtnSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  cloneBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  cloneBtnSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    height: 36,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
  },
  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 4.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  trackCardActive: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffbfa',
  },
  trackIndexBox: {
    width: 24,
    marginRight: 10,
  },
  artworkThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    marginRight: 10,
  },
  trackIndexNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  trackInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  trackTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  trackMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2.5,
  },
  trackSingerText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    flexShrink: 1,
  },
  smallKeyChip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  smallKeyChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#4338ca',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  smallTempoText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  trackRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  heardTouchBtn: {
    padding: 2,
  },
  heardTouchBtnActive: {},
  heardTouchBtnInactive: {},
  liveToggleBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveToggleBtnActive: {
    backgroundColor: '#ffe4e6',
    borderColor: '#f43f5e',
  },
  liveToggleBtnInactive: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  liveToggleBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  liveToggleBtnTextActive: {
    color: '#e11d48',
  },
  liveToggleBtnTextInactive: {
    color: '#94a3b8',
  },
  deleteTrackTouch: {
    padding: 4,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  // Category Filter Bar
  categoryBarWrap: {
    marginTop: 8,
    marginHorizontal: -16,
  },
  categoryBarScroll: {
    paddingHorizontal: 16,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  catChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  reorderChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  reorderChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  // Reorder Categories Modal
  reorderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  reorderSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  reorderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  reorderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  reorderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  reorderCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  reorderRowIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reorderIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  reorderCategoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  reorderCategoryCount: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  reorderActions: {
    flexDirection: 'row',
    gap: 6,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#f8fafc',
  },
  reorderFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
  },
  reorderResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderResetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  reorderSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});

// ────────────────────────────────────────────────────────────────────────────────
// HIGH-END MODAL SHEET STYLES (Proper Safe Area Insets)
// ────────────────────────────────────────────────────────────────────────────────

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cancelText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  saveText: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '800',
  },
  quickStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  heardStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heardStatusChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  heardStatusChipInactive: {
    backgroundColor: '#ffffff',
  },
  heardStatusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heardStatusChipTextActive: {
    color: '#047857',
  },
  heardStatusChipTextInactive: {
    color: '#64748b',
  },
  categoryBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  fieldBlock: {
    gap: 4,
  },
  labelWithActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pickMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  pickMediaBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  cleanInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#0f172a',
  },
  multilineInput: {
    height: 100,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  keyChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  keyChipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  keyChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  keyChipTextActive: {
    color: '#ffffff',
  },
  audioPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  cloneSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 1,
  },
  cloneSongTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  cloneSongMeta: {
    fontSize: 11,
    color: '#64748b',
  },
  cloneAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 8,
  },
  cloneAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusChipOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusChipOptionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 3,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#7c3aed',
    fontWeight: '800',
  },
  audioPlayBtnPlaying: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  artworkThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    marginRight: 10,
  },
  stemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
  },
  stemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  stemBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  stemBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7c3aed',
    letterSpacing: 0.4,
  },
  addCustomPartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    marginTop: 4,
  },
  addCustomPartBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
});
