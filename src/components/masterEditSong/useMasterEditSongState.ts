import { useState, useEffect, useRef } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { MasterSong } from '../MasterSongDetailModal';
import { api } from '../../services/api';
import { customAlert } from '../../context/AlertContext';
import { htmlToEditorText, editorTextToHtml } from '../../lib/lyricsFormat';
import { DEFAULT_COLLECTIONS } from './types';

interface UseMasterEditSongStateProps {
  visible: boolean;
  song?: MasterSong | null;
  mode?: 'edit' | 'create';
  onClose: () => void;
  onSaved: (song: MasterSong, isNew: boolean) => void;
}

export function useMasterEditSongState({
  visible,
  song,
  mode = 'edit',
  onClose,
  onSaved,
}: UseMasterEditSongStateProps) {
  const isCreate = mode === 'create' || !song;
  const [activeTab, setActiveTab] = useState<'details' | 'audio' | 'lyrics' | 'access'>('details');

  // Form State
  const [title, setTitle] = useState(''), [writer, setWriter] = useState(''), [leadSinger, setLeadSinger] = useState('');
  const [key, setKey] = useState(''), [tempo, setTempo] = useState(''), [conductor, setConductor] = useState('');
  const [leadKeyboardist, setLeadKeyboardist] = useState(''), [bassGuitarist, setBassGuitarist] = useState(''), [drummer, setDrummer] = useState('');
  const [category, setCategory] = useState(''), [imageUrl, setImageUrl] = useState(''), [isHQOnly, setIsHQOnly] = useState(false);

  // Master Programs / Collections & Inline Creation
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
        const existingColl = (song as any).program || (song as any).programName || song.category || '';
        setCategory(existingColl);
        setImageUrl(song.imageUrl || '');
        setIsHQOnly(Boolean(song.isHQOnly || song.isHqOnly));
        setLyrics(htmlToEditorText(song.lyrics || ''));
        setSolfa(htmlToEditorText(song.solfas || song.solfa || song.conductorGuide || ''));
        setHistory(htmlToEditorText(song.history || song.coordinatorComment || song.coordinatorNotes || ''));

        if (existingColl && !collectionsList.includes(existingColl)) {
          setCollectionsList(prev => [existingColl, ...prev]);
        }

        const urls: Record<string, string> = {
          full: song.audioUrls?.full || song.audioFile || song.audioUrl || '',
          soprano: song.audioUrls?.soprano || '',
          alto: song.audioUrls?.alto || '',
          tenor: song.audioUrls?.tenor || '',
          bass: song.audioUrls?.bass || '',
        };

        const parts: string[] = [];
        if (song.customParts) {
          if (Array.isArray(song.customParts)) {
            song.customParts.forEach(p => {
              parts.push(p);
              if (song.audioUrls?.[p]) urls[p] = song.audioUrls[p];
            });
          } else if (typeof song.customParts === 'object') {
            Object.entries(song.customParts).forEach(([k, v]) => {
              parts.push(k);
              if (typeof v === 'string') urls[k] = v;
            });
          }
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
        setImageUrl('');
        setIsHQOnly(false);
        setLyrics('');
        setSolfa('');
        setHistory('');
        setAudioUrls({ full: '', soprano: '', alto: '', tenor: '', bass: '' });
        setCustomParts([]);
      }
    } else {
      if (player) {
        player.pause();
        player.remove();
        setPlayer(null);
      }
      setPlayingKey(null);
    }
  }, [visible, song, isCreate]);

  // Handle inline collection creation
  async function handleAddNewCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (!collectionsList.includes(trimmed)) {
      setCollectionsList(prev => [trimmed, ...prev]);
    }
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
      const resolvedProgramId =
        collectionToIdMap[category.trim()] ||
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
        category: category.trim() || undefined,
        categories: category.trim() ? [category.trim()] : [],
        program: category.trim() || undefined,
        programName: category.trim() || undefined,
        programId: category.trim() ? resolvedProgramId : undefined,
        praiseNightId: category.trim() ? resolvedProgramId : undefined,
        key: key.trim(),
        tempo: tempo.trim(),
        conductor: conductor.trim(),
        leadKeyboardist: leadKeyboardist.trim(),
        bassGuitarist: bassGuitarist.trim(),
        drummer: drummer.trim(),
        audioFile: audioUrls.full || '',
        audioUrl: audioUrls.full || '',
        audioUrls,
        customParts,
        lyrics: editorTextToHtml(lyrics.trim()),
        solfas: editorTextToHtml(solfa.trim()),
        solfa: editorTextToHtml(solfa.trim()),
        conductorGuide: editorTextToHtml(solfa.trim()),
        history: editorTextToHtml(history.trim()),
        imageUrl: normalizedImageUrl,
        isHQOnly,
        isHqOnly: isHQOnly,
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

  return {
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
    imageUrl,
    setImageUrl,
    isHQOnly,
    setIsHQOnly,
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
    saving,
    handleSave,
  };
}
