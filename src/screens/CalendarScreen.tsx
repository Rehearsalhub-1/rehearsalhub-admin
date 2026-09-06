import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      case 'praisenight': return '#7c3aed';
      case 'recording':   return '#d97706';
      case 'deadline':    return '#e11d48';
      default:            return '#2563eb';
    }
  }

  function getCategoryLabel(cat?: string) {
    switch (cat) {
      case 'praisenight': return 'Program';
      case 'rehearsal':   return 'Rehearsal';
      case 'recording':   return 'Recording';
      case 'deadline':    return 'Deadline';
      default:            return 'Program';
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Rehearsal Calendar" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader
        title="Rehearsal Calendar"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setCreateModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#fff" style={{ marginRight: 3 }} />
            <Text style={styles.addBtnText}>Schedule</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter / Count Toolbar */}
      <View style={styles.topRow}>
        <Text style={styles.countText}>{events.length} scheduled rehearsals & deadlines</Text>
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
                  <View style={[styles.catBadge, { borderColor: catColor + '30', backgroundColor: catColor + '12' }]}>
                    <Text style={[styles.catBadgeText, { color: catColor }]}>{getCategoryLabel(item.category)}</Text>
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
              <Text style={styles.modalTitle}>Schedule Event</Text>
              <TouchableOpacity onPress={() => setCreateModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Event Title</Text>
            <TextInput
              style={styles.modalInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Special Program Rehearsal"
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
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(['rehearsal', 'praisenight', 'recording', 'deadline'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catOptionBtn,
                    category === cat && styles.catOptionBtnActive,
                  ]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catOptionText, category === cat && styles.catOptionTextActive]}>
                    {getCategoryLabel(cat).toUpperCase()}
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
  emptyText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  heading: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    padding: 14,
    gap: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryStrip: {
    width: 4,
    borderRadius: 4,
    marginVertical: -2,
  },
  eventTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  eventLocation: {
    color: Colors.textMuted,
    fontSize: 11,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  catOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  catOptionBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: '#f3e8ff',
  },
  catOptionText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  catOptionTextActive: {
    color: '#7c3aed',
  },
  modalSubmitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
