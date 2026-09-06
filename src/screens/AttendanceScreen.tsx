import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { GradientCard, Badge, StatTile, SearchFilterBar, EmptyState } from '../components/ui';

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
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [activeCode, setActiveCode] = useState<string | null>(null);

  // Modals
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEvent, setManualEvent] = useState('Saturday Rehearsal');
  const [submittingManual, setSubmittingManual] = useState(false);

  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [settingCode, setSettingCode] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const fetchAttendance = useCallback(async () => {
    try {
      const scopeId = isChurchMode ? activeChurch?.id : (activeZone?.id || 'zone-001');
      const [attRes, codeRes] = await Promise.all([
        api.attendance.getAll(scopeId).catch(() => ({ data: [] as AttendanceRecord[] })),
        api.attendance.getActiveCode(scopeId).catch(() => null),
      ]);

      const records = Array.isArray(attRes.data) ? attRes.data : [];
      setAllRecords(records);

      if (codeRes?.data?.active && codeRes.data.code) {
        setActiveCode(codeRes.data.code);
      } else {
        setActiveCode(null);
      }
    } catch (e) {
      console.error('[Attendance] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  useEffect(() => {
    setLoading(true);
    fetchAttendance();
  }, [fetchAttendance]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  async function handleCreateCode() {
    if (!newCode.trim()) {
      Alert.alert('Missing Code', 'Please enter a 4-6 character passcode.');
      return;
    }
    setSettingCode(true);
    try {
      const scopeId = isChurchMode ? activeChurch?.id : (activeZone?.id || 'zone-001');
      const res = await api.attendance.setActiveCode(newCode.trim().toUpperCase(), true, scopeId);
      if (res?.data?.active && res.data.code) {
        setActiveCode(res.data.code);
        setCodeModalVisible(false);
        setNewCode('');
        Alert.alert('Code Active', `Passcode "${res.data.code}" is now active for rehearsal check-ins.`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to activate passcode');
    } finally {
      setSettingCode(false);
    }
  }

  async function handleEndCode() {
    Alert.alert('Deactivate Code', 'Deactivate the active check-in code?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          try {
            const scopeId = isChurchMode ? activeChurch?.id : (activeZone?.id || 'zone-001');
            await api.attendance.setActiveCode('', false, scopeId);
            setActiveCode(null);
            Alert.alert('Closed', 'Check-in passcode has been closed.');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to deactivate code.');
          }
        },
      },
    ]);
  }

  async function handleManualSubmit() {
    if (!manualName.trim()) {
      Alert.alert('Missing Name', 'Enter singer name or email.');
      return;
    }
    setSubmittingManual(true);
    try {
      const scopeId = isChurchMode ? activeChurch?.id : activeZone?.id;
      await api.attendance.recordCheckIn({
        user_name: manualName.trim(),
        eventName: manualEvent.trim() || 'Rehearsal',
        status: 'present',
        checkInTime: new Date().toISOString(),
        zoneId: scopeId,
      });
      setManualModalVisible(false);
      setManualName('');
      Alert.alert('Recorded', 'Singer attendance check-in logged.');
      fetchAttendance();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record manual attendance.');
    } finally {
      setSubmittingManual(false);
    }
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

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title={isChurchMode ? "Church Attendance" : "Rehearsal Attendance"} />

      {/* Passcode & Check-In Control Card */}
      <View style={styles.topCardWrapper}>
        <GradientCard variant={activeCode ? 'glow' : 'surface'} style={styles.codeHeroCard}>
          <View style={styles.codeHeroHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.codeStatusRow}>
                <Badge
                  label={activeCode ? 'CHECK-IN OPEN' : 'CHECK-IN CLOSED'}
                  variant={activeCode ? 'ongoing' : 'draft'}
                  pulse={Boolean(activeCode)}
                  size="sm"
                />
              </View>

              <Text style={styles.codeHeroTitle}>
                {activeCode ? `Passcode: ${activeCode}` : 'Self Check-in Disabled'}
              </Text>
              <Text style={styles.codeHeroSubtitle}>
                {activeCode
                  ? 'Singers can clock in on their mobile apps using this code or QR'
                  : 'Activate a rehearsal passcode for singers to clock in automatically'}
              </Text>
            </View>

            {activeCode ? (
              <TouchableOpacity
                style={styles.qrLaunchBtn}
                onPress={() => setQrModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="qr-code" size={24} color={Colors.accentBright} />
                <Text style={styles.qrLaunchText}>QR Code</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.codeActionRow}>
            {activeCode ? (
              <TouchableOpacity
                style={styles.deactivateBtn}
                onPress={handleEndCode}
                activeOpacity={0.8}
              >
                <Text style={styles.deactivateBtnText}>Close Passcode</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.activateBtn}
                onPress={() => setCodeModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="key" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.activateBtnText}>Open Check-In Passcode</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.manualCheckInBtn}
              onPress={() => setManualModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={16} color={Colors.textPrimary} style={{ marginRight: 4 }} />
              <Text style={styles.manualCheckInText}>Manual Clock-In</Text>
            </TouchableOpacity>
          </View>
        </GradientCard>
      </View>

      {/* KPI Counters */}
      <View style={styles.kpiGrid}>
        <StatTile
          label="Check-Ins Today"
          value={todayRecords.length}
          icon="checkmark-done-circle"
          color="#34d399"
          subtitle={selectedDate}
        />
        <StatTile
          label="Singers Present"
          value={uniqueSingers}
          icon="people"
          color={Colors.accentBright}
          subtitle="Distinct singers"
        />
      </View>

      {/* Search Filter */}
      <View style={styles.searchSection}>
        <SearchFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          placeholder="Filter check-in records by singer name..."
        />
      </View>

      {/* Attendance Check-In List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accentBright}
            colors={[Colors.accentBright]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.accentBright} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title={search ? 'No Matching Records' : 'No Check-Ins Logged Today'}
              description={
                search
                  ? 'Try searching with a different singer name.'
                  : 'When singers clock in with the QR code or passcode, their records will stream in live.'
              }
              actionLabel="Manual Clock-In"
              onAction={() => setManualModalVisible(true)}
            />
          )
        }
        renderItem={({ item }) => {
          const singerName = item.userName || item.user_name || 'Choir Member';
          const time = item.checkInTime
            ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—';

          return (
            <GradientCard variant="surface" style={styles.recordCard}>
              <View style={styles.recordRow}>
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarInitial}>{singerName.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.recordDetails}>
                  <Text style={styles.singerName} numberOfLines={1}>
                    {singerName}
                  </Text>
                  <Text style={styles.eventName}>{item.eventName || item.event_name || 'Rehearsal'}</Text>
                </View>

                <View style={styles.timeArea}>
                  <Badge label="PRESENT" variant="approved" size="sm" />
                  <Text style={styles.timeText}>{time}</Text>
                </View>
              </View>
            </GradientCard>
          );
        }}
      />

      {/* QR Code Presentation Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Rehearsal Check-In QR</Text>
                <Text style={styles.modalSub}>Hold up for singers to scan with their phones</Text>
              </View>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrWrapper}>
              <QRCode
                value={JSON.stringify({ code: activeCode, type: 'rehearsal_check_in' })}
                size={220}
                color="#000000"
                backgroundColor="#ffffff"
              />
            </View>

            <View style={styles.passcodeCallout}>
              <Text style={styles.passcodeCalloutLabel}>PASSCODE</Text>
              <Text style={styles.passcodeCalloutValue}>{activeCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeQrBtn}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.closeQrText}>Close Display</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Set Passcode Modal */}
      <Modal visible={codeModalVisible} transparent animationType="fade" onRequestClose={() => setCodeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.codeModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Rehearsal Passcode</Text>
              <TouchableOpacity onPress={() => setCodeModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Enter a 4-6 character passcode (e.g. REHEARSE, SAT27, CHOIR) for singers to check in today:
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="e.g. REHEARSE"
              placeholderTextColor={Colors.textMuted}
              value={newCode}
              onChangeText={t => setNewCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCodeModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveCodeBtn}
                onPress={handleCreateCode}
                disabled={settingCode}
              >
                {settingCode ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveCodeText}>Open Check-In</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Clock-In Modal */}
      <Modal visible={manualModalVisible} transparent animationType="fade" onRequestClose={() => setManualModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.codeModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Clock-In</Text>
              <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>SINGER FULL NAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter singer name..."
              placeholderTextColor={Colors.textMuted}
              value={manualName}
              onChangeText={setManualName}
            />

            <Text style={styles.inputLabel}>REHEARSAL SESSION</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Saturday Choir Rehearsal"
              placeholderTextColor={Colors.textMuted}
              value={manualEvent}
              onChangeText={setManualEvent}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setManualModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveCodeBtn}
                onPress={handleManualSubmit}
                disabled={submittingManual}
              >
                {submittingManual ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveCodeText}>Record Check-In</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCardWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  codeHeroCard: {
    borderRadius: 18,
  },
  codeHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  codeStatusRow: {
    marginBottom: 6,
  },
  codeHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  codeHeroSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
    maxWidth: 240,
  },
  qrLaunchBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  qrLaunchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    marginTop: 4,
  },
  codeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  activateBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    borderRadius: 12,
  },
  activateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  deactivateBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    borderRadius: 12,
  },
  deactivateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  manualCheckInBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 12,
  },
  manualCheckInText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  recordCard: {
    borderRadius: 14,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4f46e5',
  },
  recordDetails: {
    flex: 1,
  },
  singerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  eventName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  timeArea: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  qrModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  codeModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  passcodeCallout: {
    alignItems: 'center',
    marginVertical: 10,
  },
  passcodeCalloutLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  passcodeCalloutValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#7c3aed',
    letterSpacing: 2,
  },
  closeQrBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  closeQrText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  codeInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 50,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    color: '#7c3aed',
    marginVertical: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 44,
    color: '#0f172a',
    fontSize: 14,
    marginBottom: 10,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  saveCodeBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  saveCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
