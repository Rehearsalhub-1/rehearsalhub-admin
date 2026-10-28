import { useState, useEffect, useRef } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { MasterSong } from '../MasterSongDetailModal';
import { api } from '../../services/api';
import { customAlert } from '../../context/AlertContext';
import { htmlToEditorText, editorTextToHtml } from '../../lib/lyricsFormat';
import { DEFAULT_COLLECTIONS } from './types';
import { useSongHistoryManager } from '../editSong/useSongHistoryManager';

interface UseMasterEditSongStateProps {
  visible: boolean;
  song?: MasterSong | null;
  mode?: 'edit' | 'create';
  onClose: () => void;
  onSaved: (song: MasterSong, isNew: boolean) => void;
  onDelete?: (songId: string) => void;
}

function resolveSongHistoryText(s: any): string {
  if (!s) return '';
  if (typeof s.history === 'string' && s.history.trim()) {
    return htmlToEditorText(s.history);
  }
  if (typeof s.coordinatorComment === 'string' && s.coordinatorComment.trim()) {
    return htmlToEditorText(s.coordinatorComment);
  }
  if (typeof s.coordinatorNotes === 'string' && s.coordinatorNotes.trim()) {
    return htmlToEditorText(s.coordinatorNotes);
  }
  if (typeof s.notes === 'string' && s.notes.trim()) {
    return htmlToEditorText(s.notes);
  }
  if (typeof s.background === 'string' && s.background.trim()) {
    return htmlToEditorText(s.background);
  }
  if (typeof s.rehearsalNotes === 'string' && s.rehearsalNotes.trim()) {
    return htmlToEditorText(s.rehearsalNotes);
  }
  if (Array.isArray(s.comments) && s.comments.length > 0) {
    const last = s.comments[s.comments.length - 1];
    const text = typeof last === 'string' ? last : (last?.text || last?.content || last?.comment || last?.description || '');
    if (typeof text === 'string' && text.trim()) {
      return htmlToEditorText(text);
    }
  }
  return '';
}

