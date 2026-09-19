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
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import MediaSelectionModal from './MediaSelectionModal';
import { stripHtml } from '../lib/stripHtml';
import { htmlToEditorText, editorTextToHtml } from '../lib/lyricsFormat';
import LyricsFormattingToolbar from './LyricsFormattingToolbar';
import { api } from '../services/api';
import { customAlert } from '../context/AlertContext';
import { styles } from './editSong/editSongStyles';
import FullscreenLyricsModal from './editSong/FullscreenLyricsModal';
import SongHistoryModal from './editSong/SongHistoryModal';
import SongGeneralCard from './editSong/SongGeneralCard';
import SongAudioStemsCard from './editSong/SongAudioStemsCard';
import SongPersonnelCard from './editSong/SongPersonnelCard';
import SongLyricsCard from './editSong/SongLyricsCard';
import SongCommentsCard from './editSong/SongCommentsCard';

export interface PraiseNightSong {
  id?: string;
  title?: string;
  key?: string;
  tempo?: string;
  leadSinger?: string;
  conductor?: string;
  writer?: string;
  category?: string | null;
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

export type EditSongTab = 'details' | 'lyrics' | 'audio' | 'personnel' | 'all';

export interface EditSongModalProps {
  visible: boolean;
  song: PraiseNightSong | null;
  programId?: string;
  programName?: string;
  programs?: Array<{ id: string; name: string }>;
  praiseNights?: Array<{ id: string; name: string }>;
  categories?: string[];
  isMaster?: boolean;
  initialTab?: EditSongTab;
  onClose: () => void;
  onUpdate: (updatedSong: PraiseNightSong) => void;
  onDelete?: (songId: string) => void;
}

const DEFAULT_CATEGORIES = [
  'Praise',
  'Thanksgiving',
  'Anthem',
  'Special',
  'Hymn',
  'Evangelism',
  'Choir Special',
];

const EDIT_SONG_TABS = [
  { id: 'details', label: 'Details', icon: 'document-text-outline' },
  { id: 'lyrics', label: 'Lyrics & Solfa', icon: 'musical-notes-outline' },
  { id: 'audio', label: 'AudioLab', icon: 'headset-outline' },
  { id: 'personnel', label: 'Personnel', icon: 'people-outline' },
  { id: 'all', label: 'All Cards', icon: 'grid-outline' },
] as const;

export default function EditSongModal({
  visible,
  song,
  programId = '',
  programName = '',
  programs,
  praiseNights,
  categories = DEFAULT_CATEGORIES,
  isMaster = false,
  initialTab = 'details',
  onClose,
  onUpdate,
  onDelete,
}: EditSongModalProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  // Resolution for available programs (backwards compatible with praiseNights)
  const passedPrograms = programs || praiseNights;
  const [loadedPrograms, setLoadedPrograms] = useState<{ id: string; name: string }[]>([]);
  const availablePrograms = passedPrograms || loadedPrograms;

  // ── Responsive Breakpoint Flags ──────────────────────────────────────────
  const isDesktop = windowWidth >= 1024;      // 2-column layout matching Web Admin
  const isTablet = windowWidth >= 768;       // Tablet sizing
  const isMedium = windowWidth >= 540;       // Medium phone/phablet
  const isCompact = windowWidth >= 400;      // Standard phone
  const isSmallPhone = windowWidth < 360;    // Small compact phone

  // ── Form State (Direct 1:1 Mirror of Web Admin EditSongModal.tsx) ──────────
  const [songTitle, setSongTitle] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>(categories);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setAvailableCategories(prev => Array.from(new Set([...categories, ...prev])));
    }
    if (visible) {
      api.categories.getAll().then(res => {
        const cats = Array.isArray(res?.data) ? res.data : [];
        if (cats.length > 0) {
          const names = cats.map((c: any) => c.name || c.title || String(c)).filter(Boolean);
          setAvailableCategories(prev => Array.from(new Set([...names, ...prev])));
        }
      }).catch(() => {});
    }
  }, [categories, visible]);

  useEffect(() => {
    if (!visible || passedPrograms) return;
    api.programs.getAll()
      .then(res => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        setLoadedPrograms(rows
          .map((program: any) => ({
            id: String(program.id),
            name: program.name || program.title || 'Program',
          }))
          .filter(program => program.id && program.name));
      })
      .catch(() => setLoadedPrograms([]));
  }, [visible, passedPrograms]);

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
  const [lyricsSelection, setLyricsSelection] = useState({ start: 0, end: 0 });
  const [songSolfas, setSongSolfas] = useState('');
  const [songNotation, setSongNotation] = useState('');
  const [coordinatorComment, setCoordinatorComment] = useState('');
  const [coordinatorAudioUrl, setCoordinatorAudioUrl] = useState('');

  // Modals & Pickers
  const [activeTab, setActiveTab] = useState<EditSongTab>(initialTab);
  const [showFullscreenLyrics, setShowFullscreenLyrics] = useState(false);
  const [fullscreenFontSize, setFullscreenFontSize] = useState(16);
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
  const soundRef = useRef<AudioPlayer | null>(null);
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

      setSongLyrics(htmlToEditorText(song.lyrics));
      setSongSolfas(htmlToEditorText(song.solfas || song.solfa));
      setSongNotation(htmlToEditorText(song.notation));

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
      if (song.id) {
        api.songs.getSongHistory(song.id)
          .then((res: any) => {
            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            setHistoryEntries(list);
            if (!commentText) {
              const latestComment = list.find((e: any) => {
                const t = (e.type || '').toLowerCase();
                return t === 'comments' || t === 'comment' || t.includes('comment');
              });
              if (latestComment) {
                const text = latestComment.new_value || latestComment.notes || latestComment.description || latestComment.title || '';
                if (text && typeof text === 'string') {
                  setCoordinatorComment(text);
                }
              }
            }
          })
          .catch(() => {});
      }
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
    if (visible) {
      setActiveTab(initialTab);
    } else {
      setShowHistoryList(false);
      setShowHistoryForm(false);
      setShowStatusPicker(false);
      setShowProgramPicker(false);
      setEditingHistoryEntryId(null);
    }
  }, [song, visible, programName, initialTab]);

  // Audio cleanup
  const stopAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        soundRef.current.pause();
        soundRef.current.remove();
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
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
      const player = createAudioPlayer({ uri: url });
      (player as any).addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          setPlayingAudioUrl(null);
        }
      });
      player.play();
      soundRef.current = player;
    } catch {
      customAlert('Playback Error', 'Unable to play this audio track.');
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

    api.categories.create({ name: trimmed, type: 'SONG' }).catch(() => {});
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
      customAlert('Duplicate Part', 'This audio part already exists.');
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
    const resolvedTitle = entry.title || entry.description || '';
    const resolvedNotes = entry.notes !== undefined
      ? entry.notes
      : (entry.description && entry.description !== entry.title ? entry.description : '');
    setHistoryFormTitle(resolvedTitle);
    setHistoryFormDesc(resolvedNotes);
    setHistoryFormType(entry.type || 'song-details');
    setOriginalHistoryValues({
      old_value: entry.old_value ?? entry.oldValue ?? '',
      new_value: entry.new_value ?? entry.newValue ?? entry.old_value ?? entry.oldValue ?? '',
    });
    setShowHistoryList(false);
    setShowHistoryForm(true);
  };

  const handleSaveHistoryEntry = async () => {
    if (!historyFormTitle.trim()) {
      Alert.alert('Required', 'Please enter a version title.');
      return;
    }

    const titleText = historyFormTitle.trim();
    const descText = historyFormDesc.trim();

    if (editingHistoryEntryId) {
      // Update existing entry on server and local state
      try {
        let updatedEntryData: any = null;
        const res = await api.songs.updateSongHistory(editingHistoryEntryId, {
          type: historyFormType,
          title: titleText,
          description: descText,
          old_value: originalHistoryValues.old_value,
          new_value: originalHistoryValues.new_value,
        });
        if (res?.data) updatedEntryData = res.data;
        const updatedList = historyEntries.map(entry => {
          if (entry.id === editingHistoryEntryId) {
            return {
              ...entry,
              ...(updatedEntryData || {}),
              title: updatedEntryData?.title || titleText,
              type: updatedEntryData?.type || historyFormType,
              description: updatedEntryData?.description || descText || titleText,
              notes: updatedEntryData?.notes !== undefined ? updatedEntryData.notes : descText,
              new_value: originalHistoryValues.new_value,
              updated_at: new Date().toISOString(),
            };
          }
          return entry;
        });
        setHistoryEntries(updatedList);
        if (song && Array.isArray(song.history)) {
          song.history = updatedList;
        }
        Alert.alert('History Updated', 'Revision entry has been updated.');
      } catch (err: any) {
        Alert.alert('Update Failed', err?.message || 'Could not update history entry.');
        return;
      }
    } else {
      // Create new version in DB and state
      try {
        if (!song?.id) {
          Alert.alert('Cannot Save History', 'Please save the song first before adding history revisions.');
          return;
        }

        const res = await api.songs.createSongHistory({
          songId: song.id,
          type: historyFormType,
          title: titleText,
          description: descText,
          old_value: originalHistoryValues.old_value,
          new_value: originalHistoryValues.new_value,
        });

        if (!res?.data?.id) {
          throw new Error('Server did not return a confirmed history ID.');
        }

        const newEntry = {
          id: res.data.id,
          songId: song.id,
          type: historyFormType,
          title: titleText,
          description: descText || titleText,
          notes: descText,
          old_value: originalHistoryValues.old_value,
          new_value: originalHistoryValues.new_value,
          created_at: new Date().toISOString(),
          date: new Date().toLocaleString(),
          created_by: 'Coordinator',
          ...res.data,
        };
        const newList = [newEntry, ...historyEntries];
        setHistoryEntries(newList);
        if (song && Array.isArray(song.history)) {
          song.history = newList;
        }
        Alert.alert('History Saved', `New audit version for "${formatHistoryType(historyFormType)}" saved to database.`);
      } catch (err: any) {
        Alert.alert('Save Failed', err?.message || 'Could not record history version to database.');
        return;
      }
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
          onPress: async () => {
            try {
              await api.songs.deleteSongHistory(id);
              setHistoryEntries(prev => {
                const filtered = prev.filter(h => h.id !== id);
                if (song && Array.isArray(song.history)) {
                  song.history = filtered;
                }
                return filtered;
              });
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete history entry.');
            }
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

    // Explicitly use null when no category is selected so the backend clears the field.
    // Using `|| undefined` would omit the key from the payload, causing the DB to keep the old value.
    const primaryCategory = songCategories.length > 0 ? songCategories[0] : null;
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

    const normalizedImageUrl = songImageUrl.trim()
      ? (songImageUrl.trim().startsWith('http://') && !songImageUrl.includes('localhost') && !songImageUrl.includes('10.0.2.2')
          ? 'https://' + songImageUrl.trim().slice(7)
          : songImageUrl.trim())
      : '';

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
      category: primaryCategory,          // null = explicitly clear, string = set category
      categories: songCategories,          // [] = no categories
      praiseNightId: programId || undefined,
      praiseNightName: songProgram || programName,
      programId: programId || undefined,
      programName: songProgram || programName,
      lyrics: editorTextToHtml(songLyrics),
      leadSinger: songLeadSinger.trim(),
      writer: songWriter.trim(),
      conductor: songConductor.trim(),
      key: songKey.trim(),
      tempo: songTempo.trim(),
      leadKeyboardist: songLeadKeyboardist.trim(),
      leadGuitarist: songLeadGuitarist.trim(),
      drummer: songDrummer.trim(),
      solfas: editorTextToHtml(songSolfas),
      solfa: editorTextToHtml(songSolfas),
      notation: editorTextToHtml(songNotation),
      rehearsalCount: rehearsalCount,
      audioFile: songAudioFile.trim(),
      audioUrl: songAudioFile.trim(),
      audioUrls: audioUrls,
      customParts: customParts,
      imageUrl: normalizedImageUrl,
      coordinatorComment: coordinatorComment.trim(),
      coordinatorAudioUrl: coordinatorAudioUrl.trim(),
      comments: commentsList,
      history: historyEntries,
    };

    stopAudio();
    onUpdate(payload);
    handleClose();
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
            handleClose();
          },
        },
      ]
    );
  };

  const handleClose = () => {
    stopAudio();
    setShowHistoryList(false);
    setShowHistoryForm(false);
    setShowStatusPicker(false);
    setShowProgramPicker(false);
    setEditingHistoryEntryId(null);
    onClose();
  };

  const isEditing = Boolean(song && song.id);

  // ───────────────────────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────
  // Modular Card Renderers
  // ───────────────────────────────────────────────────────────────────────────
  const renderCardGeneral = () => (
    <SongGeneralCard
      isMedium={isMedium}
      isSmallPhone={isSmallPhone}
      isMaster={isMaster}
      songTitle={songTitle}
      setSongTitle={setSongTitle}
      songCategories={songCategories}
      setSongCategories={setSongCategories}
      availableCategories={availableCategories}
      showNewCategoryInput={showNewCategoryInput}
      setShowNewCategoryInput={setShowNewCategoryInput}
      newCategoryName={newCategoryName}
      setNewCategoryName={setNewCategoryName}
      handleAddNewCategory={handleAddNewCategory}
      toggleCategory={toggleCategory}
      songStatus={songStatus}
      setShowStatusPicker={setShowStatusPicker}
      isSongActive={isSongActive}
      setIsSongActive={setIsSongActive}
      isHQOnly={isHQOnly}
      setIsHQOnly={setIsHQOnly}
      songImageUrl={songImageUrl}
      setSongImageUrl={setSongImageUrl}
      handleOpenMediaSelector={handleOpenMediaSelector}
      songKey={songKey}
      setSongKey={setSongKey}
      songTempo={songTempo}
      setSongTempo={setSongTempo}
      rehearsalCount={rehearsalCount}
      setRehearsalCount={setRehearsalCount}
      songAudioFile={songAudioFile}
      setSongAudioFile={setSongAudioFile}
      playingAudioUrl={playingAudioUrl}
      audioLoading={audioLoading}
      handleTogglePlay={handleTogglePlay}
      handleAddHistory={handleAddHistory}
    />
  );

  const renderCardStems = () => (
    <SongAudioStemsCard
      isSmallPhone={isSmallPhone}
      isTablet={isTablet}
      showAddPart={showAddPart}
      setShowAddPart={setShowAddPart}
      newPartName={newPartName}
      setNewPartName={setNewPartName}
      handleAddCustomPart={handleAddCustomPart}
      handleRemoveCustomPart={handleRemoveCustomPart}
      handleRemoveAudioPart={handleRemoveAudioPart}
      audioUrls={audioUrls}
      customParts={customParts}
      playingAudioUrl={playingAudioUrl}
      handleTogglePlay={handleTogglePlay}
      handleOpenMediaSelector={handleOpenMediaSelector}
    />
  );

  const renderCardPersonnel = () => (
    <SongPersonnelCard
      isMedium={isMedium}
      songLeadSinger={songLeadSinger}
      setSongLeadSinger={setSongLeadSinger}
      songWriter={songWriter}
      setSongWriter={setSongWriter}
      songConductor={songConductor}
      setSongConductor={setSongConductor}
      songLeadKeyboardist={songLeadKeyboardist}
      setSongLeadKeyboardist={setSongLeadKeyboardist}
      songLeadGuitarist={songLeadGuitarist}
      setSongLeadGuitarist={setSongLeadGuitarist}
      songDrummer={songDrummer}
      setSongDrummer={setSongDrummer}
      handleAddHistory={handleAddHistory}
    />
  );

  const renderCardLyrics = () => (
    <SongLyricsCard
      activeTab={activeTab}
      songLyrics={songLyrics}
      setSongLyrics={setSongLyrics}
      lyricsSelection={lyricsSelection}
      setLyricsSelection={setLyricsSelection}
      setShowFullscreenLyrics={setShowFullscreenLyrics}
      handleAddHistory={handleAddHistory}
      songSolfas={songSolfas}
      setSongSolfas={setSongSolfas}
      songNotation={songNotation}
      setSongNotation={setSongNotation}
    />
  );

  const renderCardComments = () => (
    <SongCommentsCard
      coordinatorComment={coordinatorComment}
      setCoordinatorComment={setCoordinatorComment}
      coordinatorAudioUrl={coordinatorAudioUrl}
      setCoordinatorAudioUrl={setCoordinatorAudioUrl}
      playingAudioUrl={playingAudioUrl}
      handleTogglePlay={handleTogglePlay}
      handleOpenMediaSelector={handleOpenMediaSelector}
      handleAddHistory={handleAddHistory}
    />
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
            {/* Quick 1-Tap LIVE Broadcast Pill Toggle — Only for Program Songs */}
            {!isMaster && (
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
            )}

            {/* Quick 1-Tap Save in Header */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.headerQuickSaveBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-sharp" size={15} color="#ffffff" style={{ marginRight: 3 }} />
              <Text style={styles.headerQuickSaveBtnText}>Save</Text>
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

        {/* ── 1b. Segmented Tabs Bar (Instant section switching) ─────────────── */}
        <View style={styles.tabBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarScrollContent}
          >
            {EDIT_SONG_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.id as EditSongTab)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={14}
                    color={isActive ? '#7c3aed' : '#64748b'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                    {tab.label}
                  </Text>
                  {tab.id === 'lyrics' && (songLyrics.trim().length > 0 || songSolfas.trim().length > 0) && (
                    <View style={[styles.tabBadgeDot, isActive && styles.tabBadgeDotActive]} />
                  )}
                  {tab.id === 'audio' && Object.values(audioUrls || {}).filter(Boolean).length > 0 && (
                    <View style={styles.tabCountBadge}>
                      <Text style={styles.tabCountBadgeText}>
                        {Object.values(audioUrls || {}).filter(Boolean).length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
            {activeTab === 'details' && (
              <View style={{ gap: 16 }}>
                {renderCardGeneral()}
              </View>
            )}

            {activeTab === 'lyrics' && (
              <View style={{ gap: 16 }}>
                {renderCardLyrics()}
              </View>
            )}

            {activeTab === 'audio' && (
              <View style={{ gap: 16 }}>
                {renderCardStems()}
              </View>
            )}

            {activeTab === 'personnel' && (
              <View style={{ gap: 16 }}>
                {renderCardPersonnel()}
                {renderCardComments()}
              </View>
            )}

            {activeTab === 'all' && (
              isDesktop ? (
                <View style={styles.desktopTwoColContainer}>
                  <View style={styles.desktopLeftCol}>
                    {renderCardGeneral()}
                    {renderCardStems()}
                    {renderCardPersonnel()}
                  </View>
                  <View style={styles.desktopRightCol}>
                    {renderCardLyrics()}
                    {renderCardComments()}
                  </View>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {renderCardGeneral()}
                  {renderCardStems()}
                  {renderCardPersonnel()}
                  {renderCardLyrics()}
                  {renderCardComments()}
                </View>
              )
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

        {/* ── Fullscreen Lyrics Editor Modal ─────────────────────────────────── */}
        <FullscreenLyricsModal
          visible={showFullscreenLyrics}
          songTitle={songTitle || song?.title || 'Song Lyrics'}
          songLyrics={songLyrics}
          onLyricsChange={setSongLyrics}
          lyricsSelection={lyricsSelection}
          onSelectionChange={setLyricsSelection}
          onClose={() => setShowFullscreenLyrics(false)}
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
        />

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

        {/* ── Version History Modals ────────────────────────────────────────── */}
        <SongHistoryModal
          showHistoryList={showHistoryList}
          onCloseHistoryList={() => setShowHistoryList(false)}
          historyEntries={historyEntries}
          onEditEntry={handleEditHistoryEntry}
          onDeleteEntry={handleDeleteHistoryEntry}
          formatHistoryType={formatHistoryType}
          isTablet={isTablet}

          showHistoryForm={showHistoryForm}
          editingHistoryEntryId={editingHistoryEntryId}
          historyFormType={historyFormType}
          historyFormTitle={historyFormTitle}
          setHistoryFormTitle={setHistoryFormTitle}
          historyFormDesc={historyFormDesc}
          setHistoryFormDesc={setHistoryFormDesc}
          originalHistoryValues={originalHistoryValues}
          setOriginalHistoryValues={setOriginalHistoryValues}
          onSaveHistoryEntry={handleSaveHistoryEntry}
          onCloseHistoryForm={() => { setEditingHistoryEntryId(null); setShowHistoryForm(false); }}
          insetsBottom={insets.bottom}
        />

      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles are modularized in ./editSong/editSongStyles.ts
// ─────────────────────────────────────────────────────────────────────────────
