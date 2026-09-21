import { useState, useMemo, useEffect } from 'react';
import { api } from '../../services/api';
import { useZoneContext } from '../../context/ZoneContext';
import { useSchedule } from '../../hooks/useSchedule';
import { customAlert } from '../../context/AlertContext';
import { type ScheduleProgram, type ScheduleSlot } from './types';
import { useScheduleGenericTab } from './useScheduleGenericTab';

export function useScheduleState() {
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();
  const {
    programs,
    activeProgramId,
    setActiveProgramId,
    loading,
    refreshing,
    refetch,
    fetchError,
    upsertProgram,
    bulkUpdatePrograms,
    removeProgram,
  } = useSchedule();

  const [viewHistory, setViewHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedWeekId, setSelectedWeekId] = useState<string>('default_week_1');
  const [selectedDayId, setSelectedDayId] = useState<string>('default_day_1');
  const [eligibilityFilter, setEligibilityFilter] = useState<'eligible' | 'ineligible'>('eligible');

  // Modals
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameProgramName, setRenameProgramName] = useState('');

  // Daily Slot Modal
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotTime, setSlotTime] = useState('09:00');
  const [slotTitle, setSlotTitle] = useState('');
  const [slotKey, setSlotKey] = useState('');
  const [slotAllotment, setSlotAllotment] = useState('15');
  const [slotStatus, setSlotStatus] = useState<'rehearsed' | 'not-rehearsed' | 'break'>('not-rehearsed');
  const [slotNote, setSlotNote] = useState('');

  const activeProgram = useMemo(() => {
    return programs.find(p => p.id === activeProgramId) || programs[0] || null;
  }, [programs, activeProgramId]);

  const displayedPrograms = useMemo(() => {
    return programs.filter(p => viewHistory ? Boolean(p.isArchived) : !p.isArchived);
  }, [programs, viewHistory]);

  const rawWeeks = activeProgram?.weeks || [{ id: 'default_week_1', name: 'Week 1' }];
  const weeks = Array.isArray(rawWeeks) && rawWeeks.length > 0 ? rawWeeks : [{ id: 'default_week_1', name: 'Week 1' }];

  const rawDays = activeProgram?.days || [{ id: 'default_day_1', weekId: weeks[0]?.id || 'default_week_1', name: 'Day 1' }];
  const days = Array.isArray(rawDays) && rawDays.length > 0 ? rawDays : [{ id: 'default_day_1', weekId: weeks[0]?.id || 'default_week_1', name: 'Day 1' }];

  useEffect(() => {
    if (weeks.length > 0) {
      const exists = weeks.some(w => w.id === selectedWeekId);
      if (!exists) {
        const defaultW = activeProgram?.currentWeekId && weeks.some(w => w.id === activeProgram.currentWeekId)
          ? activeProgram.currentWeekId
          : weeks[0].id;
        setSelectedWeekId(defaultW);
      }
    }
  }, [activeProgram, weeks, selectedWeekId]);

  const activeWeekDays = useMemo(() => {
    return days.filter(d => (d.weekId || 'default_week_1') === selectedWeekId);
  }, [days, selectedWeekId]);

  useEffect(() => {
    if (activeWeekDays.length > 0) {
      const exists = activeWeekDays.some(d => d.id === selectedDayId);
      if (!exists) {
        const defaultD = activeProgram?.currentDayId && activeWeekDays.some(d => d.id === activeProgram.currentDayId)
          ? activeProgram.currentDayId
          : activeWeekDays[0].id;
        setSelectedDayId(defaultD);
      }
    } else {
      setSelectedDayId('');
    }
  }, [activeWeekDays, selectedDayId, activeProgram?.currentDayId]);

  const updateProgramData = async (payload: Partial<ScheduleProgram>) => {
    if (!activeProgramId || !activeProgram) {
      customAlert('Error', 'No schedule selected. Please refresh and try again.');
      return;
    }
    try {
      upsertProgram({ ...activeProgram, ...payload });
      await api.schedule.update(activeProgramId, payload);
    } catch (e: any) {
      console.error('[ScheduleScreen] update error:', e);
      customAlert('Error', e?.message || 'Failed to update schedule');
    }
  };

  const handleCreateProgram = async () => {
    const trimmed = newProgramName.trim();
    if (!trimmed) {
      customAlert('Missing Name', 'Please enter a schedule name.');
      return;
    }
    try {
      const orgId = activeZone?.id;
      const subGroupId = isChurchMode ? activeChurch?.id : undefined;
      const res = await api.schedule.create({ name: trimmed, zoneId: orgId, subGroupId });
      setShowCreateProgramModal(false);
      setNewProgramName('');
      if (res?.data?.id) {
        upsertProgram(res.data);
        setActiveProgramId(res.data.id);
      } else {
        refetch();
      }
    } catch (e: any) {
      customAlert('Error', e?.message || 'Failed to create schedule');
    }
  };

  const handleRenameProgram = async () => {
    const trimmed = renameProgramName.trim();
    if (!trimmed || !activeProgramId) return;
    await updateProgramData({ name: trimmed });
    setShowRenameModal(false);
  };

  const handleMakeCurrent = async () => {
    if (!activeProgramId || !activeProgram) return;
    try {
      await api.schedule.makeCurrent(activeProgramId, selectedWeekId, selectedDayId);
      bulkUpdatePrograms(prev => prev.map(p => ({
        ...p,
        isCurrent: p.id === activeProgramId,
        currentWeekId: p.id === activeProgramId ? selectedWeekId : p.currentWeekId,
        currentDayId: p.id === activeProgramId ? selectedDayId : p.currentDayId,
      })));
      customAlert('Active Schedule Set', `"${activeProgram?.name}" is now the current rehearsal schedule.`);
    } catch (e: any) {
      customAlert('Error', e?.message || 'Failed to set current program');
    }
  };

  const handleToggleArchive = async () => {
    if (!activeProgram) return;
    const nextArchived = !activeProgram.isArchived;
    await updateProgramData({ isArchived: nextArchived, isCurrent: nextArchived ? false : activeProgram.isCurrent });
    customAlert(nextArchived ? 'Program Archived' : 'Program Restored', `"${activeProgram.name}" moved to ${nextArchived ? 'Archive' : 'Active Schedules'}.`);
  };

  const handleDeleteProgram = () => {
    if (!activeProgramId) return;
    customAlert('Delete Schedule', `Permanently delete "${activeProgram?.name}" and all its timetables?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.schedule.delete(activeProgramId);
            removeProgram(activeProgramId);
          } catch (e: any) {
            customAlert('Error', e?.message || 'Failed to delete schedule');
          }
        },
      },
    ]);
  };

  const handleAddWeek = async () => {
    const nextNum = weeks.length + 1;
    const newWeekId = `week_${Date.now()}`;
    const newDayId = `day_${Date.now()}`;
    const nextWeeks = [...weeks, { id: newWeekId, name: `Week ${nextNum}` }];
    const nextDays = [...days, { id: newDayId, weekId: newWeekId, name: 'Day 1' }];
    await updateProgramData({ weeks: nextWeeks, days: nextDays });
    setSelectedWeekId(newWeekId);
    setSelectedDayId(newDayId);
  };

  const handleDeleteWeek = (wId: string) => {
    if (weeks.length <= 1) {
      customAlert('Cannot Delete', 'A schedule must have at least one week.');
      return;
    }
    customAlert('Delete Week', 'Delete this week and all associated days and slots?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedWeeks = weeks.filter(w => w.id !== wId);
          const updatedDays = days.filter(d => (d.weekId || 'default_week_1') !== wId);
          const updatedSlots = (activeProgram?.dailySchedules || []).filter(s => (s.weekId || 'default_week_1') !== wId);
          await updateProgramData({ weeks: updatedWeeks, days: updatedDays, dailySchedules: updatedSlots });
          if (selectedWeekId === wId && updatedWeeks.length > 0) setSelectedWeekId(updatedWeeks[0].id);
        },
      },
    ]);
  };

  const handleAddDay = async () => {
    const nextNum = activeWeekDays.length + 1;
    const newDayId = `day_${Date.now()}`;
    const nextDays = [...days, { id: newDayId, weekId: selectedWeekId, name: `Day ${nextNum}` }];
    await updateProgramData({ days: nextDays });
    setSelectedDayId(newDayId);
  };

  const handleDeleteDay = (dId: string) => {
    if (activeWeekDays.length <= 1) {
      customAlert('Cannot Delete', 'A week must have at least one day.');
      return;
    }
    customAlert('Delete Day', 'Delete this day and all its schedule slots?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedDays = days.filter(d => d.id !== dId);
          const updatedSlots = (activeProgram?.dailySchedules || []).filter(s => (s.dayId || 'default_day_1') !== dId);
          await updateProgramData({ days: updatedDays, dailySchedules: updatedSlots });
          if (selectedDayId === dId) {
            const rem = updatedDays.filter(d => (d.weekId || 'default_week_1') === selectedWeekId);
            if (rem.length > 0) setSelectedDayId(rem[0].id);
          }
        },
      },
    ]);
  };

  const currentDaySlots = useMemo(() => {
    if (!activeProgram?.dailySchedules) return [];
    return activeProgram.dailySchedules.filter(s => {
      const itemWeek = s.weekId || 'default_week_1';
      const itemDay = s.dayId || 'default_day_1';
      return itemWeek === selectedWeekId && itemDay === selectedDayId;
    });
  }, [activeProgram?.dailySchedules, selectedWeekId, selectedDayId]);

  const rehearsedCount = currentDaySlots.filter(s => s.status === 'rehearsed').length;
  const pendingCount = currentDaySlots.filter(s => s.status === 'not-rehearsed').length;
  const totalMinutes = currentDaySlots
    .filter(s => s.status !== 'break')
    .reduce((acc, s) => acc + (parseInt(String(s.allotment), 10) || 0), 0);

  const handleCycleSlotStatus = async (slotId: string) => {
    if (!activeProgram) return;
    const allSlots = activeProgram.dailySchedules || [];
    const updated = allSlots.map(s => {
      if (s.id !== slotId) return s;
      const nextStatus: 'rehearsed' | 'not-rehearsed' | 'break' =
        s.status === 'not-rehearsed' ? 'rehearsed' : s.status === 'rehearsed' ? 'break' : 'not-rehearsed';
      return { ...s, status: nextStatus };
    });
    await updateProgramData({ dailySchedules: updated });
  };

  const handleOpenAddSlot = () => {
    setEditingSlotId(null);
    setSlotTime('09:00');
    setSlotTitle('');
    setSlotKey('');
    setSlotAllotment('15');
    setSlotStatus('not-rehearsed');
    setSlotNote('');
    setShowSlotModal(true);
  };

  const handleOpenEditSlot = (slot: ScheduleSlot) => {
    setEditingSlotId(slot.id);
    setSlotTime(slot.time || '09:00');
    setSlotTitle(slot.title || '');
    setSlotKey(slot.key || '');
    setSlotAllotment(String(slot.allotment || '15'));
    setSlotStatus(slot.status || 'not-rehearsed');
    setSlotNote(slot.note || '');
    setShowSlotModal(true);
  };

  const handleSaveSlot = async () => {
    if (!slotTitle.trim()) {
      customAlert('Missing Title', 'Please enter a song or session title.');
      return;
    }
    const allSlots = activeProgram?.dailySchedules || [];
    let updated: ScheduleSlot[];
    if (editingSlotId) {
      updated = allSlots.map(s => s.id === editingSlotId ? {
        ...s,
        time: slotTime.trim() || '09:00',
        title: slotTitle.trim(),
        key: slotKey.trim() || '—',
        allotment: parseInt(slotAllotment, 10) || 15,
        status: slotStatus,
        note: slotNote.trim(),
        weekId: s.weekId || selectedWeekId,
        dayId: s.dayId || selectedDayId,
      } : s);
    } else {
      updated = [...allSlots, {
        id: `slot_${Date.now()}`,
        weekId: selectedWeekId,
        dayId: selectedDayId,
        time: slotTime.trim() || '09:00',
        title: slotTitle.trim(),
        key: slotKey.trim() || '—',
        allotment: parseInt(slotAllotment, 10) || 15,
        status: slotStatus,
        note: slotNote.trim(),
      }];
    }
    await updateProgramData({ dailySchedules: updated });
    setShowSlotModal(false);
  };

  const handleDeleteSlot = (slotId: string) => {
    customAlert('Delete Slot', 'Remove this schedule slot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const allSlots = activeProgram?.dailySchedules || [];
          await updateProgramData({ dailySchedules: allSlots.filter(s => s.id !== slotId) });
        },
      },
    ]);
  };

  const genericTab = useScheduleGenericTab({
    activeProgram,
    activeTab,
    updateProgramData,
  });

  return {
    isChurchMode,
    loading,
    refreshing,
    refetch,
    fetchError,
    viewHistory,
    setViewHistory,
    displayedPrograms,
    activeProgramId,
    setActiveProgramId,
    activeProgram,
    weeks,
    days,
    selectedWeekId,
    setSelectedWeekId,
    selectedDayId,
    setSelectedDayId,
    activeWeekDays,
    currentDaySlots,
    rehearsedCount,
    pendingCount,
    totalMinutes,
    activeTab,
    setActiveTab,
    eligibilityFilter,
    setEligibilityFilter,
    showCreateProgramModal,
    setShowCreateProgramModal,
    newProgramName,
    setNewProgramName,
    showRenameModal,
    setShowRenameModal,
    renameProgramName,
    setRenameProgramName,
    showSlotModal,
    setShowSlotModal,
    editingSlotId,
    slotTime,
    setSlotTime,
    slotAllotment,
    setSlotAllotment,
    slotTitle,
    setSlotTitle,
    slotKey,
    setSlotKey,
    slotStatus,
    setSlotStatus,
    slotNote,
    setSlotNote,
    ...genericTab,
    handleCreateProgram,
    handleRenameProgram,
    handleMakeCurrent,
    handleToggleArchive,
    handleDeleteProgram,
    handleAddWeek,
    handleDeleteWeek,
    handleAddDay,
    handleDeleteDay,
    handleCycleSlotStatus,
    handleOpenAddSlot,
    handleOpenEditSlot,
    handleSaveSlot,
    handleDeleteSlot,
  };
}
