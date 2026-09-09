import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  useWindowDimensions,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import MediaSelectionModal from './MediaSelectionModal';

export interface PraiseNightSong {
  id?: string;
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
  customParts?: string[] | Record<string, string>;
  leadKeyboardist?: string;
  leadGuitarist?: string;
  drummer?: string;
  coordinatorComment?: string;
  coordinatorAudioUrl?: string;
  isActive?: boolean;
  isHeard?: boolean;
  heard?: boolean;
  status?: 'heard' | 'unheard' | string;
  comments?: any[];
  programId?: string;
  programName?: string;
  praiseNightId?: string;
  praiseNightName?: string;
  history?: any[];
  isHQOnly?: boolean;
  is_hq_only?: boolean;
  isHqOnly?: boolean;
  scope?: string;
  isHidden?: boolean;
}

export interface EditSongModalProps {
  visible: boolean;
  song: PraiseNightSong | null;
  programId?: string;
  programName?: string;
  programs?: Array<{ id: string; name: string }>;
  praiseNights?: Array<{ id: string; name: string }>;
  categories?: string[];
  onClose: () => void;
  onUpdate: (updatedSong: PraiseNightSong) => void;
  onDelete?: (songId: string) => void;
}

const DEFAULT_CATEGORIES = [
  'Worship',
  'Praise',
  'Thanksgiving',
  'Anthem',
  'Special',
  'Hymn',
  'Evangelism',
  'Choir Special',
];

const DEFAULT_PROGRAMS: { id: string; name: string }[] = [];

