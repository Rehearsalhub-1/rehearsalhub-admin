import { useState, useCallback, useMemo, useEffect } from 'react';
import { Platform, ActionSheetIOS } from 'react-native';
import { api } from '../../services/api';
import { customAlert } from '../../context/AlertContext';
import { PraiseSong, Program } from './types';
import { getSongDisplayCategory } from './programSongsUtils';

export function useProgramSongs(initialProgram: Program) {
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
      const [progRes, songsRes] = await Promise.allSettled([
        api.programs.getById(currentProgram.id),
        api.songs.getPraiseNightSongs(currentProgram.id),
      ]);

      const progData = progRes.status === 'fulfilled'
        ? (progRes.value?.data || progRes.value)
        : null;
      const junctionSongs: PraiseSong[] =
        progData && Array.isArray(progData.songs) ? progData.songs : [];

      const songsList: PraiseSong[] =
        songsRes.status === 'fulfilled'
          ? (Array.isArray(songsRes.value?.data) ? songsRes.value.data : (Array.isArray(songsRes.value) ? songsRes.value : []))
          : [];

      const seenIds = new Set<string>(junctionSongs.map((s) => s.id));
      const extras = songsList.filter((s) => !seenIds.has(s.id));
      const merged: PraiseSong[] = [...junctionSongs, ...extras];

      if (merged.length > 0) {
        setProgramSongs(merged);
        if (progData) {
          setCurrentProgram(prev => ({ ...prev, ...progData, songs: merged }));
        }
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

  // Compute unique categories
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

  const handleResetReorder = () => {
    setReorderCategoriesList([...uniqueCategories]);
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

  const handleOpenActionMenu = () => {
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
  };

  const handleRemoveSong = (songId: string, title: string) => {
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
  };

  const handleToggleSongActive = (song: PraiseSong) => {
    const isCurrentlyLive = song.status === 'live' || Boolean(song.isLive);
    const nextLive = !isCurrentlyLive;
    setProgramSongs(prev =>
      prev.map(s => (s.id === song.id ? { ...s, isLive: nextLive, status: nextLive ? 'live' : (s.isHeard ? 'heard' : 'unheard') } : s))
    );
    api.songs.toggleActive(song.id, nextLive).catch(() => {});
  };

  const handleToggleHeard = (song: PraiseSong) => {
    const isCurrentlyHeard = Boolean(song.isHeard ?? song.heard ?? song.status === 'heard');
    const next = !isCurrentlyHeard;
    setProgramSongs(prev =>
      prev.map(s => (s.id === song.id ? { ...s, isHeard: next, heard: next, status: next ? 'heard' : 'unheard' } : s))
    );
    api.songs.toggleHeard(song.id, next).catch(() => {});
  };

  const handleSongUpdated = (updated: PraiseSong) => {
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
        coordinatorComment: updated.coordinatorComment,
        comments: updated.comments,
        coordinatorAudioUrl: updated.coordinatorAudioUrl,
        notes: updated.coordinatorComment,
        rehearsalCount: updated.rehearsalCount,
      }).catch(e => console.warn('[ProgramSongs] update failed:', e));
    }
  };

  const handleSongCreated = (newSong?: PraiseSong) => {
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

      setProgramSongs(prev => [songPayload, ...prev]);
    }
  };

  const handleSongCloned = (clonedSong?: PraiseSong) => {
    if (clonedSong) {
      setProgramSongs(prev => [clonedSong, ...prev]);
    }
  };

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

  return {
    currentProgram,
    setCurrentProgram,
    programSongs,
    setProgramSongs,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedCategory,
    setSelectedCategory,
    reorderModalVisible,
    setReorderModalVisible,
    reorderCategoriesList,
    isSavingCategoryOrder,
    detailsModalVisible,
    setDetailsModalVisible,
    selectedSong,
    setSelectedSong,
    cloneModalVisible,
    setCloneModalVisible,
    createSongModalVisible,
    setCreateSongModalVisible,
    editProgramModalVisible,
    setEditProgramModalVisible,
    fetchSongs,
    orderedCategories,
    categoryCounts,
    handleOpenReorderModal,
    handleMoveCategory,
    handleResetReorder,
    handleSaveCategoryOrder,
    handleOpenActionMenu,
    handleRemoveSong,
    handleToggleSongActive,
    handleToggleHeard,
    handleSongUpdated,
    handleSongCreated,
    handleSongCloned,
    pageMetrics,
    filteredSongs,
    existingIds,
  };
}
