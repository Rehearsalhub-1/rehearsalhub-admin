import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { customAlert } from '../context/AlertContext';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  category?: 'rehearsal' | 'program' | 'praisenight' | 'recording' | 'deadline';
  zoneId?: string;
}

type CategoryFilter = 'all' | 'rehearsal' | 'program' | 'recording' | 'deadline';
type DateFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'upcoming';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('1:00 PM');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<'rehearsal' | 'program' | 'praisenight' | 'recording' | 'deadline'>('rehearsal');
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const zoneParam = isChurchMode ? undefined : activeZone?.id;
      const res = await api.calendar.getEvents(zoneParam).catch(() => ({ data: [] }));
      setEvents(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('[Calendar] fetch error:', e);
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isChurchMode]);

  useEffect(() => {
    setLoading(true);
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenCreate = () => {
    setEditingEventId(null);
    setTitle('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setStartTime('10:00 AM');
    setEndTime('1:00 PM');
    setLocation('Main Rehearsal Sanctuary');
    setCategory('rehearsal');
    setModalVisible(true);
  };

  const handleOpenEdit = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    setTitle(evt.title || '');
    setEventDate(evt.date ? evt.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setStartTime(evt.startTime || '10:00 AM');
    setEndTime(evt.endTime || '1:00 PM');
    setLocation(evt.location || '');
    setCategory(evt.category || 'rehearsal');
    setModalVisible(true);
  };

  const handleSaveEvent = async () => {
    if (!title.trim()) {
      customAlert('Missing Title', 'Please enter an event title.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        date: eventDate.trim() || new Date().toISOString().split('T')[0],
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        location: location.trim() || 'Main Rehearsal Hall',
        category,
        zoneId: activeZone?.id,
      };

      if (editingEventId) {
        await api.calendar.update(editingEventId, payload).catch(() => {});
        setEvents(prev => prev.map(e => (e.id === editingEventId ? { ...e, ...payload } : e)));
      } else {
        const res = await api.calendar.create(payload).catch(() => ({ data: { id: `evt_${Date.now()}` } }));
        const newEvt: CalendarEvent = {
          id: res?.data?.id || `evt_${Date.now()}`,
          ...payload,
        };
        setEvents(prev => [newEvt, ...prev]);
      }

      setModalVisible(false);
      customAlert('Saved', editingEventId ? 'Event updated.' : 'Event scheduled.');
    } catch (e: any) {
      customAlert('Error', e?.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = (id: string, eventTitle: string) => {
    customAlert('Delete Event', `Delete "${eventTitle}" from the calendar?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.calendar.delete(id).catch(() => {});
            setEvents(prev => prev.filter(e => e.id !== id));
          } catch (e: any) {
            customAlert('Error', e?.message || 'Failed to delete event');
          }
        },
      },
    ]);
  };

  function getCategoryColor(cat?: string) {
    switch (cat) {
      case 'program':
      case 'praisenight': return '#7c3aed';
      case 'recording':   return '#d97706';
      case 'deadline':    return '#ef4444';
      default:            return '#2563eb';
    }
  }

  function getCategoryLabel(cat?: string) {
    switch (cat) {
      case 'program':
      case 'praisenight': return 'Program';
      case 'rehearsal':   return 'Rehearsal';
      case 'recording':   return 'Recording';
      case 'deadline':    return 'Deadline';
      default:            return 'Rehearsal';
    }
  }

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const in7Days = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];

    return events.filter(e => {
      // Category filter
      if (selectedCategory !== 'all') {
        const cat = e.category === 'praisenight' ? 'program' : e.category || 'rehearsal';
        if (cat !== selectedCategory) return false;
      }

      // Date filter
      const eDate = e.date ? e.date.split('T')[0] : '';
      if (selectedDateFilter === 'today' && eDate !== todayStr) return false;
      if (selectedDateFilter === 'tomorrow' && eDate !== tomorrow) return false;
      if (selectedDateFilter === 'week' && (eDate < todayStr || eDate > in7Days)) return false;
      if (selectedDateFilter === 'upcoming' && eDate < todayStr) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (e.title || '').toLowerCase().includes(q);
        const matchesLoc = (e.location || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesLoc) return false;
      }

      return true;
    });
  }, [events, selectedCategory, selectedDateFilter, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length, rehearsal: 0, program: 0, recording: 0, deadline: 0 };
    events.forEach(e => {
      const cat = e.category === 'praisenight' ? 'program' : e.category || 'rehearsal';
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [events]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ZoneHeader title={isChurchMode ? 'Church Calendar' : 'Rehearsal Calendar'} />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ZoneHeader
        title={isChurchMode ? 'Church Calendar' : 'Rehearsal Calendar'}
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleOpenCreate}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 2 }} />
            <Text style={styles.addBtnText}>Schedule</Text>
          </TouchableOpacity>
        }
      />

      {/* ── FILTER & SEARCH SECTION ────────────────────────────────────────── */}
      <View style={styles.filterSection}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, rehearsals, venues..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Date Presets Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: 'Today' },
            { id: 'tomorrow', label: 'Tomorrow' },
            { id: 'week', label: 'This Week' },
            { id: 'upcoming', label: 'Upcoming' },
          ].map(p => {
            const isSel = selectedDateFilter === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.presetPill, isSel && styles.presetPillActive]}
                onPress={() => setSelectedDateFilter(p.id as DateFilter)}
                activeOpacity={0.75}
              >
                <Text style={[styles.presetPillText, isSel && styles.presetPillTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Category Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsRow}>
          {(['all', 'rehearsal', 'program', 'recording', 'deadline'] as const).map(cat => {
            const isSel = selectedCategory === cat;
            const label = cat === 'all' ? `All (${categoryCounts.all})` : `${getCategoryLabel(cat)} (${categoryCounts[cat] || 0})`;
            const color = getCategoryColor(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  isSel && { backgroundColor: cat === 'all' ? '#0f172a' : color, borderColor: cat === 'all' ? '#0f172a' : color },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipText, isSel && { color: '#ffffff', fontWeight: '800' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── EVENTS LIST ────────────────────────────────────────────────────── */}
      <FlatList
        data={filteredEvents}
        keyExtractor={i => i.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} tintColor={Colors.accent} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerEmpty}>
              <ActivityIndicator size="large" color={Colors.accent} />
            </View>
          ) : (
            <View style={styles.centerEmpty}>
              <Ionicons name="calendar-outline" size={44} color="#cbd5e1" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>No scheduled events found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your filter or tap "Schedule" to create a new session.</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenCreate}>
                <Text style={styles.emptyAddBtnText}>+ Schedule Event</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => {
          const catColor = getCategoryColor(item.category);
          const parsedDate = item.date ? new Date(item.date) : new Date();
          const monthStr = parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
          const dayNum = parsedDate.getDate();
          const weekdayStr = parsedDate.toLocaleDateString('en-US', { weekday: 'short' });

          return (
            <View style={styles.eventCard}>
              {/* Date Box */}
              <View style={[styles.dateBox, { borderColor: catColor + '30', backgroundColor: catColor + '10' }]}>
                <Text style={[styles.dateBoxMonth, { color: catColor }]}>{monthStr}</Text>
                <Text style={[styles.dateBoxDay, { color: catColor }]}>{dayNum}</Text>
                <Text style={styles.dateBoxWeekday}>{weekdayStr}</Text>
              </View>

              {/* Event Content */}
              <View style={styles.eventContent}>
                <View style={styles.eventCardHeader}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={[styles.catBadge, { backgroundColor: catColor + '15', borderColor: catColor + '30' }]}>
                    <Text style={[styles.catBadgeText, { color: catColor }]}>{getCategoryLabel(item.category)}</Text>
                  </View>
                </View>

                {/* Time & Venue */}
                <View style={styles.metaRow}>
                  {item.startTime && (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>
                        {item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}
                      </Text>
                    </View>
                  )}
                  {item.location && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleOpenEdit(item)}>
                    <Ionicons name="pencil" size={13} color="#64748b" style={{ marginRight: 3 }} />
                    <Text style={styles.cardActionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleDeleteEvent(item.id, item.title)}>
                    <Ionicons name="trash-outline" size={13} color="#ef4444" style={{ marginRight: 3 }} />
                    <Text style={[styles.cardActionBtnText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ── MODAL: SCHEDULE / EDIT EVENT ───────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior='padding'
          style={{ flex: 1 }}
        >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingEventId ? 'Edit Calendar Event' : 'Schedule New Event'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Event Title</Text>
              <TextInput
                style={styles.modalInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Full Rehearsal / Live Audio Shoot"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={eventDate}
                onChangeText={setEventDate}
                placeholder={new Date().toISOString().split('T')[0]}
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.splitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Start Time</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="10:00 AM"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>End Time</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="1:00 PM"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Venue / Location</Text>
              <TextInput
                style={styles.modalInput}
                value={location}
                onChangeText={setLocation}
                placeholder="Main Hall / Studio B"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Event Category</Text>
              <View style={styles.catOptionRow}>
                {(['rehearsal', 'program', 'recording', 'deadline'] as const).map(cat => {
                  const isSel = category === cat;
                  const catCol = getCategoryColor(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOptionPill,
                        isSel && { backgroundColor: catCol, borderColor: catCol },
                      ]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.catOptionText, isSel && { color: '#ffffff', fontWeight: '800' }]}>
                        {getCategoryLabel(cat).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveEvent} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>{editingEventId ? 'Update Event' : 'Save Event'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  filterSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: { flex: 1, fontSize: 12, color: '#0f172a' },

  presetsRow: { gap: 6, flexDirection: 'row', alignItems: 'center' },
  presetPill: {
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetPillActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  presetPillText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  presetPillTextActive: { color: '#ffffff', fontWeight: '700' },

  categoryChipsRow: { gap: 6, flexDirection: 'row', alignItems: 'center' },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },

  listContent: { padding: 16, gap: 10 },

  centerEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', maxWidth: 280, marginBottom: 14 },
  emptyAddBtn: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyAddBtnText: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  dateBox: {
    width: 50,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dateBoxMonth: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dateBoxDay: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  dateBoxWeekday: { fontSize: 9.5, fontWeight: '600', color: '#64748b' },

  eventContent: { flex: 1 },
  eventCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  catBadgeText: { fontSize: 10, fontWeight: '700' },

  metaRow: { marginTop: 6, gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  cardActionBtn: { flexDirection: 'row', alignItems: 'center' },
  cardActionBtnText: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  closeBtn: { padding: 4 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4, marginTop: 8 },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  splitRow: { flexDirection: 'row', gap: 10 },
  catOptionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catOptionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catOptionText: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  modalBtnRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 16 },
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
});