export default function EditSongModal({
  visible,
  song,
  programId = '',
  programName = '',
  programs,
  praiseNights,
  categories = DEFAULT_CATEGORIES,
  onClose,
  onUpdate,
  onDelete,
}: EditSongModalProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  // Resolution for available programs (backwards compatible with praiseNights)
  const availablePrograms = programs || praiseNights || DEFAULT_PROGRAMS;

  // ── Responsive Breakpoint Flags ──────────────────────────────────────────
  const isDesktop = windowWidth >= 1024;      // 2-column layout matching Web Admin
  const isTablet = windowWidth >= 768;       // Tablet sizing
  const isMedium = windowWidth >= 540;       // Medium phone/phablet
  const isCompact = windowWidth >= 400;      // Standard phone
  const isSmallPhone = windowWidth < 360;    // Small compact phone

  // ── Form State (Direct 1:1 Mirror of Web Admin EditSongModal.tsx) ──────────
  const [songTitle, setSongTitle] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>(categories);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [songCategories, setSongCategories] = useState<string[]>([]);
  const [songStatus, setSongStatus] = useState<'heard' | 'unheard'>('unheard');
  const [songProgram, setSongProgram] = useState('');
  const [isSongActive, setIsSongActive] = useState(false);
  const [isHQOnly, setIsHQOnly] = useState(false);
  const [songImageUrl, setSongImageUrl] = useState('');

  // Music Details
  const [songKey, setSongKey] = useState('');
  const [songTempo, setSongTempo] = useState('');
  const [rehearsalCount, setRehearsalCount] = useState(0);
  const [songAudioFile, setSongAudioFile] = useState('');

  // AudioLab Parts
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [customParts, setCustomParts] = useState<string[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [showAddPart, setShowAddPart] = useState(false);

  // Personnel
  const [songLeadSinger, setSongLeadSinger] = useState('');
  const [songWriter, setSongWriter] = useState('');
  const [songConductor, setSongConductor] = useState('');
  const [songLeadKeyboardist, setSongLeadKeyboardist] = useState('');
  const [songLeadGuitarist, setSongLeadGuitarist] = useState('');
  const [songDrummer, setSongDrummer] = useState('');

  // Lyrics, Notation & Directives
  const [songLyrics, setSongLyrics] = useState('');
  const [songSolfas, setSongSolfas] = useState('');
  const [songNotation, setSongNotation] = useState('');
  const [coordinatorComment, setCoordinatorComment] = useState('');
  const [coordinatorAudioUrl, setCoordinatorAudioUrl] = useState('');

  // Modals & Pickers
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'audio' | 'image'>('audio');
  const [showProgramPicker, setShowProgramPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // History entries state (Direct parity with Web Admin EditSongHistoryModals.tsx)
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [showHistoryList, setShowHistoryList] = useState(false);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [editingHistoryEntryId, setEditingHistoryEntryId] = useState<string | null>(null);
  const [historyFormType, setHistoryFormType] = useState<string>('song-details');
  const [historyFormTitle, setHistoryFormTitle] = useState('');
  const [historyFormDesc, setHistoryFormDesc] = useState('');
  const [originalHistoryValues, setOriginalHistoryValues] = useState<{ old_value: string; new_value: string }>({
    old_value: '',
    new_value: '',
  });

  // Audio Playback
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  // Populate form on open/change
  useEffect(() => {
    if (song) {
      setSongTitle(song.title || '');
      const cats = Array.isArray(song.categories)
        ? song.categories
        : song.category
        ? [song.category]
        : [];
      setSongCategories(cats);
      setAvailableCategories(prev => Array.from(new Set([...categories, ...prev, ...cats])));
      setSongStatus(song.status === 'heard' || song.isHeard || song.heard ? 'heard' : 'unheard');
      setIsSongActive(Boolean(song.isActive));
      setIsHQOnly(Boolean(song.isHQOnly || song.is_hq_only || song.isHqOnly || song.scope === 'hq' || song.status === 'hq_only' || (song as any)?.audioUrls?._isHQOnly));
      setSongProgram(song.programName || song.praiseNightName || programName);
      setSongImageUrl(song.imageUrl || '');
      setSongKey(song.key || '');
      setSongTempo(song.tempo || '');
      setRehearsalCount(song.rehearsalCount ?? 0);
      setSongAudioFile(song.audioFile || song.audioUrl || '');
      setAudioUrls(song.audioUrls || {});

      let cParts: string[] = [];
      if (Array.isArray(song.customParts)) {
        cParts = song.customParts;
      } else if (song.customParts && typeof song.customParts === 'object') {
        cParts = Object.keys(song.customParts);
      }
      setCustomParts(cParts);

      setSongLeadSinger(song.leadSinger || '');
      setSongWriter(song.writer || '');
      setSongConductor(song.conductor || '');
      setSongLeadKeyboardist(song.leadKeyboardist || '');
      setSongLeadGuitarist(song.leadGuitarist || '');
      setSongDrummer(song.drummer || '');

      setSongLyrics(song.lyrics || '');
      setSongSolfas(song.solfas || song.solfa || '');
      setSongNotation(song.notation || '');

      // Parse latest comment
      let commentText = song.coordinatorComment || '';
      let commentAudio = song.coordinatorAudioUrl || '';
      if (!commentText && Array.isArray(song.comments) && song.comments.length > 0) {
        const last = song.comments[song.comments.length - 1];
        commentText = last.text || last.content || '';
        commentAudio = last.audioUrl || '';
      }
      setCoordinatorComment(commentText);
      setCoordinatorAudioUrl(commentAudio);

      setHistoryEntries(Array.isArray(song.history) ? song.history : []);
    } else {
      // Add mode defaults
      setSongTitle('');
      setSongCategories([]);
      setSongStatus('unheard');
      setIsSongActive(false);
      setIsHQOnly(false);
      setSongProgram(programName);
      setSongImageUrl('');
      setSongKey('');
      setSongTempo('');
      setRehearsalCount(0);
      setSongAudioFile('');
      setAudioUrls({});
      setCustomParts([]);
      setSongLeadSinger('');
      setSongWriter('');
      setSongConductor('');
      setSongLeadKeyboardist('');
      setSongLeadGuitarist('');
      setSongDrummer('');
      setSongLyrics('');
      setSongSolfas('');
      setSongNotation('');
      setCoordinatorComment('');
      setCoordinatorAudioUrl('');
      setHistoryEntries([]);
    }
  }, [song, visible, programName]);

  // Audio cleanup
  const stopAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {
      // ignore cleanup errors
    } finally {
      setPlayingAudioUrl(null);
      setAudioLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const handleTogglePlay = async (url: string) => {
    if (!url) return;
    if (playingAudioUrl === url) {
      await stopAudio();
      return;
    }
    await stopAudio();
    setAudioLoading(true);
    setPlayingAudioUrl(url);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        status => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingAudioUrl(null);
          }
        }
      );
      soundRef.current = sound;
    } catch {
      Alert.alert('Playback Error', 'Unable to play this audio track.');
      setPlayingAudioUrl(null);
    } finally {
      setAudioLoading(false);
    }
  };

  // Media File Selector Handler
  const handleOpenMediaSelector = (part: string, type: 'audio' | 'image' = 'audio') => {
    setMediaTarget(part);
    setMediaType(type);
    setShowMediaModal(true);
  };

  const handleMediaSelected = (url: string) => {
    if (!mediaTarget) return;
    if (mediaTarget === 'image') {
      setSongImageUrl(url);
    } else if (mediaTarget === 'mainAudio') {
      setSongAudioFile(url);
    } else if (mediaTarget === 'commentAudio') {
      setCoordinatorAudioUrl(url);
    } else {
      setAudioUrls(prev => ({ ...prev, [mediaTarget]: url }));
    }
    setShowMediaModal(false);
    setMediaTarget(null);
  };

  // Add new category inline
  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const existing = availableCategories.find(c => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!songCategories.includes(existing)) {
        setSongCategories(prev => [...prev, existing]);
      }
    } else {
      setAvailableCategories(prev => [...prev, trimmed]);
      setSongCategories(prev => [...prev, trimmed]);
    }
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };

  // Categories Toggle
  const toggleCategory = (catName: string) => {
    setSongCategories(prev => {
      if (prev.includes(catName)) {
        return prev.filter(c => c !== catName);
      } else {
        return [...prev, catName];
      }
    });
  };

  // Custom Parts Management
  const handleAddCustomPart = () => {
    const trimmed = newPartName.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();
    const defaults = ['soprano', 'alto', 'tenor', 'bass'];
    if (defaults.includes(normalized) || customParts.map(p => p.toLowerCase()).includes(normalized)) {
      Alert.alert('Duplicate Part', 'This audio part already exists.');
      return;
    }
    setCustomParts(prev => [...prev, trimmed]);
    setAudioUrls(prev => ({ ...prev, [trimmed]: '' }));
    setNewPartName('');
    setShowAddPart(false);
  };

  const handleRemoveCustomPart = (partName: string) => {
    setCustomParts(prev => prev.filter(p => p !== partName));
    setAudioUrls(prev => {
      const copy = { ...prev };
      delete copy[partName];
      return copy;
    });
  };

  const handleRemoveAudioPart = (partKey: string) => {
    setAudioUrls(prev => ({ ...prev, [partKey]: '' }));
  };

  const formatHistoryType = (type: string) => {
    switch (type) {
      case 'song-details': return 'Song Details';
      case 'personnel': return 'Personnel';
      case 'music-details': return 'Music Details';
      case 'lyrics': return 'Lyrics';
      case 'solfas': return 'Solfas';
      case 'notation': return 'Solfa Notation';
      case 'audio': return 'Audio';
      case 'comments': return 'Comments';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // History Version Creation & Management (Matching Web Admin EditSongHistoryModals.tsx)
  const handleAddHistory = (typeKey: string) => {
    setEditingHistoryEntryId(null);
    setHistoryFormType(typeKey);
    const label = formatHistoryType(typeKey);
    setHistoryFormTitle(`${label} Version ${new Date().toLocaleDateString()}`);
    setHistoryFormDesc(`Updated ${label.toLowerCase()} on ${new Date().toLocaleString()}`);

    let currentContent = '';
    switch (typeKey) {
      case 'song-details':
        currentContent = [
          `Title: ${songTitle || 'Untitled'}`,
          `Categories: ${songCategories.join(', ') || 'None'}`,
          `Program: ${songProgram || 'Default'}`,
          `Status: ${songStatus}`,
          songKey ? `Key: ${songKey}` : '',
          songTempo ? `Tempo: ${songTempo} BPM` : '',
        ].filter(Boolean).join('\n');
        break;
      case 'personnel':
        currentContent = [
          songLeadSinger ? `Lead Singer: ${songLeadSinger}` : '',
          songWriter ? `Writer: ${songWriter}` : '',
          songConductor ? `Conductor: ${songConductor}` : '',
          songLeadKeyboardist ? `Lead Keyboard: ${songLeadKeyboardist}` : '',
          songLeadGuitarist ? `Lead Guitar: ${songLeadGuitarist}` : '',
          songDrummer ? `Drummer: ${songDrummer}` : '',
        ].filter(Boolean).join('\n');
        break;
      case 'music-details':
        currentContent = [
          songKey ? `Key: ${songKey}` : '',
          songTempo ? `Tempo: ${songTempo} BPM` : '',
        ].filter(Boolean).join('\n');
        break;
      case 'lyrics':
        currentContent = songLyrics;
        break;
      case 'solfas':
        currentContent = songSolfas;
        break;
      case 'notation':
        currentContent = songNotation;
        break;
      case 'audio':
        currentContent = songAudioFile;
        break;
      case 'comments':
        currentContent = coordinatorComment;
        break;
      default:
        currentContent = '';
    }

    setOriginalHistoryValues({
      old_value: currentContent,
      new_value: currentContent,
    });
    setShowHistoryForm(true);
  };

  const handleEditHistoryEntry = (entry: any) => {
    setEditingHistoryEntryId(entry.id);
    setHistoryFormTitle(entry.title || '');
    setHistoryFormDesc(entry.description || '');
    setHistoryFormType(entry.type || 'song-details');
    setOriginalHistoryValues({
      old_value: entry.old_value || entry.description || '',
      new_value: entry.new_value || entry.old_value || entry.description || '',
    });
    setShowHistoryList(false);
    setShowHistoryForm(true);
  };

  const handleSaveHistoryEntry = () => {
    if (!historyFormTitle.trim()) {
      Alert.alert('Required', 'Please enter a version title.');
      return;
    }

    if (editingHistoryEntryId) {
      // Update existing entry
      setHistoryEntries(prev => prev.map(entry => {
        if (entry.id === editingHistoryEntryId) {
          return {
            ...entry,
            title: historyFormTitle.trim(),
            type: historyFormType,
            description: historyFormDesc.trim(),
            new_value: originalHistoryValues.new_value,
            updated_at: new Date().toISOString(),
          };
        }
        return entry;
      }));
      Alert.alert('History Updated', 'Revision entry has been updated.');
    } else {
      // Create new version
      const newEntry = {
        id: `hist-${Date.now()}`,
        type: historyFormType,
        title: historyFormTitle.trim(),
        description: historyFormDesc.trim(),
        old_value: originalHistoryValues.old_value,
        new_value: originalHistoryValues.new_value,
        created_at: new Date().toISOString(),
        date: new Date().toLocaleString(),
        created_by: 'Coordinator',
      };
      setHistoryEntries(prev => [newEntry, ...prev]);
      Alert.alert('History Saved', `New audit version for "${formatHistoryType(historyFormType)}" saved.`);
    }

    setEditingHistoryEntryId(null);
    setShowHistoryForm(false);
  };

  const handleDeleteHistoryEntry = (id: string) => {
    Alert.alert(
      'Delete History Entry',
      'Are you sure you want to delete this revision history entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setHistoryEntries(prev => prev.filter(h => h.id !== id));
          },
        },
      ]
    );
  };

  // Update / Add Song Submit Action
  const handleSubmit = () => {
    if (!songTitle.trim()) {
      Alert.alert('Required Field', 'Please enter a song title.');
      return;
    }

    const primaryCategory = songCategories[0] || 'Worship';
    const commentsList = (coordinatorComment.trim() || coordinatorAudioUrl.trim())
      ? [
          {
            id: `comment-${Date.now()}`,
            text: coordinatorComment.trim(),
            audioUrl: coordinatorAudioUrl.trim(),
            date: new Date().toISOString(),
            author: 'Coordinator',
          },
        ]
      : [];

    const payload: PraiseNightSong = {
      id: song?.id || `song-${Date.now()}`,
      title: songTitle.trim(),
      status: songStatus,
      isHeard: songStatus === 'heard',
      heard: songStatus === 'heard',
      isActive: isSongActive,
      isHQOnly: isHQOnly,
      is_hq_only: isHQOnly,
      isHqOnly: isHQOnly,
      scope: isHQOnly ? 'hq' : 'global',
      category: primaryCategory,
      categories: songCategories.length > 0 ? songCategories : [primaryCategory],
      praiseNightId: programId || 'prog-25',
      praiseNightName: songProgram || programName,
      programId: programId || 'prog-25',
      programName: songProgram || programName,
      lyrics: songLyrics,
      leadSinger: songLeadSinger.trim(),
      writer: songWriter.trim(),
      conductor: songConductor.trim(),
      key: songKey.trim(),
      tempo: songTempo.trim(),
      leadKeyboardist: songLeadKeyboardist.trim(),
      leadGuitarist: songLeadGuitarist.trim(),
      drummer: songDrummer.trim(),
      solfas: songSolfas,
      solfa: songSolfas,
      notation: songNotation,
      rehearsalCount: rehearsalCount,
      audioFile: songAudioFile.trim(),
      audioUrl: songAudioFile.trim(),
      audioUrls: audioUrls,
      customParts: customParts,
      imageUrl: songImageUrl.trim(),
      coordinatorComment: coordinatorComment.trim(),
      coordinatorAudioUrl: coordinatorAudioUrl.trim(),
      comments: commentsList,
      history: historyEntries,
    };

    stopAudio();
    onUpdate(payload);
    onClose();
  };

  const handleDelete = () => {
    if (!song || !song.id) return;
    Alert.alert(
      'Delete Song',
      `Are you sure you want to delete "${songTitle || song.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            stopAudio();
            if (onDelete && song.id) onDelete(song.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleClose = () => {
    stopAudio();
    onClose();
  };

  const isEditing = Boolean(song && song.id);

  // ───────────────────────────────────────────────────────────────────────────
  // CARD RENDERERS (Clean modular subcomponents matching Web Admin)
  // ───────────────────────────────────────────────────────────────────────────

  // Card 1: Song Details (Basic Info)
  const renderCard1 = () => (
    <View style={styles.cardSlate}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardHeaderTitle}>Song Details</Text>
        <TouchableOpacity
          style={styles.addHistoryBtn}
          onPress={() => handleAddHistory('song-details')}
        >
          <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.addHistoryBtnText}>Add History</Text>
        </TouchableOpacity>
      </View>

      {/* Song Title Input */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Song Title *</Text>
        <TextInput
          style={[styles.inputPrimary, styles.inputLarge]}
          value={songTitle}
          onChangeText={setSongTitle}
          placeholder="Enter song title"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Categories & Status Row (Responsive: Side-by-side on wide, stacked on mobile) */}
      <View style={[styles.fieldRowResponsive, !isMedium && { flexDirection: 'column' }]}>
        {/* Categories Checkbox Box */}
        <View style={{ flex: isMedium ? 1 : undefined }}>
          <View style={styles.categoriesHeaderRow}>
            <Text style={styles.fieldLabel}>Categories * (Select one or more)</Text>
            <TouchableOpacity
              style={styles.addCategoryPill}
              onPress={() => setShowNewCategoryInput(true)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={13} color="#7c3aed" style={{ marginRight: 2 }} />
              <Text style={styles.addCategoryPillText}>New Category</Text>
            </TouchableOpacity>
          </View>

          {/* Inline Add Category Input */}
          {showNewCategoryInput && (
            <View style={styles.newCategoryInputRow}>
              <TextInput
                style={styles.newCategoryTextInput}
                placeholder="Category name (e.g. Warfare, Anthem)"
                placeholderTextColor="#94a3b8"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
                onSubmitEditing={handleAddNewCategory}
              />
              <TouchableOpacity style={styles.addCategoryConfirmBtn} onPress={handleAddNewCategory}>
                <Text style={styles.addCategoryConfirmBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addCategoryCancelBtn}
                onPress={() => { setShowNewCategoryInput(false); setNewCategoryName(''); }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Scrollable Checkbox Container with nestedScrollEnabled */}
          <View style={styles.categoriesCheckboxContainer}>
            <ScrollView
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: 180 }}
              contentContainerStyle={{ paddingVertical: 2 }}
              keyboardShouldPersistTaps="handled"
            >
              {availableCategories.map(cat => {
                const isChecked = songCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={styles.categoryCheckboxRow}
                    onPress={() => toggleCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={isChecked ? '#7c3aed' : '#94a3b8'}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.categoryCheckboxText, isChecked && styles.categoryCheckboxTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <Text style={styles.selectedCategoriesSummary}>
            Selected: {songCategories.length > 0 ? songCategories.join(', ') : 'None'}
          </Text>
        </View>

        {/* Status Dropdown */}
        <View style={{ flex: isMedium ? 1 : undefined, marginTop: isMedium ? 0 : 12 }}>
          <Text style={styles.fieldLabel}>Status</Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setShowStatusPicker(true)}
          >
            <Text style={styles.pickerTriggerText}>
              {songStatus === 'heard' ? 'Heard' : 'Unheard'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* LIVE Broadcast Toggle Row (Card 1) */}
      <View style={styles.broadcastRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.fieldLabel}>Broadcast Status</Text>
          <Text style={styles.broadcastSubtext}>
            {isSongActive ? 'Song is broadcasting LIVE in real-time to choir' : 'Song is offline / rehearsal standby'}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.liveToggleBtn,
            isSongActive ? styles.liveToggleBtnActive : styles.liveToggleBtnInactive,
          ]}
          onPress={() => setIsSongActive(!isSongActive)}
          activeOpacity={0.8}
        >
          <View style={[styles.liveDot, isSongActive && styles.liveDotActive]} />
          <Text style={[styles.liveToggleBtnText, isSongActive && styles.liveToggleBtnTextActive]}>
            {isSongActive ? '● LIVE' : 'GO LIVE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* HQ Only / Regional Visibility Toggle */}
      <View style={styles.hqOnlyRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Ionicons
              name={isHQOnly ? 'lock-closed' : 'globe-outline'}
              size={15}
              color={isHQOnly ? '#7c3aed' : '#059669'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Hide from Regional Zones (HQ Only)</Text>
          </View>
          <Text style={styles.broadcastSubtext}>
            {isHQOnly
              ? 'HQ Exclusive: Hidden from all regional zones. Visible only to Loveworld Singers HQ.'
              : 'Universal Repertoire: Visible to all regional zones & church choir hubs.'}
          </Text>
        </View>
        <Switch
          value={isHQOnly}
          onValueChange={setIsHQOnly}
          trackColor={{ false: '#cbd5e1', true: '#c4b5fd' }}
          thumbColor={isHQOnly ? '#7c3aed' : '#ffffff'}
        />
      </View>

      {/* Program Dropdown (Full Width) */}
      <View style={[styles.fieldGroup, { marginTop: 12 }]}>
        <Text style={styles.fieldLabel}>Program</Text>
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => setShowProgramPicker(true)}
        >
          <Text style={styles.pickerTriggerText} numberOfLines={1}>
            {songProgram || 'Select Program'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Song Artwork Section */}
      <View style={[styles.fieldGroup, { marginTop: 14 }]}>
        <Text style={styles.fieldLabel}>Song Artwork</Text>
        <View style={[styles.artworkSectionRow, isSmallPhone && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          {songImageUrl ? (
            <View style={styles.artworkPreviewWrap}>
              <Image source={{ uri: songImageUrl }} style={styles.artworkImg} />
              <TouchableOpacity
                style={styles.artworkRemoveBadge}
                onPress={() => setSongImageUrl('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.artworkPlaceholder}>
              <Ionicons name="image-outline" size={24} color="#94a3b8" style={{ marginBottom: 4 }} />
              <Text style={styles.artworkPlaceholderText}>No Image</Text>
            </View>
          )}

          <View style={{ flex: 1, width: isSmallPhone ? '100%' : undefined }}>
            <TouchableOpacity
              style={styles.selectArtworkBtn}
              onPress={() => handleOpenMediaSelector('image', 'image')}
              activeOpacity={0.8}
            >
              <Ionicons name="folder-open-outline" size={15} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.selectArtworkBtnText}>Select Artwork</Text>
            </TouchableOpacity>
            <Text style={styles.artworkHintText}>
              This image will be used as the song's cover art in the mobile app.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Card 2: Music Details
  const renderCard2 = () => (
    <View style={styles.cardSlate}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardHeaderTitle}>Music Details</Text>
        <TouchableOpacity
          style={styles.addHistoryBtn}
          onPress={() => handleAddHistory('music-details')}
        >
          <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.addHistoryBtnText}>Add History</Text>
        </TouchableOpacity>
      </View>

      {/* Responsive Grid: 3-Col on tablet, 2-col/1-col on phone */}
      {isMedium ? (
        <View style={styles.threeColRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Key</Text>
            <TextInput
              style={styles.inputPrimary}
              value={songKey}
              onChangeText={setSongKey}
              placeholder="e.g., C, G, F#"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Tempo</Text>
            <TextInput
              style={styles.inputPrimary}
              value={songTempo}
              onChangeText={setSongTempo}
              placeholder="e.g., 120 BPM"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Rehearsal Count</Text>
            <TextInput
              style={styles.inputPrimary}
              value={String(rehearsalCount)}
              onChangeText={t => setRehearsalCount(parseInt(t, 10) || 0)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>
      ) : (
        /* Mobile: 2-col Key/Tempo + full width rehearsal count */
        <View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Key</Text>
              <TextInput
                style={styles.inputPrimary}
                value={songKey}
                onChangeText={setSongKey}
                placeholder="e.g., C, G, F#"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Tempo</Text>
              <TextInput
                style={styles.inputPrimary}
                value={songTempo}
                onChangeText={setSongTempo}
                placeholder="e.g., 120 BPM"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Rehearsal Count</Text>
            <TextInput
              style={styles.inputPrimary}
              value={String(rehearsalCount)}
              onChangeText={t => setRehearsalCount(parseInt(t, 10) || 0)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>
      )}

      {/* Master Audio Track Section */}
      <View style={[styles.fieldGroup, { marginTop: 16 }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.fieldLabel}>Audio File</Text>
          <TouchableOpacity
            style={styles.addHistoryBtn}
            onPress={() => handleAddHistory('audio')}
          >
            <Ionicons name="time-outline" size={12} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.addHistoryBtnText}>Add History</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.browseMediaPrimaryBtn}
          onPress={() => handleOpenMediaSelector('mainAudio', 'audio')}
          activeOpacity={0.85}
        >
          <Ionicons name="folder-open-outline" size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.browseMediaPrimaryBtnText}>Browse Media Library</Text>
        </TouchableOpacity>

        {songAudioFile ? (
          <View style={styles.audioFilePlayerBox}>
            <View style={styles.audioFileMetaRow}>
              <View style={styles.audioDotPurple} />
              <Text style={styles.audioFileName} numberOfLines={1}>
                {songAudioFile.split('/').pop() || 'Master Audio Track'}
              </Text>
              <TouchableOpacity
                onPress={() => setSongAudioFile('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <Text style={styles.audioFileSizeText}>(From Media Library)</Text>

            <View style={styles.inlinePlayerBar}>
              <TouchableOpacity
                style={[styles.miniPlayBtn, playingAudioUrl === songAudioFile && styles.miniPlayBtnActive]}
                onPress={() => handleTogglePlay(songAudioFile)}
              >
                {audioLoading && playingAudioUrl === songAudioFile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons
                    name={playingAudioUrl === songAudioFile ? 'pause' : 'play'}
                    size={14}
                    color={playingAudioUrl === songAudioFile ? '#ffffff' : '#7c3aed'}
                  />
                )}
                <Text style={[styles.miniPlayBtnText, playingAudioUrl === songAudioFile && styles.miniPlayBtnTextActive]}>
                  {playingAudioUrl === songAudioFile ? 'Pause Master Track' : 'Preview Master Track'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );

  // Card 3: Audio Parts (AudioLab)
  const renderCard3 = () => (
    <View style={styles.cardSlate}>
      <View style={[styles.cardHeaderRow, isSmallPhone && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
        <View>
          <Text style={styles.cardHeaderTitle}>Audio Parts (for AudioLab)</Text>
          <Text style={styles.cardHeaderSub}>Upload separate tracks for each vocal part</Text>
        </View>
        <TouchableOpacity
          style={styles.addCustomPartPill}
          onPress={() => setShowAddPart(true)}
        >
          <Ionicons name="add" size={14} color="#7c3aed" style={{ marginRight: 4 }} />
          <Text style={styles.addCustomPartPillText}>Add Custom Part</Text>
        </TouchableOpacity>
      </View>

      {/* Add Custom Part Input Bar */}
      {showAddPart && (
        <View style={styles.addCustomPartInputBar}>
          <TextInput
            style={styles.addCustomPartInput}
            placeholder="Part name (e.g., Harmony, Lead 2)"
            placeholderTextColor="#94a3b8"
            value={newPartName}
            onChangeText={setNewPartName}
          />
          <TouchableOpacity style={styles.addPartBtn} onPress={handleAddCustomPart}>
            <Text style={styles.addPartBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelPartBtn}
            onPress={() => { setShowAddPart(false); setNewPartName(''); }}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Responsive Stems Grid: 2-col on wide screens, 1-col on mobile */}
      <View style={[styles.stemsContainer, isTablet && { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {[
          { key: 'soprano', label: 'Soprano' },
          { key: 'alto', label: 'Alto' },
          { key: 'tenor', label: 'Tenor' },
          { key: 'bass', label: 'Bass' },
        ].map(({ key, label }) => {
          const hasStem = Boolean(audioUrls[key]);
          return (
            <View
              key={key}
              style={[
                styles.stemCard,
                hasStem ? styles.stemCardUploaded : styles.stemCardEmpty,
                isTablet && { width: '48.5%' },
              ]}
            >
              <View style={styles.stemCardTop}>
                <Text style={[styles.stemCardLabel, hasStem && styles.stemCardLabelUploaded]}>
                  {label}
                </Text>
                {hasStem && (
                  <Ionicons name="checkmark" size={18} color="#16a34a" />
                )}
              </View>

              {hasStem ? (
                <View style={styles.stemAudioActions}>
                  <TouchableOpacity
                    style={[styles.stemPlayTouch, playingAudioUrl === audioUrls[key] && styles.stemPlayTouchActive]}
                    onPress={() => handleTogglePlay(audioUrls[key])}
                  >
                    <Ionicons
                      name={playingAudioUrl === audioUrls[key] ? 'pause' : 'play'}
                      size={12}
                      color={playingAudioUrl === audioUrls[key] ? '#ffffff' : '#16a34a'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.stemPlayTouchText, playingAudioUrl === audioUrls[key] && styles.stemPlayTouchTextActive]}>
                      {playingAudioUrl === audioUrls[key] ? 'Playing' : 'Listen'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stemTrashBtn}
                    onPress={() => handleRemoveAudioPart(key)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectFromMediaBtn}
                  onPress={() => handleOpenMediaSelector(key, 'audio')}
                >
                  <Ionicons name="folder-open-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.selectFromMediaBtnText}>Select from Media</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Custom Parts Cards */}
        {customParts.map(partName => {
          const hasStem = Boolean(audioUrls[partName]);
          return (
            <View
              key={partName}
              style={[
                styles.stemCard,
                hasStem ? styles.stemCardUploaded : styles.stemCardCustomEmpty,
                isTablet && { width: '48.5%' },
              ]}
            >
              <View style={styles.stemCardTop}>
                <Text style={[styles.stemCardLabel, hasStem && styles.stemCardLabelUploaded]} numberOfLines={1}>
                  {partName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {hasStem && <Ionicons name="checkmark" size={18} color="#16a34a" />}
                  <TouchableOpacity
                    onPress={() => handleRemoveCustomPart(partName)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              {hasStem ? (
                <View style={styles.stemAudioActions}>
                  <TouchableOpacity
                    style={[styles.stemPlayTouch, playingAudioUrl === audioUrls[partName] && styles.stemPlayTouchActive]}
                    onPress={() => handleTogglePlay(audioUrls[partName])}
                  >
                    <Ionicons
                      name={playingAudioUrl === audioUrls[partName] ? 'pause' : 'play'}
                      size={12}
                      color={playingAudioUrl === audioUrls[partName] ? '#ffffff' : '#16a34a'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.stemPlayTouchText, playingAudioUrl === audioUrls[partName] && styles.stemPlayTouchTextActive]}>
                      {playingAudioUrl === audioUrls[partName] ? 'Playing' : 'Listen'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stemTrashBtn}
                    onPress={() => handleRemoveAudioPart(partName)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectFromMediaBtn}
                  onPress={() => handleOpenMediaSelector(partName, 'audio')}
                >
                  <Ionicons name="folder-open-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.selectFromMediaBtnText}>Select from Media</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  // Card 4: Personnel
  const renderCard4 = () => (
    <View style={styles.cardSlate}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardHeaderTitle}>Personnel</Text>
        <TouchableOpacity
          style={styles.addHistoryBtn}
          onPress={() => handleAddHistory('personnel')}
        >
          <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.addHistoryBtnText}>Add History</Text>
        </TouchableOpacity>
      </View>

      {/* Responsive Grid: 2-Col on screens >= 500px, 1-Col stacked on phones */}
      <View style={[styles.personnelGrid, isMedium && { flexDirection: 'row', flexWrap: 'wrap' }]}>
        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Lead Singer</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songLeadSinger}
            onChangeText={setSongLeadSinger}
            placeholder="Enter lead singer name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Writer</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songWriter}
            onChangeText={setSongWriter}
            placeholder="Enter writer name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Conductor's Guide</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songConductor}
            onChangeText={setSongConductor}
            placeholder="Enter conductor name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Lead Keyboardist</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songLeadKeyboardist}
            onChangeText={setSongLeadKeyboardist}
            placeholder="Enter lead keyboardist"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Bass Guitarist</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songLeadGuitarist}
            onChangeText={setSongLeadGuitarist}
            placeholder="Enter bass guitarist"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Drummer</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songDrummer}
            onChangeText={setSongDrummer}
            placeholder="Enter drummer name"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
    </View>
  );

  // Card 5: Song Lyrics
  const renderCard5 = () => (
    <View style={styles.cardWhiteWithHeader}>
      <View style={styles.cardWhiteHeaderBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.dotMarker, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.cardHeaderTitle}>Song Lyrics</Text>
        </View>
        <TouchableOpacity
          style={styles.addHistoryBtn}
          onPress={() => handleAddHistory('lyrics')}
        >
          <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.addHistoryBtnText}>Add History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardWhiteBody}>
        <View style={styles.helperBanner}>
          <Text style={styles.helperBannerText}>
            Rich text editor - Use the toolbar above to format your lyrics
          </Text>
        </View>

        <TextInput
          style={[styles.inputPrimary, styles.multilineEditor]}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          value={songLyrics}
          onChangeText={setSongLyrics}
          placeholder={`Enter complete song lyrics here...\n\nExample:\nVerse 1:\n[Your verse lyrics here]\n\nChorus:\n[Your chorus lyrics here]`}
          placeholderTextColor="#94a3b8"
        />
      </View>
    </View>
  );

  // Card 6: Conductor's Guide & Solfa Notation
  const renderCard6 = () => (
    <View style={{ gap: 16 }}>
      {/* Conductor's Guide Notation */}
      <View style={styles.cardWhiteWithHeader}>
        <View style={styles.cardWhiteHeaderBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.dotMarker, { backgroundColor: '#10b981' }]} />
            <Text style={styles.cardHeaderTitle}>Conductor's Guide Notation</Text>
          </View>
          <TouchableOpacity
            style={styles.addHistoryBtn}
            onPress={() => handleAddHistory('solfas')}
          >
            <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.addHistoryBtnText}>Add History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardWhiteBody}>
          <View style={styles.helperBanner}>
            <Text style={styles.helperBannerText}>
              Rich text editor - Use the toolbar above to format your solfas
            </Text>
          </View>

          <TextInput
            style={[styles.inputPrimary, styles.multilineEditor, styles.fontMono]}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={songSolfas}
            onChangeText={setSongSolfas}
            placeholder={`Enter solfas notation here...\n\nExample:\nDo Re Mi Fa Sol La Ti Do\nDo Re Mi Fa Sol La Ti Do`}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Solfa Notation */}
      <View style={styles.cardWhiteWithHeader}>
        <View style={styles.cardWhiteHeaderBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.dotMarker, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.cardHeaderTitle}>Solfa Notation</Text>
          </View>
          <TouchableOpacity
            style={styles.addHistoryBtn}
            onPress={() => handleAddHistory('notation')}
          >
            <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.addHistoryBtnText}>Add History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardWhiteBody}>
          <View style={styles.helperBanner}>
            <Text style={styles.helperBannerText}>
              Rich text editor - Enter the primary Solfas notation here
            </Text>
          </View>

          <TextInput
            style={[styles.inputPrimary, styles.multilineEditor, styles.fontMono]}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={songNotation}
            onChangeText={setSongNotation}
            placeholder="Enter solfas notation (primary version) here..."
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
    </View>
  );

  // Card 7: Coordinator Comments & Voice Note
  const renderCard7 = () => (
    <View style={styles.cardWhiteWithHeader}>
      <View style={styles.cardWhiteHeaderBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.dotMarker, { backgroundColor: '#8b5cf6' }]} />
          <Text style={styles.cardHeaderTitle}>Coordinator Comment</Text>
        </View>
        <TouchableOpacity
          style={styles.addHistoryBtn}
          onPress={() => handleAddHistory('comments')}
        >
          <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.addHistoryBtnText}>Save Version</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardWhiteBody}>
        <View style={styles.helperBanner}>
          <Text style={styles.helperBannerText}>
            Basic rich text - Bold and Italic supported
          </Text>
        </View>

        <TextInput
          style={[styles.inputPrimary, styles.multilineEditor]}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={coordinatorComment}
          onChangeText={setCoordinatorComment}
          placeholder="Add your notes or instructions for the team here..."
          placeholderTextColor="#94a3b8"
        />

        {/* Voice Note Section */}
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
          <Text style={styles.subFieldUppercase}>Audio Comment / Voice Note</Text>

          {coordinatorAudioUrl ? (
            <View style={styles.voiceNoteCard}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.miniPlayBtn, playingAudioUrl === coordinatorAudioUrl && styles.miniPlayBtnActive]}
                  onPress={() => handleTogglePlay(coordinatorAudioUrl)}
                >
                  <Ionicons
                    name={playingAudioUrl === coordinatorAudioUrl ? 'pause' : 'mic'}
                    size={14}
                    color={playingAudioUrl === coordinatorAudioUrl ? '#ffffff' : '#7c3aed'}
                  />
                </TouchableOpacity>
                <Text style={styles.voiceNoteTitle} numberOfLines={1}>
                  {coordinatorAudioUrl.split('/').pop() || 'Voice Directive'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCoordinatorAudioUrl('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addVoiceNoteTouch}
              onPress={() => handleOpenMediaSelector('commentAudio', 'audio')}
            >
              <Ionicons name="mic-outline" size={16} color="#7c3aed" style={{ marginRight: 6 }} />
              <Text style={styles.addVoiceNoteTouchText}>Add Audio Comment / Voice Note</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>

        {/* ── 1. EditSongHeader (Direct Web Admin Header) ────────────────────── */}
        <View style={styles.webHeader}>
          <View style={styles.webHeaderTitleWrap}>
            <Text style={styles.webHeaderTitle} numberOfLines={1}>
              {isEditing ? `Edit: ${songTitle || song?.title || 'Song'}` : 'Add New Song'}
            </Text>
          </View>

          <View style={styles.webHeaderActions}>
            {/* Quick 1-Tap LIVE Broadcast Pill Toggle */}
            <TouchableOpacity
              onPress={() => setIsSongActive(!isSongActive)}
              style={[
                styles.headerLivePill,
                isSongActive ? styles.headerLivePillActive : styles.headerLivePillInactive,
              ]}
              activeOpacity={0.8}
            >
              <View style={[styles.headerLiveDot, isSongActive && styles.headerLiveDotActive]} />
              <Text style={[styles.headerLiveText, isSongActive && styles.headerLiveTextActive]}>
                {isSongActive ? '● LIVE' : 'OFF'}
              </Text>
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.headerDeleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleClose}
              style={styles.headerCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. Scrollable Body: Dual-Column Desktop OR Single-Column Mobile ── */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={[
              styles.scrollContent,
              isDesktop && styles.scrollContentDesktop,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isDesktop ? (
              /* Desktop / iPad Pro: 2-Column Layout (col-span-2 & col-span-3) */
              <View style={styles.desktopTwoColContainer}>
                {/* Left Column: Basic Info, Music Details, AudioLab, Personnel */}
                <View style={styles.desktopLeftCol}>
                  {renderCard1()}
                  {renderCard2()}
                  {renderCard3()}
                  {renderCard4()}
                </View>

                {/* Right Column: Lyrics, Notation, Comments */}
                <View style={styles.desktopRightCol}>
                  {renderCard5()}
                  {renderCard6()}
                  {renderCard7()}
                </View>
              </View>
            ) : (
              /* Mobile / Phablet: Fluid Single-Column Flow */
              <View style={{ gap: 16 }}>
                {renderCard1()}
                {renderCard2()}
                {renderCard3()}
                {renderCard4()}
                {renderCard5()}
                {renderCard6()}
                {renderCard7()}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── 3. EditSongFooter (Responsive Footer Actions) ──────────────────── */}
        <View style={[styles.webFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {isMedium ? (
            /* Tablet/Desktop: 1 Row */
            <View style={styles.footerRowTablet}>
              <TouchableOpacity
                style={[styles.footerUpdateBtn, { flex: 1 }]}
                onPress={handleSubmit}
                activeOpacity={0.85}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.footerUpdateBtnText}>
                  {isEditing ? 'Update Song' : 'Add Song'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footerHistoryBtnTablet}
                onPress={() => setShowHistoryList(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.footerHistoryBtnText}>View History</Text>
                {historyEntries.length > 0 && (
                  <View style={styles.footerHistoryBadge}>
                    <Text style={styles.footerHistoryBadgeText}>{historyEntries.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footerCancelBtnTablet}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.footerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Phone: 2 Rows */
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={styles.footerUpdateBtn}
                onPress={handleSubmit}
                activeOpacity={0.85}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.footerUpdateBtnText}>
                  {isEditing ? 'Update Song' : 'Add Song'}
                </Text>
              </TouchableOpacity>

              <View style={styles.footerSecondaryRow}>
                <TouchableOpacity
                  style={styles.footerHistoryBtn}
                  onPress={() => setShowHistoryList(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.footerHistoryBtnText}>View History</Text>
                  {historyEntries.length > 0 && (
                    <View style={styles.footerHistoryBadge}>
                      <Text style={styles.footerHistoryBadgeText}>{historyEntries.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.footerCancelBtn}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.footerCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Media Selection Modal ─────────────────────────────────────────── */}
        <MediaSelectionModal
          visible={showMediaModal}
          onClose={() => { setShowMediaModal(false); setMediaTarget(null); }}
          allowedType={mediaType}
          title={mediaType === 'image' ? 'Select Song Artwork' : 'Select Audio File'}
          onSelect={handleMediaSelected}
        />

        {/* ── Program Selection Modal ────────────────────────────────────────── */}
        <Modal visible={showProgramPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowProgramPicker(false)}
          >
            <View style={[styles.pickerModalContent, isTablet && styles.pickerModalContentCentered]}>
              <Text style={styles.pickerModalTitle}>Select Program</Text>
              <ScrollView style={{ maxHeight: 280 }}>
                {availablePrograms.map(pn => (
                  <TouchableOpacity
                    key={pn.id}
                    style={styles.pickerOptionItem}
                    onPress={() => {
                      setSongProgram(pn.name);
                      setShowProgramPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, songProgram === pn.name && styles.pickerOptionTextActive]}>
                      {pn.name}
                    </Text>
                    {songProgram === pn.name && (
                      <Ionicons name="checkmark" size={18} color="#7c3aed" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Status Selection Modal ────────────────────────────────────────── */}
        <Modal visible={showStatusPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowStatusPicker(false)}
          >
            <View style={[styles.pickerModalContent, isTablet && styles.pickerModalContentCentered]}>
              <Text style={styles.pickerModalTitle}>Select Status</Text>
              {(['unheard', 'heard'] as const).map(st => (
                <TouchableOpacity
                  key={st}
                  style={styles.pickerOptionItem}
                  onPress={() => {
                    setSongStatus(st);
                    setShowStatusPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, songStatus === st && styles.pickerOptionTextActive]}>
                    {st === 'heard' ? 'Heard' : 'Unheard'}
                  </Text>
                  {songStatus === st && (
                    <Ionicons name="checkmark" size={18} color="#7c3aed" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── View History Entries Modal (Web Admin 1:1 Parity) ─────────────── */}
        <Modal visible={showHistoryList} transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={[styles.historyListSheet, isTablet && styles.historySheetCentered, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.historySheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 12 }}>
                  <Ionicons name="time" size={20} color="#2563eb" />
                  <Text style={styles.historySheetTitle} numberOfLines={1}>
                    Song History - {songTitle || song?.title || 'Song'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowHistoryList(false)}
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
                          {h.description ? (
                            <Text style={styles.webHistoryDescText}>{h.description}</Text>
                          ) : null}
                          <Text style={styles.webHistoryAuthorText}>Created by: {h.created_by || 'Coordinator'}</Text>
                        </View>
                        <View style={styles.webHistoryActionsRow}>
                          <TouchableOpacity
                            style={styles.webHistoryEditBtn}
                            onPress={() => handleEditHistoryEntry(h)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="create-outline" size={16} color="#16a34a" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.webHistoryDeleteBtn}
                            onPress={() => handleDeleteHistoryEntry(h.id)}
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
                onPress={() => setShowHistoryList(false)}
              >
                <Text style={styles.closeHistorySheetBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Add / Edit History Form Modal (Web Admin 1:1 Parity) ──────────── */}
        <Modal visible={showHistoryForm} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.pickerOverlay}>
            <View style={[styles.historyListSheet, isTablet && styles.historySheetCentered, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
                  onPress={() => { setEditingHistoryEntryId(null); setShowHistoryForm(false); }}
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
                  onChangeText={v => setOriginalHistoryValues(prev => ({ ...prev, new_value: v }))}
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
                  onPress={() => { setEditingHistoryEntryId(null); setShowHistoryForm(false); }}
                >
                  <Text style={styles.historyFormCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.historyFormSaveBtn}
                  onPress={handleSaveHistoryEntry}
                >
                  <Text style={styles.historyFormSaveBtnText}>Save & Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Responsive Web Admin Design Tokens & Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  webHeaderTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  webHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDeleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  headerCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  scrollBody: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentDesktop: {
    paddingHorizontal: 24,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },

  // ── Desktop Two-Column Grid (col-span-2 / col-span-3) ─────────────────────
  desktopTwoColContainer: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  desktopLeftCol: {
    flex: 2,
    gap: 16,
  },
  desktopRightCol: {
    flex: 3,
    gap: 16,
  },

  // ── Gray Slate Cards (Cards 1, 2, 3, 4) ──────────────────────────────────
  cardSlate: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  addHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  addHistoryBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  // ── Form Inputs ──────────────────────────────────────────────────────────
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputPrimary: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  inputLarge: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 12,
  },
  fieldRowResponsive: {
    flexDirection: 'row',
    gap: 12,
  },
  threeColRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  personnelGrid: {
    gap: 10,
    justifyContent: 'space-between',
  },

  // ── Categories Checkboxes Box ────────────────────────────────────────────
  categoriesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  addCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  addCategoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  newCategoryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
  },
  newCategoryTextInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12.5,
    color: '#0f172a',
  },
  addCategoryConfirmBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  addCategoryConfirmBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  addCategoryCancelBtn: {
    padding: 6,
  },
  categoriesCheckboxContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 4,
    maxHeight: 180,
    overflow: 'hidden',
  },
  categoryCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  categoryCheckboxText: {
    fontSize: 13,
    color: '#334155',
  },
  categoryCheckboxTextActive: {
    fontWeight: '700',
    color: '#7c3aed',
  },
  selectedCategoriesSummary: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },

  // ── Select Trigger Dropdown ──────────────────────────────────────────────
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pickerTriggerText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#0f172a',
  },

  // ── Song Artwork ─────────────────────────────────────────────────────────
  artworkSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  artworkPreviewWrap: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  artworkImg: {
    width: '100%',
    height: '100%',
  },
  artworkRemoveBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  selectArtworkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  selectArtworkBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  artworkHintText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 15,
  },

  // ── Audio File Player Box ────────────────────────────────────────────────
  browseMediaPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  browseMediaPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  audioFilePlayerBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  audioFileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioDotPurple: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b5cf6',
  },
  audioFileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  audioFileSizeText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 16,
    marginTop: 2,
    marginBottom: 8,
  },
  inlinePlayerBar: {
    marginTop: 4,
  },
  miniPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  miniPlayBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  miniPlayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  miniPlayBtnTextActive: {
    color: '#ffffff',
  },

  // ── AudioLab Multi-Stem Grid ─────────────────────────────────────────────
  addCustomPartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addCustomPartPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
  addCustomPartInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  addCustomPartInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12.5,
  },
  addPartBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addPartBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelPartBtn: {
    padding: 6,
  },
  stemsContainer: {
    gap: 10,
    justifyContent: 'space-between',
  },
  stemCard: {
    borderRadius: 10,
    borderWidth: 2,
    padding: 10,
  },
  stemCardEmpty: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  stemCardCustomEmpty: {
    backgroundColor: '#fffaf5',
    borderColor: '#fed7aa',
  },
  stemCardUploaded: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  stemCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stemCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  stemCardLabelUploaded: {
    color: '#15803d',
    fontWeight: '700',
  },
  stemAudioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stemPlayTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
  },
  stemPlayTouchActive: {
    backgroundColor: '#16a34a',
  },
  stemPlayTouchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  stemPlayTouchTextActive: {
    color: '#ffffff',
  },
  stemTrashBtn: {
    padding: 4,
  },
  selectFromMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectFromMediaBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  // ── White Cards with Distinct Header Bar (Cards 5, 6, 7) ─────────────────
  cardWhiteWithHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardWhiteHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dotMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardWhiteBody: {
    padding: 14,
  },
  helperBanner: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  helperBannerText: {
    fontSize: 11,
    color: '#64748b',
  },
  multilineEditor: {
    minHeight: 110,
    fontSize: 13.5,
    lineHeight: 20,
  },
  fontMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12.5,
  },

  // ── Coordinator Comments Voice Note ──────────────────────────────────────
  subFieldUppercase: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  voiceNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    padding: 10,
  },
  voiceNoteTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#6d28d9',
  },
  addVoiceNoteTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 10,
  },
  addVoiceNoteTouchText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  webFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerRowTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 13,
  },
  footerUpdateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  footerSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  footerHistoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 10,
    position: 'relative',
  },
  footerHistoryBtnTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 18,
    position: 'relative',
  },
  footerHistoryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  footerHistoryBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerHistoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  footerCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 10,
  },
  footerCancelBtnTablet: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  footerCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },

  // ── Picker & History Modals ──────────────────────────────────────────────
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  pickerModalContentCentered: {
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  pickerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#334155',
  },
  pickerOptionTextActive: {
    fontWeight: '700',
    color: '#7c3aed',
  },
  historyListSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  historySheetCentered: {
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 20,
  },
  historySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  historySheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyRowItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  historyRowType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    textTransform: 'uppercase',
  },
  historyRowDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  historyRowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  historyRowDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  historyDeleteTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  historyDeleteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },
  closeHistorySheetBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  closeHistorySheetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },

  // ── Header LIVE Broadcast Pill ───────────────────────────────────────────
  headerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  headerLivePillActive: {
    backgroundColor: '#ffe4e6',
    borderColor: '#f43f5e',
  },
  headerLivePillInactive: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
    marginRight: 5,
  },
  headerLiveDotActive: {
    backgroundColor: '#e11d48',
  },
  headerLiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  headerLiveTextActive: {
    color: '#e11d48',
  },

  // ── Card 1 Broadcast Status Toggle ───────────────────────────────────────
  broadcastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  broadcastSubtext: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  hqOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  liveToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  liveToggleBtnActive: {
    backgroundColor: '#ffe4e6',
    borderColor: '#e11d48',
  },
  liveToggleBtnInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
    marginRight: 6,
  },
  liveDotActive: {
    backgroundColor: '#e11d48',
  },
  liveToggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  liveToggleBtnTextActive: {
    color: '#e11d48',
  },

  // ── Web Admin Revision History Styles ────────────────────────────────────
  webHistoryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  webHistoryCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  webHistoryTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  webHistoryTypeBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  webHistoryTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e40af',
  },
  webHistoryDateText: {
    fontSize: 12,
    color: '#64748b',
  },
  webHistoryTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  webHistoryDescText: {
    fontSize: 12.5,
    color: '#475569',
    marginBottom: 4,
  },
  webHistoryAuthorText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  webHistoryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
  },
  webHistoryEditBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  webHistoryDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  historySheetSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  historyTypeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  singleTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  singleTypeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e40af',
  },
  historyTypeSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyTypeSelectChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  historyTypeSelectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  historyTypeSelectChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  webHistoryInfoCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  webHistoryInfoCalloutText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 17,
  },
  historyFormActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 8,
  },
  historyFormCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  historyFormCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  historyFormSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#16a34a',
  },
  historyFormSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
