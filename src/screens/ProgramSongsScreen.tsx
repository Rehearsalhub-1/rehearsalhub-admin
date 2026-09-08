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
import { Audio } from 'expo-av';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';
import { EmptyState, Badge } from '../components/ui';
import MediaSelectionModal from '../components/MediaSelectionModal';
import { ProgramModal } from './ProgramsScreen';
import SongModal from '../components/SongModal';

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
  isHeard?: boolean;
  heard?: boolean;
  status?: string;
  comments?: any[];
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

function SongDetailsModal({ visible, song, programId = '', onClose, onSave }: SongDetailsModalProps) {
  return (
    <SongModal
      visible={visible}
      song={song}
      programId={programId}
      onClose={onClose}
      onSaved={(updated) => onSave(updated as PraiseSong)}
    />
  );
}

// ── Realistic Mock Data (Mirroring Web Admin Songs & Setlists) ───────────────
export const MOCK_PROGRAM_SONGS: PraiseSong[] = [
  {
    id: 'song-01',
    title: 'King of Kings (You Reign)',
    key: 'D',
    tempo: '112',
    leadSinger: 'Pastor Ruth',
    conductor: 'Bro Wisdom',
    writer: 'Loveworld Singers',
    category: 'Worship',
    categories: ['Worship', 'Anthem'],
    status: 'heard',
    isHeard: true,
    heard: true,
    isActive: true,
    rehearsalCount: 4,
    audioFile: 'https://cdn.example.com/audio/king-of-kings.mp3',
    audioUrls: {
      full: 'https://cdn.example.com/audio/king-of-kings.mp3',
      soprano: 'https://cdn.example.com/audio/king-of-kings-soprano.mp3',
      alto: 'https://cdn.example.com/audio/king-of-kings-alto.mp3',
      tenor: 'https://cdn.example.com/audio/king-of-kings-tenor.mp3',
      bass: 'https://cdn.example.com/audio/king-of-kings-bass.mp3',
    },
    customParts: ['Acoustic Guitar', 'Harmony'],
    leadKeyboardist: 'Bro Daniel',
    leadGuitarist: 'Bro Samuel',
    drummer: 'Bro David',
    lyrics: `Verse 1:
You sit upon the throne of grace
Surrounded by unending praise
Your majesty fills all the earth
None can match Your holy worth

Chorus:
King of Kings, You reign forever
Lord of all, Your kingdom never ends
With one voice, we lift Your glory
King of Kings, You reign!`,
    solfas: `Verse 1:
s : d : m | r : - : d | l : - : s |
m : s : d' | t : - : l | s : - : - |`,
    notation: `Key D major. 4/4 Time. Moderate tempo with heavy choir unison on Chorus.`,
    coordinatorComment: 'Sopranos keep the pitch bright on the bridge transition. Drums build slowly at measure 32.',
  },
  {
    id: 'song-02',
    title: 'Lord of All Creation',
    key: 'G',
    tempo: '128',
    leadSinger: 'Eli-J',
    conductor: 'Sis Blessing',
    writer: 'Eli-J & LW Singers',
    category: 'Praise',
    categories: ['Praise'],
    status: 'unheard',
    isHeard: false,
    heard: false,
    isActive: false,
    rehearsalCount: 2,
    audioFile: 'https://cdn.example.com/audio/lord-of-creation.mp3',
    audioUrls: {
      full: 'https://cdn.example.com/audio/lord-of-creation.mp3',
      soprano: 'https://cdn.example.com/audio/lord-of-creation-soprano.mp3',
      tenor: 'https://cdn.example.com/audio/lord-of-creation-tenor.mp3',
    },
    leadKeyboardist: 'Bro Enoch',
    drummer: 'Bro Victor',
    lyrics: `Verse 1:
Lord of all creation, Ruler of the stars
We proclaim Your greatness, how wonderful You are!

Chorus:
Shout for joy! Give Him all the glory!
He has done mighty things for us!`,
    solfas: `d : m : s | f : m : r | d : - : - |`,
    coordinatorComment: 'Energetic start! Tenors ensure clarity on the counter-melody.',
  },
  {
    id: 'song-03',
    title: 'Mighty God, Awesome Wonder',
    key: 'E',
    tempo: '95',
    leadSinger: 'Maya',
    conductor: 'Bro Wisdom',
    writer: 'Maya',
    category: 'Thanksgiving',
    categories: ['Thanksgiving', 'Worship'],
    status: 'unheard',
    isHeard: false,
    heard: false,
    isActive: false,
    rehearsalCount: 1,
    lyrics: `Chorus:
Mighty God, awesome wonder
We bow before Your holy presence
Glory and honor unto Your name`,
    coordinatorComment: 'Pay attention to the modulation into Key F# on the final chorus.',
  },
  {
    id: 'song-04',
    title: 'Grateful Hearts',
    key: 'F',
    tempo: '105',
    leadSinger: 'Cliff M',
    writer: 'Loveworld Singers',
    category: 'Special',
    categories: ['Special'],
    status: 'heard',
    isHeard: true,
    heard: true,
    isActive: false,
    rehearsalCount: 3,
    lyrics: `With grateful hearts we come
Singing praises to Your holy name`,
  },
  {
    id: 'song-05',
    title: 'Hallelujah to the Lamb',
    key: 'C',
    tempo: '74',
    leadSinger: 'Sophia',
    conductor: 'Sis Grace',
    writer: 'Loveworld Singers',
    category: 'Hymn',
    categories: ['Hymn'],
    status: 'unheard',
    isHeard: false,
    heard: false,
    isActive: false,
    rehearsalCount: 0,
    lyrics: `Hallelujah, Hallelujah,
To the Lamb upon the throne!`,
  },
];