export function useMasterEditSongState({
  visible,
  song,
  mode = 'edit',
  onClose,
  onSaved,
  onDelete,
}: UseMasterEditSongStateProps) {
  const isCreate = mode === 'create' || !song;
  const [activeTab, setActiveTab] = useState<'details' | 'audio' | 'lyrics' | 'access'>('details');

  // Form State
  const [title, setTitle] = useState(''), [writer, setWriter] = useState(''), [leadSinger, setLeadSinger] = useState('');
  const [key, setKey] = useState(''), [tempo, setTempo] = useState(''), [conductor, setConductor] = useState('');
  const [leadKeyboardist, setLeadKeyboardist] = useState(''), [bassGuitarist, setBassGuitarist] = useState(''), [drummer, setDrummer] = useState('');
  const [category, setCategory] = useState(''), [imageUrl, setImageUrl] = useState(''), [isHQOnly, setIsHQOnly] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  function toggleCategory(cat: string) {
    const trimmed = (cat || '').trim();
    if (!trimmed) return;
    setCategories(prev => {
      const exists = prev.includes(trimmed);
      const next = exists ? prev.filter(c => c !== trimmed) : [...prev, trimmed];
      setCategory(next[0] || '');
      return next;
    });
  }
  const [collectionsList, setCollectionsList] = useState<string[]>(DEFAULT_COLLECTIONS);
  const [collectionToIdMap, setCollectionToIdMap] = useState<Record<string, string>>({});
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Audio Lab
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({
    full: '', soprano: '', alto: '', tenor: '', bass: '',
  });
  const [customParts, setCustomParts] = useState<string[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [showAddPart, setShowAddPart] = useState(false);

  // Lyrics, Notes & Solfa
  const [lyrics, setLyrics] = useState('');
  const [lyricsSelection, setLyricsSelection] = useState({ start: 0, end: 0 });
  const [solfa, setSolfa] = useState('');
  const [history, setHistory] = useState('');

  // Song Revision History Manager
  const historyManager = useSongHistoryManager({
    song: song as any,
    songTitle: title,
    songCategories: categories,
    songProgram: category || 'All Ministered',
    songStatus: 'active',
    songKey: key,
    songTempo: tempo,
    songLeadSinger: leadSinger,
    songWriter: writer,
    songConductor: conductor,
    songLeadKeyboardist: leadKeyboardist,
    songLeadGuitarist: '',
    songBassGuitarist: bassGuitarist,
    songDrummer: drummer,
    songLyrics: lyrics,
    songSolfas: solfa,
    songNotation: '',
    songAudioFile: audioUrls.full || '',
    coordinatorComment: history,
  });

  // Media Selector
  const [mediaTarget, setMediaTarget] = useState<string | null>(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);

  // Audio Playback for Stem Testing
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (player) {
        player.pause();
        player.remove();
      }
    };
  }, [player]);

  useEffect(() => {
    if (!visible && player) {
      player.pause();
      player.remove();
      setPlayer(null);
      setPlayingKey(null);
    }
  }, [visible, player]);

  const lastLoadedSongIdRef = useRef<string | null | undefined>(undefined);
  const lastVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    const songId = song?.id ?? null;
    const songChanged = songId !== lastLoadedSongIdRef.current;
    const modalJustOpened = visible && !lastVisibleRef.current;

    lastVisibleRef.current = visible;

    // Only reset form fields when a genuinely different song is loaded or the
    // modal just opened — prevents parent re-renders from wiping in-progress edits.
    if (visible && !songChanged && !modalJustOpened) return;

    if (visible) {
      if (songChanged || modalJustOpened) {
        lastLoadedSongIdRef.current = songId;
        setActiveTab('details');
        setShowNewCatInput(false);
        setNewCatName('');
        setShowAddPart(false);
        setNewPartName('');
      }

      // Fetch the 46 canonical Master Programs / Collections
      api.programs
        .getMasterPrograms()
        .then(res => {
          const progs = (Array.isArray(res?.data) ? res.data : [])
            .map((p: any) => ({
              id: p.id,
              name: (p.name || p.title || '').trim(),
            }))
            .filter((p: any) => Boolean(p.name));
          if (progs.length > 0) {
            const map: Record<string, string> = {};
            const names: string[] = [];
            progs.forEach((p: any) => {
              map[p.name] = p.id;
              names.push(p.name);
            });
            setCollectionToIdMap(map);
            setCollectionsList(prev => Array.from(new Set([...names, ...DEFAULT_COLLECTIONS, ...prev])));
          }
        })
        .catch(() => {});

      if (song && !isCreate) {
        setTitle(song.title || '');
        setWriter(song.writer || song.publishedByName || '');
        setLeadSinger(song.leadSinger || '');
        setKey(song.key || '');
        setTempo(song.tempo || '');
        setConductor(song.conductor || '');
        setLeadKeyboardist(song.leadKeyboardist || '');
        setBassGuitarist(song.bassGuitarist || '');
        setDrummer(song.drummer || '');
        const songCats: string[] = Array.isArray(song.categories) && song.categories.length > 0
          ? song.categories
          : ([(song as any).program, (song as any).programName, song.category].filter(Boolean) as string[]);
        const dedupedCats = Array.from(new Set(songCats.map(c => c.trim()).filter(Boolean)));
        setCategories(dedupedCats);
        setCategory(dedupedCats[0] || '');
        setImageUrl(song.imageUrl || '');
        const isSongHqOnly = Boolean(
          song.isHQOnly ||
          song.isHqOnly ||
          song.isHidden ||
          (song as any).scope === 'hq' ||
          song.status === 'hq_only'
        );
        setIsHQOnly(isSongHqOnly);
        setIsHidden(isSongHqOnly);
        setLyrics(htmlToEditorText(song.lyrics || ''));
        setSolfa(htmlToEditorText(song.solfas || song.solfa || song.conductorGuide || ''));
        
        const initialHistory = resolveSongHistoryText(song);
        setHistory(initialHistory);

        // Load song revision history
        const initialCheckpoints = Array.isArray(song.history)
          ? song.history
          : (Array.isArray((song as any).historyEntries) ? (song as any).historyEntries : []);
        historyManager.setHistoryEntries(initialCheckpoints);

        const fetchedForSongId = song.id;
        if (song.id) {
          // 1. Fetch full song record from server to hydrate fields not in the summary list
          api.songs.getById(song.id)
            .then((res: any) => {
              if (lastLoadedSongIdRef.current !== fetchedForSongId) return;
              const fullSong = res?.data || res;
              if (fullSong && typeof fullSong === 'object') {
                const fullHistory = resolveSongHistoryText(fullSong);
                if (fullHistory) {
                  setHistory(prev => (prev.trim() ? prev : fullHistory));
                }
                if (fullSong.lyrics && typeof fullSong.lyrics === 'string') {
                  setLyrics(prev => (prev.trim() ? prev : htmlToEditorText(fullSong.lyrics)));
                }
                const solfaSource = fullSong.solfas || fullSong.solfa || fullSong.conductorGuide;
                if (solfaSource && typeof solfaSource === 'string') {
                  setSolfa(prev => (prev.trim() ? prev : htmlToEditorText(solfaSource)));
                }
                if (Array.isArray(fullSong.history) && fullSong.history.length > 0) {
                  historyManager.setHistoryEntries(prev => (prev.length > 0 ? prev : fullSong.history));
                }
                if (Array.isArray(fullSong.historyEntries) && fullSong.historyEntries.length > 0) {
                  historyManager.setHistoryEntries(prev => (prev.length > 0 ? prev : fullSong.historyEntries));
                }
              }
            })
            .catch(() => {});

          // 2. Fetch revision history audit checkpoints from API
          api.songs.getSongHistory(song.id)
            .then((res: any) => {
              if (lastLoadedSongIdRef.current !== fetchedForSongId) return;
              const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
              const seen = new Set();
              const deduplicated = list.filter((item: any) => {
                if (!item?.id) return true;
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
              });
              historyManager.setHistoryEntries(deduplicated);

              // If history notes were still empty, check if an entry contains notes/commentary
              const latestComment = deduplicated.find((e: any) => {
                const t = (e.type || '').toLowerCase();
                return t === 'comments' || t === 'comment' || t.includes('comment') || t === 'history';
              });
              if (latestComment) {
                const text = latestComment.new_value || latestComment.notes || latestComment.description || latestComment.title || '';
                if (text && typeof text === 'string' && text.trim()) {
                  setHistory(prev => (prev.trim() ? prev : htmlToEditorText(text)));
                }
              }
            })
            .catch(() => {});
        }

        if (dedupedCats.length > 0) {
          setCollectionsList(prev => Array.from(new Set([...dedupedCats, ...prev])));
        }

        const urls: Record<string, string> = {
          full: song.audioUrls?.full || song.audioFile || song.audioUrl || '',
          soprano: song.audioUrls?.soprano || '',
          alto: song.audioUrls?.alto || '',
          tenor: song.audioUrls?.tenor || '',
          bass: song.audioUrls?.bass || '',
        };

        const parts: string[] = [];
        const rawCustom = song.customParts || (song.audioUrls as any)?._customParts;
        if (rawCustom) {
          if (Array.isArray(rawCustom)) {
            rawCustom.forEach(p => {
              if (typeof p === 'string' && !parts.includes(p)) parts.push(p);
              if (song.audioUrls?.[p]) urls[p] = song.audioUrls[p];
            });
          } else if (typeof rawCustom === 'object') {
            Object.entries(rawCustom).forEach(([k, v]) => {
              if (!parts.includes(k)) parts.push(k);
              if (typeof v === 'string') urls[k] = v;
            });
          }
        }
        const standardStems = new Set(['full', 'soprano', 'alto', 'tenor', 'bass', 'lead', 'instrumental', 'main', 'master']);
        if (song.audioUrls && typeof song.audioUrls === 'object') {
          Object.entries(song.audioUrls).forEach(([k, v]) => {
            if (!k.startsWith('_') && !standardStems.has(k.toLowerCase()) && !parts.includes(k)) {
              parts.push(k);
              if (typeof v === 'string') urls[k] = v;
            }
          });
        }
        setAudioUrls(urls);
        setCustomParts(parts);
      } else {
        setTitle('');
        setWriter('Loveworld Singers');
        setLeadSinger('');
        setKey('C');
        setTempo('100');
        setConductor('');
        setLeadKeyboardist('');
        setBassGuitarist('');
        setDrummer('');
        setCategory('');
        setCategories([]);
        setImageUrl('');
        setIsHQOnly(false);
        setLyrics('');
        setSolfa('');
        setHistory('');
        setAudioUrls({ full: '', soprano: '', alto: '', tenor: '', bass: '' });
        setCustomParts([]);
        historyManager.setHistoryEntries([]);
        historyManager.setShowHistoryList(false);
        historyManager.setShowHistoryForm(false);
        historyManager.setEditingHistoryEntryId(null);
      }
    } else {
      if (player) {
        player.pause();
        player.remove();
        setPlayer(null);
      }
      setPlayingKey(null);
      historyManager.setShowHistoryList(false);
      historyManager.setShowHistoryForm(false);
      historyManager.setEditingHistoryEntryId(null);
    }
  }, [visible, song, isCreate]);

  // Handle inline collection creation
  async function handleAddNewCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (!collectionsList.includes(trimmed)) {
      setCollectionsList(prev => [trimmed, ...prev]);
    }
    setCategories(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setCategory(trimmed);
    setNewCatName('');
    setShowNewCatInput(false);

    try {
      const res = await api.programs.create({
        name: trimmed,
        category: 'ministered',
        status: 'completed',
        isArchived: true,
      });
      if (res?.data?.id) {
        setCollectionToIdMap(prev => ({ ...prev, [trimmed]: res.data.id }));
      }
    } catch (e) {
      console.warn('Failed to persist master collection:', e);
    }
  }

  // Handle add custom stem
  function handleAddStem() {
    const trimmed = newPartName.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (['full', 'soprano', 'alto', 'tenor', 'bass', ...customParts.map(p => p.toLowerCase())].includes(lower)) {
      customAlert('Exists', 'This stem part name is already in use.');
      return;
    }
    setCustomParts(prev => [...prev, trimmed]);
    setAudioUrls(prev => ({ ...prev, [trimmed]: '' }));
    setNewPartName('');
    setShowAddPart(false);
  }

  function handleRemoveCustomStem(part: string) {
    setCustomParts(prev => prev.filter(p => p !== part));
    setAudioUrls(prev => {
      const next = { ...prev };
      delete next[part];
      return next;
    });
  }

  // Audio Playback
  async function handleToggleStemAudio(stemKey: string, url: string) {
    if (!url) return;
    try {
      if (playingKey === stemKey && player) {
        player.pause();
        player.remove();
        setPlayer(null);
        setPlayingKey(null);
        return;
      }

      if (player) {
        player.pause();
        player.remove();
        setPlayer(null);
      }

      setPlayingKey(stemKey);
      const newPlayer = createAudioPlayer({ uri: url });
      (newPlayer as any).addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          setPlayingKey(null);
        }
      });
      newPlayer.play();
      setPlayer(newPlayer);
    } catch (e) {
      console.log('Stem play error:', e);
      setPlayingKey(null);
    }
  }

  // Save Song
  async function handleSave() {
    if (!title.trim()) {
      customAlert('Required Field', 'Please enter a song title.');
      setActiveTab('details');
      return;
    }

    setSaving(true);
    try {
      const primaryCategory = categories[0] || category.trim() || undefined;
      const resolvedProgramId =
        (primaryCategory ? collectionToIdMap[primaryCategory] : undefined) ||
        (song as any)?.programId ||
        (song as any)?.praiseNightId ||
        undefined;

      const normalizedImageUrl = imageUrl.trim()
        ? imageUrl.trim().startsWith('http://') &&
          !imageUrl.includes('localhost') &&
          !imageUrl.includes('10.0.2.2')
          ? 'https://' + imageUrl.trim().slice(7)
          : imageUrl.trim()
        : '';

      const payload: MasterSong = {
        id: song?.id || `master-${Date.now()}`,
        title: title.trim(),
        writer: writer.trim(),
        publishedByName: writer.trim(),
        leadSinger: leadSinger.trim(),
        category: primaryCategory,
        categories: categories.length > 0 ? categories : (primaryCategory ? [primaryCategory] : []),
        program: primaryCategory,
        programName: primaryCategory,
        programId: primaryCategory ? resolvedProgramId : undefined,
        praiseNightId: primaryCategory ? resolvedProgramId : undefined,
        key: key.trim(),
        tempo: tempo.trim(),
        conductor: conductor.trim(),
        leadKeyboardist: leadKeyboardist.trim(),
        bassGuitarist: bassGuitarist.trim(),
        drummer: drummer.trim(),
        audioFile: audioUrls.full || '',
        audioUrl: audioUrls.full || '',
        audioUrls: { ...audioUrls, _customParts: customParts } as any,
        customParts,
        lyrics: editorTextToHtml(lyrics.trim()),
        solfas: editorTextToHtml(solfa.trim()),
        solfa: editorTextToHtml(solfa.trim()),
        conductorGuide: editorTextToHtml(solfa.trim()),
        history: editorTextToHtml(history.trim()),
        coordinatorComment: editorTextToHtml(history.trim()),
        coordinatorNotes: editorTextToHtml(history.trim()),
        notes: editorTextToHtml(history.trim()),
        imageUrl: normalizedImageUrl,
        isHQOnly,
        isHqOnly: isHQOnly,
        isHidden: isHQOnly,
        scope: isHQOnly ? 'hq' : 'global',
        isMaster: true,
        isMinistered: true,
      };

      let response: any;
      if (isCreate) {
        response = await api.songs.create({ ...payload, status: isHQOnly ? 'hq_only' : 'active' });
      } else if (song?.id) {
        response = await api.songs.update(song.id, { ...payload, status: isHQOnly ? 'hq_only' : 'active' });
      }
      if (response && response.success === false) throw new Error('Failed to save master song.');

      const savedSong: MasterSong = response?.data
        ? {
            ...payload,
            id: response.data.id || payload.id,
            ...response.data,
          }
        : payload;

      onSaved(savedSong, isCreate);
      onClose();
    } catch (e: any) {
      customAlert('Save Error', e.message || 'Failed to save master song.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!song?.id) return;
    customAlert(
      'Delete Master Song',
      `Are you sure you want to delete "${title || song.title}" permanently from the master catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.songs.delete(song.id);
              if (onDelete) {
                onDelete(song.id);
              }
              onClose();
            } catch (e: any) {
              customAlert('Error', e?.message || 'Failed to delete master song.');
            }
          },
        },
      ]
    );
  }

  function handleRestoreHistoryEntry(entry: any) {
    if (!entry) return;
    const type = (entry.type || '').toLowerCase();
    const val = entry.new_value ?? entry.old_value ?? entry.notes ?? entry.description ?? '';
    if (!val) return;

    if (type === 'lyrics') {
      setLyrics(htmlToEditorText(String(val)));
      customAlert('Restored', 'Lyrics restored from revision checkpoint.');
    } else if (type === 'solfas' || type === 'solfa' || type === 'notation') {
      setSolfa(htmlToEditorText(String(val)));
      customAlert('Restored', 'Solfa notes restored from revision checkpoint.');
    } else if (type === 'comments' || type === 'comment' || type === 'history') {
      setHistory(htmlToEditorText(String(val)));
      customAlert('Restored', 'Background notes restored from revision checkpoint.');
    } else if (type === 'audio') {
      if (typeof val === 'string' && (val.startsWith('http') || val.includes('/'))) {
        setAudioUrls(prev => ({ ...prev, full: val }));
        customAlert('Restored', 'Audio track restored from revision checkpoint.');
      }
    }
  }

  return {
    song,
    isCreate,
    activeTab,
    setActiveTab,
    title,
    setTitle,
    writer,
    setWriter,
    leadSinger,
    setLeadSinger,
    key,
    setKey,
    tempo,
    setTempo,
    conductor,
    setConductor,
    leadKeyboardist,
    setLeadKeyboardist,
    bassGuitarist,
    setBassGuitarist,
    drummer,
    setDrummer,
    category,
    setCategory,
    categories,
    setCategories,
    toggleCategory,
    imageUrl,
    setImageUrl,
    isHQOnly,
    setIsHQOnly,
    isHidden,
    setIsHidden,
    collectionsList,
    showNewCatInput,
    setShowNewCatInput,
    newCatName,
    setNewCatName,
    handleAddNewCategory,
    audioUrls,
    setAudioUrls,
    customParts,
    newPartName,
    setNewPartName,
    showAddPart,
    setShowAddPart,
    handleAddStem,
    handleRemoveCustomStem,
    lyrics,
    setLyrics,
    lyricsSelection,
    setLyricsSelection,
    solfa,
    setSolfa,
    history,
    setHistory,
    mediaTarget,
    setMediaTarget,
    mediaModalVisible,
    setMediaModalVisible,
    playingKey,
    handleToggleStemAudio,
    handleTogglePlay: (url: string) => handleToggleStemAudio('history', url),
    historyManager,
    saving,
    handleSave,
    handleDelete,
    handleRestoreHistoryEntry,
  };
}
