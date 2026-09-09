import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleSlot {
  id: string;
  weekId?: string;
  dayId?: string;
  time: string;
  title: string;
  key?: string;
  allotment: number | string;
  status: 'rehearsed' | 'not-rehearsed' | 'break';
  note?: string;
}

export interface NewSongItem {
  id: string;
  title: string;
  key?: string;
  duration?: string;
  submittedBy?: string;
  submittedOn?: string;
}

export interface CarriedSongItem {
  id: string;
  title: string;
  rehearsalCount?: number;
  originalProgram?: string;
  key?: string;
  reason?: string;
}

export interface SwappedSongItem {
  id: string;
  original: string;
  replacement: string;
  swappedBy?: string;
  swappedOn?: string;
  reason?: string;
}

export interface NameChangeItem {
  id: string;
  from: string;
  to: string;
  changedBy?: string;
  changedOn?: string;
  reason?: string;
}

export interface InvalidSongItem {
  id: string;
  title: string;
  invalidatedBy?: string;
  replacedBy?: string;
  date?: string;
  reason?: string;
}

export interface SubmitterItem {
  id: string;
  name: string;
  role?: string;
  submissions?: number;
  quota?: number;
  isBlocked?: boolean;
  since?: string;
  reason?: string;
}

export interface ScheduleProgram {
  id: string;
  name: string;
  date?: string;
  category?: string;
  status?: string;
  zoneId?: string;
  organizationId?: string;
  subGroupId?: string;
  isCurrent?: boolean;
  isArchived?: boolean;
  currentWeekId?: string;
  currentDayId?: string;
  weeks?: { id: string; name: string }[];
  days?: { id: string; weekId: string; name: string }[];
  dailySchedules?: ScheduleSlot[];
  newSongs?: NewSongItem[];
  carriedOver?: CarriedSongItem[];
  swapped?: SwappedSongItem[];
  nameChanges?: NameChangeItem[];
  invalidSongs?: InvalidSongItem[];
  submitters?: SubmitterItem[];
  createdAt?: string;
  updatedAt?: string;
}