export const MOCK_MASTER_REPERTOIRE: MasterSong[] = [
  { id: 'master-01', title: 'Glorious God and King', leadSinger: 'Pastor Ruth', writer: 'LW Singers', key: 'Eb', tempo: '88', category: 'Worship' },
  { id: 'master-02', title: 'Everlasting Father', leadSinger: 'Eli-J', writer: 'Eli-J', key: 'G', tempo: '120', category: 'Praise' },
  { id: 'master-03', title: 'Victory in His Name', leadSinger: 'Cliff M', writer: 'LW Singers', key: 'A', tempo: '130', category: 'Praise' },
  { id: 'master-04', title: 'Holy Are You Lord', leadSinger: 'Maya', writer: 'Maya', key: 'D', tempo: '72', category: 'Worship' },
  { id: 'master-05', title: 'Exalted Above All', leadSinger: 'Sophia', writer: 'LW Singers', key: 'Bb', tempo: '96', category: 'Anthem' },
  { id: 'master-06', title: 'Rejoice in the Lord', leadSinger: 'Bro David', writer: 'LW Singers', key: 'F', tempo: '115', category: 'Praise' },
  { id: 'master-07', title: 'Mercy and Truth', leadSinger: 'Sis Blessing', writer: 'LW Singers', key: 'C', tempo: '80', category: 'Thanksgiving' },
];

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
  const [songs, setSongs] = useState<MasterSong[]>(MOCK_MASTER_REPERTOIRE);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setLoading(false);
      setSongs(MOCK_MASTER_REPERTOIRE);
      api.songs.getMasterSongs()
        .then(res => {
          if (Array.isArray(res?.data) && res.data.length > 0) {
            setSongs(res.data);
          }
        })
        .catch(() => {});
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

      api.songs.create({
        ...clonedSong,
        programId,
        praiseNightId: programId,
      }).catch(() => {});

      onCloned(clonedSong);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to clone song.');
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

  const [programSongs, setProgramSongs] = useState<PraiseSong[]>(MOCK_PROGRAM_SONGS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'heard' | 'unheard'>('all');

  // Modals state
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState<PraiseSong | null>(null);
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [createSongModalVisible, setCreateSongModalVisible] = useState(false);
  const [editProgramModalVisible, setEditProgramModalVisible] = useState(false);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await api.songs.getPraiseNightSongs(currentProgram.id);
      if (Array.isArray(res?.data) && res.data.length > 0) {
        setProgramSongs(res.data);
      }
    } catch (e) {
      console.error('[ProgramSongs] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentProgram.id]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  function handleOpenActionMenu() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Add Song', 'Clone from All Ministered', 'Edit Program Details'],
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          if (buttonIndex === 1) setCreateSongModalVisible(true);
          else if (buttonIndex === 2) setCloneModalVisible(true);
          else if (buttonIndex === 3) setEditProgramModalVisible(true);
        }
      );
    } else {
      Alert.alert(
        currentProgram.name || 'Setlist Options',
        'Select an action',
        [
          { text: 'Add Song', onPress: () => setCreateSongModalVisible(true) },
          { text: 'Clone from All Ministered', onPress: () => setCloneModalVisible(true) },
          { text: 'Edit Program Details', onPress: () => setEditProgramModalVisible(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }

  function handleRemoveSong(songId: string, title: string) {
    Alert.alert('Remove Song', `Remove "${title}" from this setlist?`, [
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
    const nextActive = !song.isActive;
    setProgramSongs(prev =>
      prev.map(s => (s.id === song.id ? { ...s, isActive: nextActive } : s))
    );
    api.songs.toggleActive(song.id, nextActive).catch(() => {});
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
  }

  function handleSongCreated(newSong?: PraiseSong) {
    if (newSong) {
      setProgramSongs(prev => [newSong, ...prev]);
    }
  }

  function handleSongCloned(clonedSong?: PraiseSong) {
    if (clonedSong) {
      setProgramSongs(prev => [clonedSong, ...prev]);
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
  }, [programSongs, statusFilter, searchQuery]);

  const existingIds = useMemo(() => programSongs.map(s => s.id), [programSongs]);
  const currentCat = currentProgram.category || currentProgram.status || 'pre-rehearsal';
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
          const isActive = Boolean(item.isActive);

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setSelectedSong(item);
                setDetailsModalVisible(true);
              }}
              style={[styles.trackCard, isActive && styles.trackCardActive]}
            >
              {/* Left Column: Track Number */}
              <View style={styles.trackIndexBox}>
                <Text style={styles.trackIndexNum}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
              </View>

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
                    isActive ? styles.liveToggleBtnActive : styles.liveToggleBtnInactive,
                  ]}
                  onPress={() => handleToggleSongActive(item)}
                  activeOpacity={0.75}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text
                    style={[
                      styles.liveToggleBtnText,
                      isActive ? styles.liveToggleBtnTextActive : styles.liveToggleBtnTextInactive,
                    ]}
                  >
                    {isActive ? '● LIVE' : 'OFF'}
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
