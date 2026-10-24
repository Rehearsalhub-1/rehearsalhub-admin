import { useState, useCallback, useMemo, useEffect } from 'react';
import { Platform, ActionSheetIOS } from 'react-native';
import { api } from '../../services/api';
import { customAlert } from '../../context/AlertContext';
import { PraiseSong, Program } from './types';
import { getSongDisplayCategory, getSongAllCategories } from './programSongsUtils';

export function useProgramSongs(initialProgram: Program) {
  const [currentProgram, setCurrentProgram] = useState<Program>(initialProgram);

  const [programSongs, setProgramSongs] = useState<PraiseSong[]>(() => {
    const raw = Array.isArray((initialProgram as any)?.songs) ? (initialProgram as any).songs : [];
    return raw.map((s: any) => ({
      ...s,
      categories: getSongAllCategories(s),
    }));
  });
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
  const [openingSongId, setOpeningSongId] = useState<string | null>(null);

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

      const songsMap = new Map<string, PraiseSong>(songsList.map((s) => [s.id, s]));
      const seenIds = new Set<string>();

      const merged: PraiseSong[] = junctionSongs.map((js) => {
        seenIds.add(js.id);
        const full = songsMap.get(js.id);
        const allCats = getSongAllCategories({
          ...(full || {}),
          ...js,
          categories: [
            ...(Array.isArray(full?.categories) ? full.categories : []),
            ...(Array.isArray(js?.categories) ? js.categories : []),
          ],
        });

        return {
          ...(full || {}),
          ...js,
          category: js.category || full?.category || (allCats.length > 0 ? allCats[0] : undefined),
          categories: allCats,
          conductorGuide: full?.conductorGuide || js.conductorGuide || full?.solfas || js.solfas || '',
          solfas: full?.solfas || js.solfas || full?.conductorGuide || js.conductorGuide || '',
          solfa: full?.solfa || js.solfa || full?.solfas || js.solfas || '',
          audioUrls: {
            ...((typeof full?.audioUrls === 'object' ? full.audioUrls : {}) as any),
            ...((typeof js?.audioUrls === 'object' ? js.audioUrls : {}) as any),
            _categories: allCats,
          },
        };
      });

      songsList.forEach((s) => {
        if (!seenIds.has(s.id)) {
          const allCats = getSongAllCategories(s);
          merged.push({
            ...s,
            category: s.category || (allCats.length > 0 ? allCats[0] : undefined),
            categories: allCats,
            audioUrls: {
              ...((typeof s?.audioUrls === 'object' ? s.audioUrls : {}) as any),
              _categories: allCats,
            },
          });
        }
      });

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
      getSongAllCategories(s).forEach(cat => cats.add(cat));
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
      getSongAllCategories(s).forEach(cat => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
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

  /**
   * Open a song for editing. The program list endpoint strips lyrics/solfas/
   * conductor guide to save bandwidth, so we MUST load the full song first —
   * otherwise saving the form would overwrite those fields with blanks.
   */
  const openSong = async (song: PraiseSong) => {
    if (!song?.id || openingSongId) return;
    setOpeningSongId(song.id);
    try {
      const res: any = await api.songs.getById(song.id);
      const full = res?.data || (res?.id ? res : null);
      if (!full?.id) throw new Error('Song not found');
      const merged: any = { ...song, ...full };
      const allCats = getSongAllCategories({
        ...merged,
        categories: [
          ...(Array.isArray(full.categories) ? full.categories : []),
          ...(Array.isArray(song.categories) ? song.categories : []),
        ],
      });
      merged.categories = allCats;
      merged.category = merged.category || allCats[0] || null;
      setProgramSongs(prev => prev.map(s => (s.id === song.id ? { ...s, ...merged } : s)));
      setSelectedSong(merged);
      setDetailsModalVisible(true);
    } catch (e: any) {
      customAlert(
        'Could not load song',
        'The full song details could not be loaded, so editing was blocked to protect the lyrics and conductor\'s guide. Please check your connection and try again.'
      );
    } finally {
      setOpeningSongId(null);
    }
  };

  const handleRemoveSong = (songId: string, title: string) => {
    customAlert('Remove Song', `Remove "${title}" from this setlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          // Use the SERVER's current list, not local state — local state can be
          // stale (songs added from another device) and would wipe them.
          try {
            const res: any = await api.programs.getById(currentProgram.id);
            const prog = res?.data || res;
            const serverIds: string[] = Array.isArray(prog?.songs)
              ? prog.songs.map((s: any) => s.id).filter(Boolean)
              : (Array.isArray(prog?.songIds) ? prog.songIds : []);
            if (serverIds.length === 0) throw new Error('Could not read current setlist');
            await api.programs.updateSongIds(currentProgram.id, serverIds.filter(id => id !== songId));
            setProgramSongs(prev => prev.filter(s => s.id !== songId));
          } catch (e: any) {
            customAlert('Error', e?.message || 'Failed to remove song. Nothing was changed.');
          }
        },
      },
    ]);
  };

  const handleToggleSongActive = (song: PraiseSong) => {
    const isCurrentlyLive = song.status === 'live' || Boolean(song.isLive);
    const nextLive = !isCurrentlyLive;
    const songIsHeard = Boolean(song.isHeard ?? song.heard ?? song.status === 'heard');
    setProgramSongs(prev =>
      prev.map(s => (s.id === song.id ? {
        ...s,
        isLive: nextLive,
        isHeard: songIsHeard,
        heard: songIsHeard,
        status: nextLive ? 'live' : (songIsHeard ? 'heard' : 'unheard'),
      } : s))
    );
    api.songs.toggleActive(song.id, nextLive, songIsHeard, {
      programId: currentProgram?.id,
      zoneId: currentProgram?.organizationId,
      groupId: currentProgram?.groupId || undefined,
    }).catch(() => {});
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
    // The edit form strips hidden `_` metadata from audioUrls (_categories,
    // _isHeard, _preLiveStatus, _isHQOnly...). Carry it over from the existing
    // song so saving doesn't erase it, and keep _categories in sync.
    const existing: any = programSongs.find(s => s.id === updated.id) || selectedSong || {};
    const preservedMeta: Record<string, any> = {};
    if (existing?.audioUrls && typeof existing.audioUrls === 'object') {
      Object.entries(existing.audioUrls).forEach(([k, v]) => {
        if (k.startsWith('_')) preservedMeta[k] = v;
      });
    }
    const nextCategories = Array.isArray(updated.categories)
      ? updated.categories
      : getSongAllCategories(existing);
    updated = {
      ...updated,
      categories: nextCategories,
      category: updated.category || nextCategories[0] || null,
      audioUrls: {
        ...preservedMeta,
        ...((updated.audioUrls || {}) as any),
        _categories: nextCategories,
      },
    } as PraiseSong;

    setSelectedSong(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : updated));
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
        audioUrls: { ...updated.audioUrls, _customParts: (updated as any).customParts },
        customParts: (updated as any).customParts,
        leadKeyboardist: updated.leadKeyboardist,
        leadGuitarist: updated.leadGuitarist,
        bassGuitarist: (updated as any).bassGuitarist,
        drummer: updated.drummer,
        status: (updated as any).status,
        isLive: (updated as any).isLive,
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
          } else {
            throw new Error('Server did not confirm the new song');
          }
        })
        .catch(err => {
          console.error('[handleSongCreated] api.songs.create error:', err);
          // Remove the ghost so admins don't think it was saved.
          setProgramSongs(prev => prev.filter(s => s.id !== newSong.id));
          customAlert('Song not saved', `"${newSong.title || 'Song'}" failed to save. Please add it again.`);
        });

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
        const songCats = getSongAllCategories(song);
        if (!songCats.includes(selectedCategory)) return false;
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
    openSong,
    openingSongId,
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
