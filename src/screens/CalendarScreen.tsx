import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Modal, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  category?: 'rehearsal' | 'praisenight' | 'recording' | 'deadline';
  zoneId?: string;
}

export default function CalendarScreen() {
  const { activeZone } = useZoneContext();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add event modal state
  const [createModal, setCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<'rehearsal' | 'praisenight' | 'recording' | 'deadline'>('rehearsal');
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const res = await apiClient.get<{ success: boolean; data: CalendarEvent[] }>(`/upcoming-events${zoneParam}`).catch(() => ({ data: [] }));
      const eventList = Array.isArray(res.data) ? res.data : [];
      setEvents(eventList);
    } catch (e) {
      console.error('[Calendar] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchEvents();
  }, [fetchEvents]);

  async function handleCreateEvent() {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter an event title.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/upcoming-events', {
        title: title.trim(),
        date: eventDate.trim() || new Date().toISOString(),
        location: location.trim() || 'Main Rehearsal Hall',
        category,
        zoneId: activeZone?.id || 'all',
      });
      setCreateModal(false);
      setTitle('');
      setEventDate('');
      setLocation('');
      Alert.alert('Event Added', 'Calendar event created.');
      fetchEvents();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  function getCategoryColor(cat?: string) {
    switch (cat) {
      case 'praisenight': return Colors.accentBright;
      case 'recording':   return Colors.warning;
      case 'deadline':    return Colors.danger;
      default:            return Colors.info;
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Calendar" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Calendar" />

      {/* Top Bar with Add Button */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.heading}>Rehearsals & Events</Text>
          <Text style={styles.sub}>Scheduled Praise Nights, sessions, and vocal deadlines</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No scheduled calendar events found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const catColor = getCategoryColor(item.category);
          return (
            <View style={styles.eventCard}>
              <View style={[styles.categoryStrip, { backgroundColor: catColor }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.catBadge, { borderColor: catColor + '50', backgroundColor: catColor + '15' }]}>
                    <Text style={[styles.catBadgeText, { color: catColor }]}>{item.category || 'Rehearsal'}</Text>
                  </View>
                </View>
                <Text style={styles.eventDate}>
                  {item.date ? new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                </Text>
                {item.location && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.eventLocation}>{item.location}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Add Event Modal */}
      <Modal visible={createModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Calendar Event</Text>
              <TouchableOpacity onPress={() => setCreateModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Event Title</Text>
            <TextInput
              style={styles.modalInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Praise Night #19 Rehearsal"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={eventDate}
              onChangeText={setEventDate}
              placeholder={new Date().toISOString().split('T')[0]}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Venue / Location</Text>
            <TextInput
              style={styles.modalInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Main Sanctuary / Virtual Zoom"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Event Category</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {(['rehearsal', 'praisenight', 'recording', 'deadline'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catOptionBtn,
                    category === cat && { borderColor: Colors.accent, backgroundColor: Colors.accentSubtle },
                  ]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catOptionText, category === cat && { color: Colors.accentBright, fontWeight: '700' }]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, saving && { opacity: 0.6 }]}
              onPress={handleCreateEvent}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Save Event</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 13 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  heading: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    padding: 14,
    gap: 12,
  },
  categoryStrip: {
    width: 4,
    borderRadius: 2,
    marginVertical: -2,
  },
  eventTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  eventDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  eventLocation: {
    color: Colors.textMuted,
    fontSize: 11,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  catOptionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  catOptionText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