const TABS = [
  { id: 'schedule', label: 'Daily Schedule', icon: 'calendar' },
  { id: 'new', label: 'New Songs', icon: 'musical-notes' },
  { id: 'carried', label: 'Carried Over', icon: 'return-down-back' },
  { id: 'swapped', label: 'Swapped', icon: 'swap-horizontal' },
  { id: 'renamed', label: 'Name Changes', icon: 'pencil' },
  { id: 'invalid', label: 'Invalid', icon: 'ban' },
  { id: 'eligibility', label: 'Eligibility', icon: 'people' },
];

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [programs, setPrograms] = useState<ScheduleProgram[]>([]);
  const [activeProgramId, setActiveProgramId] = useState<string>('');
  const [viewHistory, setViewHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Generic Item Modal (for the other 6 tabs)
  const [showGenericModal, setShowGenericModal] = useState(false);
  const [editingGenericId, setEditingGenericId] = useState<string | null>(null);
  const [genericField1, setGenericField1] = useState('');
  const [genericField2, setGenericField2] = useState('');
  const [genericField3, setGenericField3] = useState('');
  const [genericField4, setGenericField4] = useState('');
  const [genericField5, setGenericField5] = useState('');
  const [genericBool, setGenericBool] = useState(false);

  // ── Fetch Programs ──────────────────────────────────────────────────────────
  const fetchPrograms = useCallback(async () => {
    try {
      const zoneId = isChurchMode ? undefined : activeZone?.id;
      const subGroupId = isChurchMode ? activeChurch?.id : undefined;
      const res = await api.schedule.getAll(zoneId, undefined, subGroupId);
      const data = Array.isArray(res?.data) ? res.data : [];
      setPrograms(data);

      if (data.length > 0) {
        setActiveProgramId(prev => {
          if (prev && data.some(p => p.id === prev)) return prev;
          const curr = data.find(p => p.isCurrent && !p.isArchived);
          if (curr) return curr.id;
          const firstActive = data.find(p => !p.isArchived);
          return firstActive ? firstActive.id : data[0].id;
        });
      } else {
        setActiveProgramId('');
      }
    } catch (e) {
      console.error('[ScheduleScreen] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  useEffect(() => {
    setLoading(true);
    fetchPrograms();
  }, [fetchPrograms]);

  const activeProgram = useMemo(() => {
    return programs.find(p => p.id === activeProgramId) || programs[0] || null;
  }, [programs, activeProgramId]);

  const displayedPrograms = useMemo(() => {
    return programs.filter(p => viewHistory ? Boolean(p.isArchived) : !p.isArchived);
  }, [programs, viewHistory]);

  // Weeks & Days
  const rawWeeks = activeProgram?.weeks || [{ id: 'default_week_1', name: 'Week 1' }];
  const weeks = Array.isArray(rawWeeks) && rawWeeks.length > 0 ? rawWeeks : [{ id: 'default_week_1', name: 'Week 1' }];

  const rawDays = activeProgram?.days || [{ id: 'default_day_1', weekId: weeks[0]?.id || 'default_week_1', name: 'Day 1' }];
  const days = Array.isArray(rawDays) && rawDays.length > 0 ? rawDays : [{ id: 'default_day_1', weekId: weeks[0]?.id || 'default_week_1', name: 'Day 1' }];

  // Sync selected week
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

  // Sync selected day
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

  // ── Program Mutations ───────────────────────────────────────────────────────
  const updateProgramData = async (payload: Partial<ScheduleProgram>) => {
    if (!activeProgramId) return;
    try {
      setPrograms(prev => prev.map(p => p.id === activeProgramId ? { ...p, ...payload } : p));
      await api.schedule.update(activeProgramId, payload);
    } catch (e: any) {
      console.error('[ScheduleScreen] update error:', e);
      Alert.alert('Error', e?.message || 'Failed to update schedule');
    }
  };

  const handleCreateProgram = async () => {
    const trimmed = newProgramName.trim();
    if (!trimmed) {
      Alert.alert('Missing Name', 'Please enter a schedule name.');
      return;
    }
    try {
      const orgId = activeZone?.id || 'zone-001';
      const subGroupId = isChurchMode ? activeChurch?.id : undefined;
      const res = await api.schedule.create({
        name: trimmed,
        zoneId: orgId,
        subGroupId,
      });
      setShowCreateProgramModal(false);
      setNewProgramName('');
      if (res?.data?.id) {
        setPrograms(prev => [res.data, ...prev]);
        setActiveProgramId(res.data.id);
      } else {
        fetchPrograms();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create schedule');
    }
  };

  const handleRenameProgram = async () => {
    const trimmed = renameProgramName.trim();
    if (!trimmed || !activeProgramId) return;
    await updateProgramData({ name: trimmed });
    setShowRenameModal(false);
  };

  const handleMakeCurrent = async () => {
    if (!activeProgramId) return;
    try {
      await api.schedule.makeCurrent(activeProgramId, selectedWeekId, selectedDayId);
      setPrograms(prev => prev.map(p => ({
        ...p,
        isCurrent: p.id === activeProgramId,
        currentWeekId: p.id === activeProgramId ? selectedWeekId : p.currentWeekId,
        currentDayId: p.id === activeProgramId ? selectedDayId : p.currentDayId,
      })));
      Alert.alert('Active Schedule Set', `"${activeProgram?.name}" is now the current rehearsal schedule.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to set current program');
    }
  };

  const handleToggleArchive = async () => {
    if (!activeProgram) return;
    const nextArchived = !activeProgram.isArchived;
    await updateProgramData({ isArchived: nextArchived, isCurrent: nextArchived ? false : activeProgram.isCurrent });
    Alert.alert(nextArchived ? 'Program Archived' : 'Program Restored', `"${activeProgram.name}" moved to ${nextArchived ? 'Archive' : 'Active Schedules'}.`);
  };

  const handleDeleteProgram = () => {
    if (!activeProgramId) return;
    Alert.alert(
      'Delete Schedule',
      `Permanently delete "${activeProgram?.name}" and all its timetables?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.schedule.delete(activeProgramId);
              const remaining = programs.filter(p => p.id !== activeProgramId);
              setPrograms(remaining);
              setActiveProgramId(remaining[0]?.id || '');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete schedule');
            }
          },
        },
      ]
    );
  };

  // ── Weeks & Days Management ────────────────────────────────────────────────
  const handleAddWeek = async () => {
    const nextNum = weeks.length + 1;
    const newWeekId = `week_${Date.now()}`;
    const newWeek = { id: newWeekId, name: `Week ${nextNum}` };
    const newDayId = `day_${Date.now()}`;
    const newDay = { id: newDayId, weekId: newWeekId, name: 'Day 1' };

    const nextWeeks = [...weeks, newWeek];
    const nextDays = [...days, newDay];
    await updateProgramData({ weeks: nextWeeks, days: nextDays });
    setSelectedWeekId(newWeekId);
    setSelectedDayId(newDayId);
  };

  const handleDeleteWeek = (wId: string) => {
    if (weeks.length <= 1) {
      Alert.alert('Cannot Delete', 'A schedule must have at least one week.');
      return;
    }
    Alert.alert('Delete Week', 'Delete this week and all associated days and slots?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedWeeks = weeks.filter(w => w.id !== wId);
          const updatedDays = days.filter(d => (d.weekId || 'default_week_1') !== wId);
          const updatedSlots = (activeProgram?.dailySchedules || []).filter(s => (s.weekId || 'default_week_1') !== wId);
          await updateProgramData({ weeks: updatedWeeks, days: updatedDays, dailySchedules: updatedSlots });
          if (selectedWeekId === wId && updatedWeeks.length > 0) {
            setSelectedWeekId(updatedWeeks[0].id);
          }
        },
      },
    ]);
  };

  const handleAddDay = async () => {
    const nextNum = activeWeekDays.length + 1;
    const newDayId = `day_${Date.now()}`;
    const newDay = { id: newDayId, weekId: selectedWeekId, name: `Day ${nextNum}` };

    const nextDays = [...days, newDay];
    await updateProgramData({ days: nextDays });
    setSelectedDayId(newDayId);
  };

  const handleDeleteDay = (dId: string) => {
    if (activeWeekDays.length <= 1) {
      Alert.alert('Cannot Delete', 'A week must have at least one day.');
      return;
    }
    Alert.alert('Delete Day', 'Delete this day and all its schedule slots?', [
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

  // ── Daily Schedule Slot Actions ────────────────────────────────────────────
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

  // 1-Tap quick cycle status on timeline slot pill: Pending -> Rehearsed -> Break -> Pending
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
      Alert.alert('Missing Title', 'Please enter a song or session title.');
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
      const newSlot: ScheduleSlot = {
        id: `slot_${Date.now()}`,
        weekId: selectedWeekId,
        dayId: selectedDayId,
        time: slotTime.trim() || '09:00',
        title: slotTitle.trim(),
        key: slotKey.trim() || '—',
        allotment: parseInt(slotAllotment, 10) || 15,
        status: slotStatus,
        note: slotNote.trim(),
      };
      updated = [...allSlots, newSlot];
    }

    await updateProgramData({ dailySchedules: updated });
    setShowSlotModal(false);
  };

  const handleDeleteSlot = (slotId: string) => {
    Alert.alert('Delete Slot', 'Remove this schedule slot?', [
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

  // ── Generic Tab Item Handlers (New, Carried, Swapped, Renamed, Invalid, Submitter) ────
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
      if (!genericField1.trim()) return Alert.alert('Required', 'Please enter a song title.');
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
      if (!genericField1.trim()) return Alert.alert('Required', 'Please enter song title.');
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
      if (!genericField1.trim() || !genericField2.trim()) return Alert.alert('Required', 'Enter original and replacement songs.');
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
      if (!genericField1.trim() || !genericField2.trim()) return Alert.alert('Required', 'Enter previous and new title.');
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
      if (!genericField1.trim()) return Alert.alert('Required', 'Enter invalid song title.');
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
      if (!genericField1.trim()) return Alert.alert('Required', 'Enter submitter name.');
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
    Alert.alert('Delete Item', 'Remove this entry?', [
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

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ZoneHeader title={isChurchMode ? 'Church Schedule' : 'Schedule Manager'} />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ZoneHeader title={isChurchMode ? 'Church Schedule' : 'Schedule Manager'} />

      {/* ── 1. STUDIO HEADER & CONTROLS ──────────────────────────────────────── */}
      <View style={styles.topControlBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={[styles.historyPill, viewHistory && styles.historyPillActive]}
            onPress={() => setViewHistory(!viewHistory)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={viewHistory ? 'arrow-back' : 'archive-outline'}
              size={14}
              color={viewHistory ? '#d97706' : '#64748b'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.historyPillText, viewHistory && styles.historyPillTextActive]}>
              {viewHistory ? 'Active Schedules' : 'Archive'}
            </Text>
          </TouchableOpacity>
        </View>

        {!viewHistory && (
          <TouchableOpacity
            style={styles.newProgramBtn}
            onPress={() => {
              setNewProgramName('');
              setShowCreateProgramModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.newProgramBtnText}>New Program</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── 2. PROGRAM SELECTOR & ACTIONS ──────────────────────────────────── */}
      <View style={styles.programBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.programScroll}>
          {displayedPrograms.length === 0 && (
            <Text style={styles.noProgramsText}>
              No {viewHistory ? 'archived' : 'active'} schedules. Tap "+ New Program".
            </Text>
          )}

          {displayedPrograms.map(p => {
            const isSelected = activeProgramId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setActiveProgramId(p.id)}
                style={[styles.programPill, isSelected && styles.programPillSelected]}
                activeOpacity={0.75}
              >
                <Text style={[styles.programPillText, isSelected && styles.programPillTextSelected]}>
                  {p.name}
                </Text>
                {p.isCurrent && (
                  <View style={[styles.currentTag, isSelected && styles.currentTagSelected]}>
                    <Text style={[styles.currentTagText, isSelected && styles.currentTagTextSelected]}>
                      ★ CURRENT
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeProgram && (
          <View style={styles.programActionRow}>
            {!viewHistory && !activeProgram.isCurrent && (
              <TouchableOpacity style={styles.actionBtnSmall} onPress={handleMakeCurrent} activeOpacity={0.75}>
                <Ionicons name="star" size={13} color="#d97706" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnSmallText}>Make Current</Text>
              </TouchableOpacity>
            )}

            {!viewHistory && (
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => {
                  setRenameProgramName(activeProgram.name);
                  setShowRenameModal(true);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="pencil" size={14} color="#64748b" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.iconActionBtn} onPress={handleToggleArchive} activeOpacity={0.75}>
              <Ionicons name={viewHistory ? 'refresh' : 'archive'} size={14} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconActionBtn} onPress={handleDeleteProgram} activeOpacity={0.75}>
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── 3. TIMETABLE WEEKS & DAYS BAR ──────────────────────────────────── */}
      {activeProgram && activeTab === 'schedule' && (
        <View style={styles.weeksDaysContainer}>
          {/* Weeks Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeksScroll}>
            {weeks.map(w => {
              const isSelected = selectedWeekId === w.id;
              const isCurrentWeek = activeProgram.currentWeekId === w.id;
              return (
                <View key={w.id} style={styles.weekTabWrap}>
                  <TouchableOpacity
                    style={[styles.weekTab, isSelected && styles.weekTabActive]}
                    onPress={() => setSelectedWeekId(w.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.weekTabText, isSelected && styles.weekTabTextActive]}>
                      {w.name}
                    </Text>
                    {isCurrentWeek && <Text style={styles.currentSubText}>(Current)</Text>}
                  </TouchableOpacity>
                  {weeks.length > 1 && (
                    <TouchableOpacity onPress={() => handleDeleteWeek(w.id)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <Ionicons name="close" size={12} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            <TouchableOpacity style={styles.addWeekDayBtn} onPress={handleAddWeek} activeOpacity={0.75}>
              <Ionicons name="add" size={13} color="#7c3aed" style={{ marginRight: 2 }} />
              <Text style={styles.addWeekDayBtnText}>Week</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Days Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
            {activeWeekDays.map(d => {
              const isSelected = selectedDayId === d.id;
              const isCurrentDay = activeProgram.currentDayId === d.id;
              return (
                <View key={d.id} style={styles.dayChipWrap}>
                  <TouchableOpacity
                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                    onPress={() => setSelectedDayId(d.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                      {d.name}
                    </Text>
                    {isCurrentDay && <Text style={styles.currentSubText}>(Current)</Text>}
                  </TouchableOpacity>
                  {activeWeekDays.length > 1 && (
                    <TouchableOpacity onPress={() => handleDeleteDay(d.id)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <Ionicons name="close" size={12} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            <TouchableOpacity style={styles.addWeekDayBtn} onPress={handleAddDay} activeOpacity={0.75}>
              <Ionicons name="add" size={13} color="#7c3aed" style={{ marginRight: 2 }} />
              <Text style={styles.addWeekDayBtnText}>Day</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ── 4. THE 7 TABS SCROLLBAR ────────────────────────────────────────── */}
      <View style={styles.tabsBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(t => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(t.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={t.icon as any}
                  size={15}
                  color={isActive ? '#7c3aed' : '#64748b'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── 5. MAIN TAB CONTENT ────────────────────────────────────────────── */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentInner,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 }
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPrograms(); }} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {!activeProgram ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="calendar-outline" size={44} color="#cbd5e1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No Program Selected</Text>
            <Text style={styles.emptySubtitle}>Tap "+ New Program" at the top to create a rehearsal schedule.</Text>
          </View>
        ) : (
          <>
            {/* ── TAB 1: DAILY SCHEDULE (TIMETABLE) ────────────────────────── */}
            {activeTab === 'schedule' && (
              <View>
                {/* KPI Cards */}
                <View style={styles.kpiRow}>
                  <View style={[styles.kpiCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                    <Text style={[styles.kpiVal, { color: '#059669' }]}>{rehearsedCount}</Text>
                    <Text style={[styles.kpiLabel, { color: '#047857' }]}>Rehearsed</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                    <Text style={[styles.kpiVal, { color: '#dc2626' }]}>{pendingCount}</Text>
                    <Text style={[styles.kpiLabel, { color: '#b91c1c' }]}>Pending</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
                    <Text style={[styles.kpiVal, { color: '#0f172a' }]}>{totalMinutes}m</Text>
                    <Text style={[styles.kpiLabel, { color: '#64748b' }]}>Total Time</Text>
                  </View>
                </View>

                {/* Section Title & Add Slot Button */}
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionHeaderTitle}>Timetable Itinerary</Text>
                    <Text style={styles.sectionHeaderSub}>Tap status pill to cycle Pending ➔ Rehearsed ➔ Break</Text>
                  </View>
                  <TouchableOpacity style={styles.addSlotBtn} onPress={handleOpenAddSlot} activeOpacity={0.8}>
                    <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                    <Text style={styles.addSlotBtnText}>+ Slot</Text>
                  </TouchableOpacity>
                </View>

                {currentDaySlots.length === 0 ? (
                  <View style={styles.emptyTabCard}>
                    <Text style={styles.emptyTabText}>No schedule slots added for this day yet.</Text>
                    <TouchableOpacity style={styles.emptyActionBtn} onPress={handleOpenAddSlot}>
                      <Text style={styles.emptyActionBtnText}>+ Add First Slot</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.timelineList}>
                    {currentDaySlots.map((slot, idx) => {
                      const isBreak = slot.status === 'break';
                      const isRehearsed = slot.status === 'rehearsed';
                      return (
                        <View key={slot.id} style={styles.timelineItem}>
                          {/* Left Column: Time */}
                          <View style={styles.timelineTimeCol}>
                            <Text style={styles.timelineTimeText}>{slot.time}</Text>
                          </View>

                          {/* Middle Column: Line & Bullet */}
                          <View style={styles.timelineAxis}>
                            <View
                              style={[
                                styles.timelineDot,
                                isBreak
                                  ? styles.dotBreak
                                  : isRehearsed
                                  ? styles.dotRehearsed
                                  : styles.dotPending,
                              ]}
                            />
                            {idx < currentDaySlots.length - 1 && <View style={styles.timelineLine} />}
                          </View>

                          {/* Right Column: Slot Card */}
                          <View
                            style={[
                              styles.timelineCard,
                              isBreak && styles.timelineCardBreak,
                            ]}
                          >
                            <View style={styles.timelineCardHeader}>
                              <Text
                                style={[
                                  styles.slotTitleText,
                                  isBreak && styles.slotTitleBreak,
                                ]}
                                numberOfLines={2}
                              >
                                {slot.title}
                              </Text>

                              <View style={styles.slotBadgeGroup}>
                                {slot.key && slot.key !== '—' && (
                                  <View style={styles.slotKeyBadge}>
                                    <Text style={styles.slotKeyBadgeText}>Key {slot.key}</Text>
                                  </View>
                                )}

                                <View style={styles.slotMinsBadge}>
                                  <Text style={styles.slotMinsBadgeText}>{slot.allotment}m</Text>
                                </View>

                                {/* 1-Tap Quick Status Toggle */}
                                <TouchableOpacity
                                  onPress={() => handleCycleSlotStatus(slot.id)}
                                  activeOpacity={0.7}
                                  style={[
                                    styles.statusPill,
                                    isBreak
                                      ? styles.statusPillBreak
                                      : isRehearsed
                                      ? styles.statusPillRehearsed
                                      : styles.statusPillPending,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusPillText,
                                      isBreak
                                        ? styles.statusPillTextBreak
                                        : isRehearsed
                                        ? styles.statusPillTextRehearsed
                                        : styles.statusPillTextPending,
                                    ]}
                                  >
                                    {isBreak ? 'Break' : isRehearsed ? 'Rehearsed' : 'Pending'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {slot.note ? (
                              <View style={styles.slotNoteBox}>
                                <Text style={styles.slotNoteText}>"{slot.note}"</Text>
                              </View>
                            ) : null}

                            <View style={styles.slotFooterActions}>
                              <TouchableOpacity onPress={() => handleOpenEditSlot(slot)} style={styles.slotActionBtn}>
                                <Ionicons name="pencil" size={13} color="#64748b" style={{ marginRight: 3 }} />
                                <Text style={styles.slotActionBtnText}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteSlot(slot.id)} style={styles.slotActionBtn}>
                                <Ionicons name="trash-outline" size={13} color="#ef4444" style={{ marginRight: 3 }} />
                                <Text style={[styles.slotActionBtnText, { color: '#ef4444' }]}>Delete</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ── TAB 2: NEW SONGS SUBMITTED ───────────────────────────────── */}
            {activeTab === 'new' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>New Songs Submitted ({(activeProgram.newSongs || []).length})</Text>
                  <TouchableOpacity style={styles.addSlotBtn} onPress={handleOpenAddGeneric} activeOpacity={0.8}>
                    <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                    <Text style={styles.addSlotBtnText}>+ Add Song</Text>
                  </TouchableOpacity>
                </View>

                {(activeProgram.newSongs || []).length === 0 ? (
                  <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No new songs submitted.</Text></View>
                ) : (
                  (activeProgram.newSongs || []).map(song => (
                    <View key={song.id} style={styles.standardCard}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardMainTitle}>{song.title}</Text>
                        <View style={styles.chipGroup}>
                          {song.key && <View style={styles.tinyBadge}><Text style={styles.tinyBadgeText}>Key: {song.key}</Text></View>}
                          {song.duration && <View style={styles.tinyBadge}><Text style={styles.tinyBadgeText}>{song.duration}</Text></View>}
                        </View>
                      </View>
                      <Text style={styles.cardMetaText}>
                        By: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{song.submittedBy || 'Minister'}</Text> • Date: {song.submittedOn || 'Recent'}
                      </Text>
                      <View style={styles.cardActionsRight}>
                        <TouchableOpacity onPress={() => handleDeleteGenericItem(song.id)} style={styles.cardDeleteBtn}>
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 3: CARRIED OVER SONGS ────────────────────────────────── */}
            {activeTab === 'carried' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>Carried Over Songs ({(activeProgram.carriedOver || []).length})</Text>
                  <TouchableOpacity style={styles.addSlotBtn} onPress={handleOpenAddGeneric} activeOpacity={0.8}>
                    <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                    <Text style={styles.addSlotBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>

                {(activeProgram.carriedOver || []).length === 0 ? (
                  <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No carried over songs.</Text></View>
                ) : (
                  (activeProgram.carriedOver || []).map(song => (
                    <View key={song.id} style={styles.standardCard}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardMainTitle}>{song.title}</Text>
                        <View style={styles.amberBadge}>
                          <Text style={styles.amberBadgeText}>{song.rehearsalCount || 1} prior rehearsals</Text>
                        </View>
                      </View>
                      <Text style={styles.cardMetaText}>
                        From: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{song.originalProgram || 'Previous'}</Text> • Key: {song.key || '—'}
                      </Text>
                      {song.reason ? <View style={styles.reasonQuote}><Text style={styles.reasonQuoteText}>"{song.reason}"</Text></View> : null}
                      <View style={styles.cardActionsRight}>
                        <TouchableOpacity onPress={() => handleDeleteGenericItem(song.id)} style={styles.cardDeleteBtn}>
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 4: SWAPPED SONGS ─────────────────────────────────────── */}
            {activeTab === 'swapped' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>Swapped Songs ({(activeProgram.swapped || []).length})</Text>
                  <TouchableOpacity style={styles.addSlotBtn} onPress={handleOpenAddGeneric} activeOpacity={0.8}>
                    <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                    <Text style={styles.addSlotBtnText}>+ Add Swap</Text>
                  </TouchableOpacity>
                </View>

                {(activeProgram.swapped || []).length === 0 ? (
                  <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No swapped songs.</Text></View>
                ) : (
                  (activeProgram.swapped || []).map(item => (
                    <View key={item.id} style={styles.standardCard}>
                      <View style={styles.swapTitleRow}>
                        <Text style={styles.swapOriginal}>{item.original}</Text>
                        <Ionicons name="arrow-forward" size={15} color="#94a3b8" style={{ marginHorizontal: 6 }} />
                        <Text style={styles.swapReplacement}>{item.replacement}</Text>
                      </View>
                      <Text style={styles.cardMetaText}>
                        Swapped by: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.swappedBy || 'Director'}</Text> • Date: {item.swappedOn || 'Recent'}
                      </Text>
                      {item.reason ? <View style={styles.reasonQuote}><Text style={styles.reasonQuoteText}>"{item.reason}"</Text></View> : null}
                      <View style={styles.cardActionsRight}>
                        <TouchableOpacity onPress={() => handleDeleteGenericItem(item.id)} style={styles.cardDeleteBtn}>
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 5: NAME CHANGES ──────────────────────────────────────── */}
            {activeTab === 'renamed' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>Song Name Changes ({(activeProgram.nameChanges || []).length})</Text>
                  <TouchableOpacity style={styles.addSlotBtn} onPress={handleOpenAddGeneric} activeOpacity={0.8}>
                    <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                    <Text style={styles.addSlotBtnText}>+ Add Change</Text>
                  </TouchableOpacity>
                </View>

                {(activeProgram.nameChanges || []).length === 0 ? (
                  <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No song name changes.</Text></View>
                ) : (
                  (activeProgram.nameChanges || []).map(item => (
                    <View key={item.id} style={styles.standardCard}>
                      <View style={styles.swapTitleRow}>
                        <Text style={styles.nameChangeOld}>{item.from}</Text>
                        <Ionicons name="arrow-forward" size={15} color="#7c3aed" style={{ marginHorizontal: 6 }} />
                        <Text style={styles.nameChangeNew}>{item.to}</Text>
                      </View>
                      <Text style={styles.cardMetaText}>
                        Changed by: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.changedBy || 'Admin'}</Text> • Date: {item.changedOn || 'Recent'}
                      </Text>
                      {item.reason ? <View style={styles.reasonQuote}><Text style={styles.reasonQuoteText}>"{item.reason}"</Text></View> : null}
                      <View style={styles.cardActionsRight}>
                        <TouchableOpacity onPress={() => handleDeleteGenericItem(item.id)} style={styles.cardDeleteBtn}>
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 6: INVALID SONGS ─────────────────────────────────────── */}
            {activeTab === 'invalid' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>Invalid Songs ({(activeProgram.invalidSongs || []).length})</Text>
                  <TouchableOpacity style={styles.addSlotBtn} onPress={handleOpenAddGeneric} activeOpacity={0.8}>
                    <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                    <Text style={styles.addSlotBtnText}>+ Add Invalid</Text>
                  </TouchableOpacity>
                </View>

                {(activeProgram.invalidSongs || []).length === 0 ? (
                  <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No invalid songs.</Text></View>
                ) : (
                  (activeProgram.invalidSongs || []).map(item => (
                    <View key={item.id} style={[styles.standardCard, styles.redBorderCard]}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.invalidTitle}>{item.title}</Text>
                        <View style={styles.redBadge}>
                          <Text style={styles.redBadgeText}>{item.invalidatedBy || 'Invalid'}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardMetaText}>
                        {item.replacedBy ? `Replaced by: ${item.replacedBy} • ` : ''}Date: {item.date || 'Recent'}
                      </Text>
                      {item.reason ? <View style={styles.reasonQuote}><Text style={styles.reasonQuoteText}>"{item.reason}"</Text></View> : null}
                      <View style={styles.cardActionsRight}>
                        <TouchableOpacity onPress={() => handleDeleteGenericItem(item.id)} style={styles.cardDeleteBtn}>
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 7: SUBMITTER ELIGIBILITY ─────────────────────────────── */}
            {activeTab === 'eligibility' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>Submission Eligibility</Text>
                  <TouchableOpacity style={styles.addSlotBtn} onPress={handleOpenAddGeneric} activeOpacity={0.8}>
                    <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                    <Text style={styles.addSlotBtnText}>+ Add Member</Text>
                  </TouchableOpacity>
                </View>

                {/* Filter Switcher */}
                <View style={styles.eligibilitySwitcher}>
                  <TouchableOpacity
                    style={[styles.eligPill, eligibilityFilter === 'eligible' && styles.eligPillActive]}
                    onPress={() => setEligibilityFilter('eligible')}
                  >
                    <Text style={[styles.eligPillText, eligibilityFilter === 'eligible' && styles.eligPillTextActive]}>
                      Eligible ({(activeProgram.submitters || []).filter(s => !s.isBlocked).length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.eligPill, eligibilityFilter === 'ineligible' && styles.eligPillDangerActive]}
                    onPress={() => setEligibilityFilter('ineligible')}
                  >
                    <Text style={[styles.eligPillText, eligibilityFilter === 'ineligible' && styles.eligPillDangerTextActive]}>
                      Ineligible ({(activeProgram.submitters || []).filter(s => s.isBlocked).length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {(activeProgram.submitters || []).filter(s => eligibilityFilter === 'eligible' ? !s.isBlocked : Boolean(s.isBlocked)).map(sub => {
                  const used = sub.submissions || 0;
                  const total = sub.quota || 1;
                  const pct = Math.min(100, Math.round((used / total) * 100));
                  const isMax = used >= total;
                  return (
                    <View key={sub.id} style={[styles.standardCard, sub.isBlocked && styles.redBorderCard]}>
                      <View style={styles.cardTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardMainTitle}>{sub.name}</Text>
                          <Text style={styles.cardSubRole}>{sub.role || 'Vocalist'}</Text>
                        </View>
                        {!sub.isBlocked ? (
                          <View style={styles.quotaPill}>
                            <Text style={styles.quotaPillText}>Usage: <Text style={{ fontWeight: '800', color: isMax ? '#ef4444' : '#7c3aed' }}>{used}</Text> / {total}</Text>
                          </View>
                        ) : (
                          <View style={styles.redBadge}>
                            <Text style={styles.redBadgeText}>Blocked since {sub.since || 'Recent'}</Text>
                          </View>
                        )}
                      </View>

                      {!sub.isBlocked && (
                        <View style={styles.progressBarTrack}>
                          <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: isMax ? '#ef4444' : '#10b981' }]} />
                        </View>
                      )}

                      {sub.reason ? <View style={styles.reasonQuote}><Text style={styles.reasonQuoteText}>"{sub.reason}"</Text></View> : null}

                      <View style={styles.cardActionsRight}>
                        <TouchableOpacity onPress={() => handleDeleteGenericItem(sub.id)} style={styles.cardDeleteBtn}>
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── MODAL: CREATE PROGRAM ──────────────────────────────────────────── */}
      <Modal visible={showCreateProgramModal} transparent animationType="fade" onRequestClose={() => setShowCreateProgramModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Schedule Program</Text>
            <Text style={styles.modalSub}>Create a new timetable itinerary board</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. AUGUST PRAISE FESTIVAL"
              placeholderTextColor="#94a3b8"
              value={newProgramName}
              onChangeText={setNewProgramName}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateProgramModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateProgram}>
                <Text style={styles.modalSubmitBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: RENAME PROGRAM ──────────────────────────────────────────── */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Schedule</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Program Name"
              placeholderTextColor="#94a3b8"
              value={renameProgramName}
              onChangeText={setRenameProgramName}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRenameModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRenameProgram}>
                <Text style={styles.modalSubmitBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: ADD / EDIT DAILY SLOT ───────────────────────────────────── */}
      <Modal visible={showSlotModal} transparent animationType="slide" onRequestClose={() => setShowSlotModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editingSlotId ? 'Edit Schedule Slot' : 'Add Timetable Slot'}</Text>
            <Text style={styles.sheetSub}>{weeks.find(w => w.id === selectedWeekId)?.name || 'Week 1'} • {activeWeekDays.find(d => d.id === selectedDayId)?.name || 'Day 1'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.formRowSplit}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Start Time (e.g. 09:00)</Text>
                  <TextInput style={styles.sheetInput} value={slotTime} onChangeText={setSlotTime} placeholder="09:00" placeholderTextColor="#94a3b8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Allotment (Mins)</Text>
                  <TextInput style={styles.sheetInput} value={slotAllotment} onChangeText={setSlotAllotment} keyboardType="numeric" placeholder="15" placeholderTextColor="#94a3b8" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Song or Session Title</Text>
              <TextInput style={styles.sheetInput} value={slotTitle} onChangeText={setSlotTitle} placeholder="e.g. Praise Medley / Vocal Warmup" placeholderTextColor="#94a3b8" />

              <Text style={styles.inputLabel}>Key (Optional)</Text>
              <TextInput style={styles.sheetInput} value={slotKey} onChangeText={setSlotKey} placeholder="e.g. C, F#, Eb" placeholderTextColor="#94a3b8" />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusSelectRow}>
                {(['not-rehearsed', 'rehearsed', 'break'] as const).map(s => {
                  const isSel = slotStatus === s;
                  const label = s === 'rehearsed' ? 'Rehearsed' : s === 'break' ? 'Break' : 'Pending';
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusSelectPill, isSel && styles.statusSelectPillActive]}
                      onPress={() => setSlotStatus(s)}
                    >
                      <Text style={[styles.statusSelectPillText, isSel && styles.statusSelectPillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Notes / Instructions</Text>
              <TextInput
                style={[styles.sheetInput, { height: 64, textAlignVertical: 'top' }]}
                value={slotNote}
                onChangeText={setSlotNote}
                placeholder="Vocal guidance, horn cue, modulation, etc."
                placeholderTextColor="#94a3b8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSlotModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveSlot}>
                <Text style={styles.modalSubmitBtnText}>Save Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: GENERIC ITEM ADD (FOR TABS 2-7) ────────────────────────── */}
      <Modal visible={showGenericModal} transparent animationType="slide" onRequestClose={() => setShowGenericModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {activeTab === 'new' ? 'Add New Song Submission' :
               activeTab === 'carried' ? 'Add Carried Over Song' :
               activeTab === 'swapped' ? 'Record Swapped Song' :
               activeTab === 'renamed' ? 'Record Name Change' :
               activeTab === 'invalid' ? 'Add Invalid Song' : 'Manage Submitter'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {activeTab === 'new' && (
                <>
                  <Text style={styles.inputLabel}>Song Title</Text>
                  <TextInput style={styles.sheetInput} value={genericField1} onChangeText={setGenericField1} placeholder="Title" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Key</Text>
                  <TextInput style={styles.sheetInput} value={genericField2} onChangeText={setGenericField2} placeholder="Key (e.g. C, Ab)" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Duration</Text>
                  <TextInput style={styles.sheetInput} value={genericField3} onChangeText={setGenericField3} placeholder="e.g. 5:20" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Submitted By</Text>
                  <TextInput style={styles.sheetInput} value={genericField4} onChangeText={setGenericField4} placeholder="Minister name" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'carried' && (
                <>
                  <Text style={styles.inputLabel}>Song Title</Text>
                  <TextInput style={styles.sheetInput} value={genericField1} onChangeText={setGenericField1} placeholder="Title" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Prior Rehearsal Count</Text>
                  <TextInput style={styles.sheetInput} value={genericField2} onChangeText={setGenericField2} keyboardType="numeric" placeholder="1" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Original Program Name</Text>
                  <TextInput style={styles.sheetInput} value={genericField3} onChangeText={setGenericField3} placeholder="Program" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Key</Text>
                  <TextInput style={styles.sheetInput} value={genericField4} onChangeText={setGenericField4} placeholder="Key" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Reason for Carrying Over</Text>
                  <TextInput style={styles.sheetInput} value={genericField5} onChangeText={setGenericField5} placeholder="e.g. More practice needed" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'swapped' && (
                <>
                  <Text style={styles.inputLabel}>Original Song Title</Text>
                  <TextInput style={styles.sheetInput} value={genericField1} onChangeText={setGenericField1} placeholder="Original" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Replacement Song Title</Text>
                  <TextInput style={styles.sheetInput} value={genericField2} onChangeText={setGenericField2} placeholder="Replacement" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Swapped By</Text>
                  <TextInput style={styles.sheetInput} value={genericField3} onChangeText={setGenericField3} placeholder="Director name" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Reason</Text>
                  <TextInput style={styles.sheetInput} value={genericField5} onChangeText={setGenericField5} placeholder="Reason for swap" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'renamed' && (
                <>
                  <Text style={styles.inputLabel}>Original Title</Text>
                  <TextInput style={styles.sheetInput} value={genericField1} onChangeText={setGenericField1} placeholder="From" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>New Confirmed Title</Text>
                  <TextInput style={styles.sheetInput} value={genericField2} onChangeText={setGenericField2} placeholder="To" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Changed By</Text>
                  <TextInput style={styles.sheetInput} value={genericField3} onChangeText={setGenericField3} placeholder="Author or Director" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Reason</Text>
                  <TextInput style={styles.sheetInput} value={genericField5} onChangeText={setGenericField5} placeholder="Reason" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'invalid' && (
                <>
                  <Text style={styles.inputLabel}>Invalid Song Title</Text>
                  <TextInput style={styles.sheetInput} value={genericField1} onChangeText={setGenericField1} placeholder="Title" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Invalidated By</Text>
                  <TextInput style={styles.sheetInput} value={genericField2} onChangeText={setGenericField2} placeholder="HQ Admin / Reviewer" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Replaced By (Optional)</Text>
                  <TextInput style={styles.sheetInput} value={genericField3} onChangeText={setGenericField3} placeholder="Replacement song if any" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Reason</Text>
                  <TextInput style={styles.sheetInput} value={genericField5} onChangeText={setGenericField5} placeholder="Reason for invalidation" placeholderTextColor="#94a3b8" />
                </>
              )}

              {activeTab === 'eligibility' && (
                <>
                  <Text style={styles.inputLabel}>Submitter Name</Text>
                  <TextInput style={styles.sheetInput} value={genericField1} onChangeText={setGenericField1} placeholder="Full Name" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Role</Text>
                  <TextInput style={styles.sheetInput} value={genericField2} onChangeText={setGenericField2} placeholder="e.g. Vocal Lead, Tenor" placeholderTextColor="#94a3b8" />
                  <Text style={styles.inputLabel}>Quota Limit</Text>
                  <TextInput style={styles.sheetInput} value={genericField4} onChangeText={setGenericField4} keyboardType="numeric" placeholder="3" placeholderTextColor="#94a3b8" />
                  <TouchableOpacity
                    style={[styles.blockToggleBtn, genericBool && styles.blockToggleBtnActive]}
                    onPress={() => setGenericBool(!genericBool)}
                  >
                    <Ionicons name={genericBool ? 'ban' : 'checkmark-circle'} size={16} color={genericBool ? '#ef4444' : '#10b981'} style={{ marginRight: 6 }} />
                    <Text style={[styles.blockToggleBtnText, genericBool && { color: '#ef4444' }]}>
                      {genericBool ? 'Blocked from submitting' : 'Eligible to submit'}
                    </Text>
                  </TouchableOpacity>
                  {genericBool && (
                    <>
                      <Text style={styles.inputLabel}>Block Reason</Text>
                      <TextInput style={styles.sheetInput} value={genericField5} onChangeText={setGenericField5} placeholder="e.g. Exceeded quota limit" placeholderTextColor="#94a3b8" />
                    </>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowGenericModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveGeneric}>
                <Text style={styles.modalSubmitBtnText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center' },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  historyPillActive: { backgroundColor: '#fef3c7' },
  historyPillText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  historyPillTextActive: { color: '#b45309' },

  newProgramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  newProgramBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },

  programBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  programScroll: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noProgramsText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', paddingVertical: 4 },
  programPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  programPillSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  programPillText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  programPillTextSelected: { color: '#ffffff' },
  currentTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 6,
  },
  currentTagSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  currentTagText: { fontSize: 9, fontWeight: '800', color: '#b45309' },
  currentTagTextSelected: { color: '#ffffff' },

  programActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingTop: 2,
  },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBtnSmallText: { fontSize: 11, fontWeight: '700', color: '#b45309' },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  weeksDaysContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
    gap: 6,
  },
  weeksScroll: { paddingHorizontal: 16, gap: 14, flexDirection: 'row', alignItems: 'center' },
  weekTabWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  weekTab: {
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekTabActive: { borderBottomColor: '#7c3aed' },
  weekTabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  weekTabTextActive: { color: '#7c3aed', fontWeight: '800' },
  currentSubText: { fontSize: 9, fontWeight: '800', color: '#7c3aed' },

  daysScroll: { paddingHorizontal: 16, gap: 6, flexDirection: 'row', alignItems: 'center' },
  dayChipWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dayChipActive: { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#7c3aed' },
  dayChipText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  dayChipTextActive: { color: '#7c3aed' },
  addWeekDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  addWeekDayBtnText: { fontSize: 10, fontWeight: '700', color: '#7c3aed' },

  tabsBarWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabsScroll: { paddingHorizontal: 12, gap: 2, flexDirection: 'row' },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: '#7c3aed' },
  tabButtonText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabButtonTextActive: { color: '#7c3aed', fontWeight: '800' },

  content: { flex: 1, backgroundColor: '#f8fafc' },
  contentInner: { padding: 16 },

  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', maxWidth: 280 },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiVal: { fontSize: 18, fontWeight: '800' },
  kpiLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  sectionHeaderSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addSlotBtnText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },

  emptyTabCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTabText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  emptyActionBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
  },
  emptyActionBtnText: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },

  // Timeline
  timelineList: { gap: 0 },
  timelineItem: { flexDirection: 'row' },
  timelineTimeCol: { width: 48, alignItems: 'flex-end', paddingRight: 10, paddingTop: 10 },
  timelineTimeText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  timelineAxis: { alignItems: 'center', marginRight: 10 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 12, borderWidth: 2, borderColor: '#ffffff' },
  dotPending: { backgroundColor: '#ef4444' },
  dotRehearsed: { backgroundColor: '#10b981' },
  dotBreak: { backgroundColor: '#94a3b8' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },

  timelineCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineCardBreak: { backgroundColor: '#f8fafc', borderStyle: 'dashed' },
  timelineCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  slotTitleText: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  slotTitleBreak: { color: '#64748b', fontStyle: 'italic', fontWeight: '600' },
  slotBadgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  slotKeyBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotKeyBadgeText: { fontSize: 10, fontWeight: '700', color: '#4f46e5' },
  slotMinsBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotMinsBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },

  statusPill: { paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6 },
  statusPillPending: { backgroundColor: '#fee2e2' },
  statusPillRehearsed: { backgroundColor: '#dcfce7' },
  statusPillBreak: { backgroundColor: '#f1f5f9' },
  statusPillText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  statusPillTextPending: { color: '#b91c1c' },
  statusPillTextRehearsed: { color: '#15803d' },
  statusPillTextBreak: { color: '#64748b' },

  slotNoteBox: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#7c3aed',
  },
  slotNoteText: { fontSize: 11, color: '#475569', fontStyle: 'italic' },
  slotFooterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  slotActionBtn: { flexDirection: 'row', alignItems: 'center' },
  slotActionBtnText: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  // Standard Cards
  standardCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  redBorderCard: { borderColor: '#fca5a5', borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardMainTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  cardSubRole: { fontSize: 11, color: '#64748b', marginTop: 1 },
  chipGroup: { flexDirection: 'row', gap: 4 },
  tinyBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  tinyBadgeText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  amberBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 6 },
  amberBadgeText: { fontSize: 10, fontWeight: '700', color: '#b45309' },
  redBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 6 },
  redBadgeText: { fontSize: 10, fontWeight: '700', color: '#dc2626' },
  quotaPill: { backgroundColor: '#f8fafc', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  quotaPillText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  progressBarTrack: { height: 5, backgroundColor: '#f1f5f9', borderRadius: 2.5, overflow: 'hidden', marginTop: 8 },
  progressBarFill: { height: 5, borderRadius: 2.5 },
  cardMetaText: { fontSize: 11, color: '#64748b', marginTop: 4 },
  reasonQuote: { marginTop: 6, backgroundColor: '#f8fafc', padding: 6, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: '#94a3b8' },
  reasonQuoteText: { fontSize: 11, color: '#475569', fontStyle: 'italic' },
  cardActionsRight: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  cardDeleteBtn: { padding: 4 },

  swapTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  swapOriginal: { fontSize: 13, color: '#ef4444', textDecorationLine: 'line-through' },
  swapReplacement: { fontSize: 14, fontWeight: '700', color: '#059669' },
  nameChangeOld: { fontSize: 13, color: '#64748b', fontStyle: 'italic' },
  nameChangeNew: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  invalidTitle: { fontSize: 14, fontWeight: '700', color: '#ef4444', textDecorationLine: 'line-through', flex: 1 },

  eligibilitySwitcher: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  eligPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  eligPillActive: { backgroundColor: '#f5f3ff', borderColor: '#7c3aed' },
  eligPillDangerActive: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  eligPillText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  eligPillTextActive: { color: '#7c3aed', fontWeight: '800' },
  eligPillDangerTextActive: { color: '#dc2626', fontWeight: '800' },

  // Modals & Bottom Sheets
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  modalSub: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 12 },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 16,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 14 },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalCancelBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
  },
  modalSubmitBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sheetSub: { fontSize: 12, color: '#7c3aed', fontWeight: '700', marginTop: 1, marginBottom: 12 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4, marginTop: 8 },
  sheetInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  formRowSplit: { flexDirection: 'row', gap: 10 },
  statusSelectRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statusSelectPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  statusSelectPillActive: { backgroundColor: '#7c3aed' },
  statusSelectPillText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  statusSelectPillTextActive: { color: '#ffffff' },

  blockToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginTop: 10,
  },
  blockToggleBtnActive: { backgroundColor: '#fee2e2' },
  blockToggleBtnText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
});
