import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert, TextInput, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';

export interface AttendanceRecord {
  id: string;
  userId?: string;
  user_id?: string;
  userName?: string;
  user_name?: string;
  eventName?: string;
  event_name?: string;
  checkInTime?: string;
  check_in_time?: string;
  checkOutTime?: string;
  status?: 'present' | 'absent' | 'completed';
  dateString?: string;
  zoneId?: string;
  qrCode?: string;
}

export default function AttendanceScreen({ navigation }: any) {
  const { activeZone, isAllZones } = useZoneContext();
  const { adminUser } = useAuth();

  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [activeCode, setActiveCode] = useState<string | null>(null);

  // Manual check-in modal
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEvent, setManualEvent] = useState('Saturday Rehearsal');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Set active check-in code modal
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [settingCode, setSettingCode] = useState(false);

  // QR code modal
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const fetchAttendance = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const attRes = await apiClient.get<{ success: boolean; data: AttendanceRecord[] }>(`/attendance${zoneParam}`).catch(() => ({ data: [] as AttendanceRecord[] }));
      const records = Array.isArray(attRes.data) ? attRes.data : [];
      setAllRecords(records);
      // Load active code from server
      try {
        const codeRes = await apiClient.get<{ success: boolean; data: { code?: string; active?: boolean } }>('/attendance/code').catch(() => null);
        if (codeRes?.data?.active && codeRes.data.code) {
          setActiveCode(codeRes.data.code);
        } else {
          setActiveCode(null);
        }
      } catch { setActiveCode(null); }
    } catch (e) {
      console.error('[Attendance] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchAttendance();
  }, [fetchAttendance]);

  async function handleCreateCode() {
    if (!newCode.trim()) {
      Alert.alert('Missing Code', 'Please enter a 4-6 character passcode.');
      return;
    }
    setSettingCode(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: { code?: string; active?: boolean } }>('/attendance/code', {
        code: newCode.trim().toUpperCase(),
        validMinutes: 60,
        zoneId: activeZone?.id,
      });
      if (res?.data?.active && res.data.code) {
        setActiveCode(res.data.code);
        setCodeModalVisible(false);
        setNewCode('');
        Alert.alert('Code Active', `Passcode "${res.data.code}" is now active for rehearsal check-ins.`);
      } else {
        Alert.alert('Error', 'Failed to activate code');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to activate code');
    } finally {
      setSettingCode(false);
    }
  }

  async function handleEndCode() {
    Alert.alert('Close Attendance Code', 'Deactivate the active check-in code?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post('/attendance/code', { active: false, zoneId: activeZone?.id });
            setActiveCode(null);
            Alert.alert('Closed', 'Check-in code deactivated.');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to deactivate code');
          }
        },
      },
    ]);
  }

  async function handleManualSubmit() {
    if (!manualName.trim()) {
      Alert.alert('Missing Name', 'Enter singer name or identifier.');
      return;
    }

    setSubmittingManual(true);
    try {
      await apiClient.post('/attendance/check-in', {
        eventName: manualEvent.trim() || 'Rehearsal',
        status: 'present',
        checkInTime: new Date().toISOString(),
      });
      setManualModalVisible(false);
      setManualName('');
      Alert.alert('Success', 'Singer marked present.');
      fetchAttendance();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record manual attendance');
    } finally {
      setSubmittingManual(false);
    }
  }

  // TODO: DELETE /attendance/:id endpoint not yet built
  async function handleDeleteRecord(_id: string) {
    Alert.alert('Not Available', 'Deleting attendance records is not yet supported.');
  }

  const todayRecords = useMemo(() => {
    return allRecords.filter(r => {
      const d = r.dateString || (r.checkInTime ? new Date(r.checkInTime).toLocaleDateString('en-CA') : '');
      return d === selectedDate;
    });
  }, [allRecords, selectedDate]);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase();
    return todayRecords.filter(r => {
      const name = r.userName || r.user_name || '';
      const event = r.eventName || r.event_name || '';
      return !q || name.toLowerCase().includes(q) || event.toLowerCase().includes(q);
    });
  }, [todayRecords, search]);

  const uniqueSingers = useMemo(() => {
    const set = new Set(todayRecords.map(r => r.userName || r.user_name));
    return set.size;
  }, [todayRecords]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Attendance" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Attendance" />

      {/* Active Check-in Code Card */}
      <View style={styles.codeCard}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <View style={[styles.codeDot, { backgroundColor: activeCode ? Colors.success : Colors.textMuted }]} />
            <Text style={styles.codeCardTitle}>
              {activeCode ? 'Rehearsal Check-in Active' : 'No Active Passcode'}
            </Text>
          </View>
          <Text style={styles.codeCardSub}>
            {activeCode
              ? `Singers can check in using code "${activeCode}" or via QR`
              : 'Launch a passcode so singers can self check in.'}
          </Text>
          {activeCode && (
            <TouchableOpacity
              style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => setQrModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="qr-code-outline" size={14} color={Colors.accent} />
              <Text style={{ color: Colors.accent, fontSize: 12, fontWeight: '700' }}>Show QR</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeCode ? (
          <TouchableOpacity
            style={styles.deactivateBtn}
            onPress={handleEndCode}
            activeOpacity={0.8}
          >
            <Text style={styles.deactivateBtnText}>Close</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.activateBtn}
            onPress={() => setCodeModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="key-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.activateBtnText}>Set Code</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* KPI Counters */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiNumber}>{todayRecords.length}</Text>
          <Text style={styles.kpiLabel}>Total Check-ins</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiNumber, { color: Colors.accentBright }]}>{uniqueSingers}</Text>
          <Text style={styles.kpiLabel}>Singers Present</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiNumber, { color: Colors.info }]}>{selectedDate}</Text>
          <Text style={styles.kpiLabel}>Active Date</Text>
        </View>
      </View>

      {/* Search & Manual Check-in Action Bar */}
      <View style={styles.actionRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search checked-in singers..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => setManualModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Attendee Roster List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAttendance(); }} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No check-ins recorded for {selectedDate}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const name = item.userName || item.user_name || 'Choir Singer';
          const event = item.eventName || item.event_name || 'Rehearsal';
          const timeStr = item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Present';

          return (
            <View style={styles.recordCard}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>{(name[0] || 'S').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.singerName} numberOfLines={1}>{name}</Text>
                <Text style={styles.singerMeta}>{event} · {timeStr}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteRecord(item.id)}
                activeOpacity={0.75}
              >
                <Ionicons name="trash-outline" size={15} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Set Code Modal */}
      <Modal visible={codeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Check-in Passcode</Text>
              <TouchableOpacity onPress={() => setCodeModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Passcode (e.g. 7482 or PRAISE)</Text>
            <TextInput
              style={styles.modalInput}
              value={newCode}
              onChangeText={setNewCode}
              placeholder="7482"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={8}
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, settingCode && { opacity: 0.6 }]}
              onPress={handleCreateCode}
              disabled={settingCode}
              activeOpacity={0.85}
            >
              {settingCode ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Activate Passcode</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Check-in Modal */}
      <Modal visible={manualModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Manual Attendance</Text>
              <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Singer Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={manualName}
              onChangeText={setManualName}
              placeholder="e.g. Brother David"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Rehearsal Session / Event</Text>
            <TextInput
              style={styles.modalInput}
              value={manualEvent}
              onChangeText={setManualEvent}
              placeholder="e.g. Praise Night Rehearsal"
              placeholderTextColor={Colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, submittingManual && { opacity: 0.6 }]}
              onPress={handleManualSubmit}
              disabled={submittingManual}
              activeOpacity={0.85}
            >
              {submittingManual ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Mark Present</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', maxWidth: 340 }}>
            <Text style={{ color: '#1a1a2e', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>Scan to Check In</Text>
            <Text style={{ color: '#666', fontSize: 12, marginBottom: 20 }}>Singers scan this code with the mobile app</Text>
            <QRCode value={activeCode ?? 'REHEARSALHUB'} size={260} backgroundColor="white" color="black" />
            <Text style={{ color: '#1a1a2e', fontSize: 22, fontWeight: '900', letterSpacing: 4, marginTop: 16 }}>{activeCode}</Text>
            <TouchableOpacity style={{ marginTop: 20, backgroundColor: Colors.accent, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center' }} onPress={() => setQrModalVisible(false)} activeOpacity={0.85}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Close</Text>
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

  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  codeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  codeCardTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  codeCardSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  activateBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  deactivateBtn: {
    backgroundColor: Colors.danger + '15',
    borderWidth: 1,
    borderColor: Colors.danger + '40',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deactivateBtnText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },

  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 10,
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  kpiNumber: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  kpiLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  manualBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.accentBright,
    fontSize: 14,
    fontWeight: '800',
  },
  singerName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  singerMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.danger + '10',
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
