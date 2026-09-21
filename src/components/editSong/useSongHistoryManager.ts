import { useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../../services/api';
import { PraiseNightSong } from './types';

interface UseSongHistoryManagerProps {
  song: PraiseNightSong | null;
  songTitle: string;
  songCategories: string[];
  songProgram: string;
  songStatus: string;
  songKey: string;
  songTempo: string;
  songLeadSinger: string;
  songWriter: string;
  songConductor: string;
  songLeadKeyboardist: string;
  songLeadGuitarist: string;
  songDrummer: string;
  songLyrics: string;
  songSolfas: string;
  songNotation: string;
  songAudioFile: string;
  coordinatorComment: string;
}

export function useSongHistoryManager({
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
  songDrummer,
  songLyrics,
  songSolfas,
  songNotation,
  songAudioFile,
  coordinatorComment,
}: UseSongHistoryManagerProps) {
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

    setOriginalHistoryValues({ old_value: currentContent, new_value: currentContent });
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

        if (!res?.data?.id) throw new Error('Server did not return a confirmed history ID.');

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
                if (song && Array.isArray(song.history)) song.history = filtered;
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

  return {
    historyEntries,
    setHistoryEntries,
    showHistoryList,
    setShowHistoryList,
    showHistoryForm,
    setShowHistoryForm,
    editingHistoryEntryId,
    setEditingHistoryEntryId,
    historyFormType,
    setHistoryFormType,
    historyFormTitle,
    setHistoryFormTitle,
    historyFormDesc,
    setHistoryFormDesc,
    originalHistoryValues,
    setOriginalHistoryValues,
    formatHistoryType,
    handleAddHistory,
    handleEditHistoryEntry,
    handleSaveHistoryEntry,
    handleDeleteHistoryEntry,
  };
}
