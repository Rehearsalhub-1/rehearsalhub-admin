import { useState } from 'react';
import { customAlert } from '../../context/AlertContext';
import {
  type ScheduleProgram,
  type NewSongItem,
  type CarriedSongItem,
  type SwappedSongItem,
  type NameChangeItem,
  type InvalidSongItem,
  type SubmitterItem,
} from './types';

interface UseScheduleGenericTabProps {
  activeProgram: ScheduleProgram | null;
  activeTab: string;
  updateProgramData: (payload: Partial<ScheduleProgram>) => Promise<void>;
}

export function useScheduleGenericTab({
  activeProgram,
  activeTab,
  updateProgramData,
}: UseScheduleGenericTabProps) {
  const [showGenericModal, setShowGenericModal] = useState(false);
  const [editingGenericId, setEditingGenericId] = useState<string | null>(null);
  const [genericField1, setGenericField1] = useState('');
  const [genericField2, setGenericField2] = useState('');
  const [genericField3, setGenericField3] = useState('');
  const [genericField4, setGenericField4] = useState('');
  const [genericField5, setGenericField5] = useState('');
  const [genericBool, setGenericBool] = useState(false);

  const handleOpenAddGeneric = () => {
    setEditingGenericId(null);
    setGenericField1('');
    setGenericField2('');
    setGenericField3('');
    setGenericField4('');
    setGenericField5('');
    setGenericBool(false);
    setShowGenericModal(true);
  };

  const handleSaveGeneric = async () => {
    if (!activeProgram) return;
    if (activeTab === 'new') {
      if (!genericField1.trim()) return customAlert('Required', 'Please enter a song title.');
      const list = activeProgram.newSongs || [];
      const item: NewSongItem = {
        id: editingGenericId || `new_${Date.now()}`,
        title: genericField1.trim(),
        key: genericField2.trim() || '—',
        duration: genericField3.trim() || '--',
        submittedBy: genericField4.trim() || 'Minister',
        submittedOn: genericField5.trim() || new Date().toISOString().split('T')[0],
      };
      const updated = editingGenericId ? list.map(i => i.id === editingGenericId ? item : i) : [item, ...list];
      await updateProgramData({ newSongs: updated });
    } else if (activeTab === 'carried') {
      if (!genericField1.trim()) return customAlert('Required', 'Please enter song title.');
      const list = activeProgram.carriedOver || [];
      const item: CarriedSongItem = {
        id: editingGenericId || `co_${Date.now()}`,
        title: genericField1.trim(),
        rehearsalCount: parseInt(genericField2, 10) || 1,
        originalProgram: genericField3.trim() || 'Previous Rehearsal',
        key: genericField4.trim() || '—',
        reason: genericField5.trim(),
      };
      const updated = editingGenericId ? list.map(i => i.id === editingGenericId ? item : i) : [item, ...list];
      await updateProgramData({ carriedOver: updated });
    } else if (activeTab === 'swapped') {
      if (!genericField1.trim() || !genericField2.trim()) return customAlert('Required', 'Enter original and replacement songs.');
      const list = activeProgram.swapped || [];
      const item: SwappedSongItem = {
        id: editingGenericId || `sw_${Date.now()}`,
        original: genericField1.trim(),
        replacement: genericField2.trim(),
        swappedBy: genericField3.trim() || 'Music Director',
        swappedOn: genericField4.trim() || new Date().toISOString().split('T')[0],
        reason: genericField5.trim(),
      };
      const updated = editingGenericId ? list.map(i => i.id === editingGenericId ? item : i) : [item, ...list];
      await updateProgramData({ swapped: updated });
    } else if (activeTab === 'renamed') {
      if (!genericField1.trim() || !genericField2.trim()) return customAlert('Required', 'Enter previous and new title.');
      const list = activeProgram.nameChanges || [];
      const item: NameChangeItem = {
        id: editingGenericId || `nc_${Date.now()}`,
        from: genericField1.trim(),
        to: genericField2.trim(),
        changedBy: genericField3.trim() || 'Admin',
        changedOn: genericField4.trim() || new Date().toISOString().split('T')[0],
        reason: genericField5.trim(),
      };
      const updated = editingGenericId ? list.map(i => i.id === editingGenericId ? item : i) : [item, ...list];
      await updateProgramData({ nameChanges: updated });
    } else if (activeTab === 'invalid') {
      if (!genericField1.trim()) return customAlert('Required', 'Enter invalid song title.');
      const list = activeProgram.invalidSongs || [];
      const item: InvalidSongItem = {
        id: editingGenericId || `inv_${Date.now()}`,
        title: genericField1.trim(),
        invalidatedBy: genericField2.trim() || 'Reviewer',
        replacedBy: genericField3.trim(),
        date: genericField4.trim() || new Date().toISOString().split('T')[0],
        reason: genericField5.trim(),
      };
      const updated = editingGenericId ? list.map(i => i.id === editingGenericId ? item : i) : [item, ...list];
      await updateProgramData({ invalidSongs: updated });
    } else if (activeTab === 'eligibility') {
      if (!genericField1.trim()) return customAlert('Required', 'Enter submitter name.');
      const list = activeProgram.submitters || [];
      const item: SubmitterItem = {
        id: editingGenericId || `sub_${Date.now()}`,
        name: genericField1.trim(),
        role: genericField2.trim() || 'Choir Member',
        submissions: parseInt(genericField3, 10) || 0,
        quota: parseInt(genericField4, 10) || 3,
        isBlocked: genericBool,
        since: genericBool ? (genericField5.trim() || new Date().toISOString().split('T')[0]) : undefined,
        reason: genericBool ? genericField5.trim() : undefined,
      };
      const updated = editingGenericId ? list.map(i => i.id === editingGenericId ? item : i) : [item, ...list];
      await updateProgramData({ submitters: updated });
    }
    setShowGenericModal(false);
  };

  const handleDeleteGenericItem = (id: string) => {
    if (!activeProgram) return;
    customAlert('Delete Item', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (activeTab === 'new') {
            await updateProgramData({ newSongs: (activeProgram.newSongs || []).filter(i => i.id !== id) });
          } else if (activeTab === 'carried') {
            await updateProgramData({ carriedOver: (activeProgram.carriedOver || []).filter(i => i.id !== id) });
          } else if (activeTab === 'swapped') {
            await updateProgramData({ swapped: (activeProgram.swapped || []).filter(i => i.id !== id) });
          } else if (activeTab === 'renamed') {
            await updateProgramData({ nameChanges: (activeProgram.nameChanges || []).filter(i => i.id !== id) });
          } else if (activeTab === 'invalid') {
            await updateProgramData({ invalidSongs: (activeProgram.invalidSongs || []).filter(i => i.id !== id) });
          } else if (activeTab === 'eligibility') {
            await updateProgramData({ submitters: (activeProgram.submitters || []).filter(i => i.id !== id) });
          }
        },
      },
    ]);
  };

  return {
    showGenericModal,
    setShowGenericModal,
    genericField1,
    setGenericField1,
    genericField2,
    setGenericField2,
    genericField3,
    setGenericField3,
    genericField4,
    setGenericField4,
    genericField5,
    setGenericField5,
    genericBool,
    setGenericBool,
    handleOpenAddGeneric,
    handleSaveGeneric,
    handleDeleteGenericItem,
  };
}
