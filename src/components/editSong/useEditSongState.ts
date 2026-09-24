import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { api } from '../../services/api';
import { htmlToEditorText, editorTextToHtml } from '../../lib/lyricsFormat';
import { customAlert } from '../../context/AlertContext';
import { PraiseNightSong, EditSongTab, EditSongModalProps } from './types';
import { useSongHistoryManager } from './useSongHistoryManager';
import { useSongAudioPlayer } from './useSongAudioPlayer';

export function useEditSongState({
  visible,
  song,
  programId = '',
  programName = '',
  programs,
  praiseNights,
  categories = [],
  isMaster = false,
  initialTab = 'details',
  onClose,
  onUpdate,
  onDelete,
}: EditSongModalProps) {
  const passedPrograms = programs || praiseNights;
  const [loadedPrograms, setLoadedPrograms] = useState<{ id: string; name: string }[]>([]);
  const availablePrograms = passedPrograms || loadedPrograms;

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
  const [songBassGuitarist, setSongBassGuitarist] = useState('');
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
  const [showProgramPicker, setShowProgramPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const historyManager = useSongHistoryManager({
    song,
    songTitle,
    songCategories,
    songProgram,
    songStatus,
    songKey,
    songTempo,
    songLeadSinger,
    songWriter,
    songConductor,
    songLeadKeyboardist,
    songLeadGuitarist,
    songBassGuitarist,
    songDrummer,
    songLyrics,
    songSolfas,
    songNotation,
    songAudioFile,
    coordinatorComment,
  });

  const audioPlayer = useSongAudioPlayer({
    setSongImageUrl,
    setSongAudioFile,
    setCoordinatorAudioUrl,
    setAudioUrls,
  });

  const lastLoadedSongIdRef = useRef<string | null | undefined>(undefined);
  const lastVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    const songId = song?.id ?? null;
    const songChanged = songId !== lastLoadedSongIdRef.current;
    const modalJustOpened = visible && !lastVisibleRef.current;

    lastVisibleRef.current = visible;

    // Only reset form when a genuinely different song is loaded, or the modal
    // just opened. This prevents parent re-renders from wiping the admin's
    // in-progress edits (e.g. after applying bold formatting).
    if (!songChanged && !modalJustOpened) {
      if (!visible) {
        historyManager.setShowHistoryList(false);
        historyManager.setShowHistoryForm(false);
        setShowStatusPicker(false);
        setShowProgramPicker(false);
        historyManager.setEditingHistoryEntryId(null);
      }
      return;
    }

    lastLoadedSongIdRef.current = songId;

    if (song) {
      setSongTitle(song.title || '');
      const cats = Array.isArray(song.categories)
        ? song.categories
        : song.category
        ? [song.category]
        : [];
      setSongCategories(cats);
      setAvailableCategories(prev => Array.from(new Set([...categories, ...prev, ...cats])));
      const songIsLive = Boolean(song.isActive || song.status === 'live' || (song as any).isLive || (song as any).live);
      const underlyingHeard = song.isHeard || song.heard || song.status === 'heard' || (song as any)?.audioUrls?._isHeard === true || (song as any)?.audioUrls?._preLiveStatus === 'heard';
      setSongStatus(underlyingHeard ? 'heard' : 'unheard');
      setIsSongActive(songIsLive);
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
      setSongBassGuitarist(song.bassGuitarist || (song as any).bass_guitarist || (song as any).bass || '');
      setSongDrummer(song.drummer || '');

      setSongLyrics(htmlToEditorText(song.lyrics));
      setSongSolfas(htmlToEditorText(song.solfas || song.solfa));
      setSongNotation(htmlToEditorText(song.notation));

      let commentText = song.coordinatorComment || '';
      let commentAudio = song.coordinatorAudioUrl || '';
      if (!commentText && Array.isArray(song.comments) && song.comments.length > 0) {
        const last = song.comments[song.comments.length - 1];
        commentText = last.text || last.content || '';
        commentAudio = last.audioUrl || '';
      }
      setCoordinatorComment(commentText);
      setCoordinatorAudioUrl(commentAudio);

      historyManager.setHistoryEntries(Array.isArray(song.history) ? song.history : []);
      const fetchedForSongId = song.id;
      if (song.id) {
        api.songs.getSongHistory(song.id)
          .then((res: any) => {
            // Guard: ignore stale responses if the user already opened a different song
            if (!fetchedForSongId) return;
            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            const seen = new Set();
            const deduplicated = list.filter((item: any) => {
              if (!item?.id) return true;
              if (seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            });
            historyManager.setHistoryEntries(deduplicated);
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
      setSongBassGuitarist('');
      setSongDrummer('');
      setSongLyrics('');
      setSongSolfas('');
      setSongNotation('');
      setCoordinatorComment('');
      setCoordinatorAudioUrl('');
      historyManager.setHistoryEntries([]);
    }
    if (visible) {
      setActiveTab(initialTab);
    } else {
      historyManager.setShowHistoryList(false);
      historyManager.setShowHistoryForm(false);
      setShowStatusPicker(false);
      setShowProgramPicker(false);
      historyManager.setEditingHistoryEntryId(null);
    }
  }, [song, visible, programName, initialTab]);

  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const existing = availableCategories.find(c => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!songCategories.includes(existing)) setSongCategories(prev => [...prev, existing]);
    } else {
      setAvailableCategories(prev => [...prev, trimmed]);
      setSongCategories(prev => [...prev, trimmed]);
    }
    setNewCategoryName('');
    setShowNewCategoryInput(false);
    api.categories.create({ name: trimmed, type: 'SONG' }).catch(() => {});
  };

  const toggleCategory = (catName: string) => {
    setSongCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

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

  const handleSubmit = () => {
    if (!songTitle.trim()) {
      Alert.alert('Required Field', 'Please enter a song title.');
      return;
    }

    const primaryCategory = songCategories.length > 0 ? songCategories[0] : null;
    const cleanComment = coordinatorComment.trim()
      // Strip any previously prepended author labels from old saves
      .replace(/^(Coordinator|Music Team|Admin|Pastor|Church Coordinator):\s*/i, '');

    const commentsList = (cleanComment || coordinatorAudioUrl.trim())
      ? [
          {
            id: `comment-${Date.now()}`,
            text: cleanComment,
            audioUrl: coordinatorAudioUrl.trim(),
            date: new Date().toISOString(),
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
      status: isSongActive ? 'live' : songStatus,
      isHeard: songStatus === 'heard',
      heard: songStatus === 'heard',
      isActive: isSongActive,
      isLive: isSongActive,
      isHQOnly: isHQOnly,
      is_hq_only: isHQOnly,
      isHqOnly: isHQOnly,
      scope: isHQOnly ? 'hq' : 'global',
      category: primaryCategory,
      categories: songCategories,
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
      bassGuitarist: songBassGuitarist.trim(),
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
      coordinatorComment: cleanComment,
      coordinatorAudioUrl: coordinatorAudioUrl.trim(),
      comments: commentsList,
      history: historyManager.historyEntries,
    };

    audioPlayer.stopAudio();
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
            audioPlayer.stopAudio();
            if (onDelete && song.id) onDelete(song.id);
            handleClose();
          },
        },
      ]
    );
  };

  const handleImportToMaster = async () => {
    if (!song?.id) return;
    try {
      const res = await api.songs.importToMaster(song.id);
      if (res?.success) {
        customAlert('Success', `"${songTitle || song.title}" was successfully imported into All Ministered.`);
      } else {
        throw new Error((res as any)?.error || 'Failed to import song.');
      }
    } catch (err: any) {
      customAlert('Import Error', err?.message || 'Could not import song into All Ministered.');
    }
  };

  const handleClose = () => {
    audioPlayer.stopAudio();
    historyManager.setShowHistoryList(false);
    historyManager.setShowHistoryForm(false);
    setShowStatusPicker(false);
    setShowProgramPicker(false);
    historyManager.setEditingHistoryEntryId(null);
    onClose();
  };

  return {
    songTitle, setSongTitle,
    songCategories, setSongCategories,
    availableCategories, setAvailableCategories,
    showNewCategoryInput, setShowNewCategoryInput,
    newCategoryName, setNewCategoryName,
    handleAddNewCategory, toggleCategory,
    songStatus, setSongStatus,
    showStatusPicker, setShowStatusPicker,
    isSongActive, setIsSongActive,
    isHQOnly, setIsHQOnly,
    songImageUrl, setSongImageUrl,
    songKey, setSongKey,
    songTempo, setSongTempo,
    rehearsalCount, setRehearsalCount,
    songAudioFile, setSongAudioFile,
    showAddPart, setShowAddPart,
    newPartName, setNewPartName,
    handleAddCustomPart, handleRemoveCustomPart, handleRemoveAudioPart,
    audioUrls, customParts,
    songLeadSinger, setSongLeadSinger,
    songWriter, setSongWriter,
    songConductor, setSongConductor,
    songLeadKeyboardist, setSongLeadKeyboardist,
    songLeadGuitarist, setSongLeadGuitarist,
    songBassGuitarist, setSongBassGuitarist,
    songDrummer, setSongDrummer,
    songLyrics, setSongLyrics,
    lyricsSelection, setLyricsSelection,
    showFullscreenLyrics, setShowFullscreenLyrics,
    songSolfas, setSongSolfas,
    songNotation, setSongNotation,
    coordinatorComment, setCoordinatorComment,
    coordinatorAudioUrl, setCoordinatorAudioUrl,
    activeTab, setActiveTab,
    ...historyManager,
    ...audioPlayer,
    handleSubmit, handleDelete, handleClose, handleImportToMaster,
  };
}
