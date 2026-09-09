import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';

export interface AttendanceRecord {
  id: string;
  idempotencyKey?: string;
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
  date_string?: string;
  zoneId?: string;
  isManual?: boolean;
  method?: 'scanner' | 'manual';
}

// ── Live Attendance Tracking ────────────────────────────────────────────────
const TODAY_STR = new Date().toLocaleDateString('en-CA');
const YESTERDAY_DATE = new Date(Date.now() - 86400000);
const YESTERDAY_STR = YESTERDAY_DATE.toLocaleDateString('en-CA');
const TWO_DAYS_AGO_STR = new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-CA');

const INITIAL_RECORDS: AttendanceRecord[] = [];

export default function AttendanceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // View Mode: Daily Logs vs Cumulative Accumulation (1:1 with Web Admin)
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_STR);

  // Scanner State & Camera Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'duplicate' | 'error' | 'ready';
    title: string;
    message: string;
  }>({
    type: 'ready',
    title: 'Ready to Scan',
    message: "Align singer's app QR code within the frame",
  });

  // Idempotency & Frame Throttling Lock Refs
  const isProcessingScan = useRef(false);
  const lastScannedPayload = useRef<string | null>(null);
  const lastScanTimestamp = useRef<number>(0);

  // Action Sheet & Manual Modal
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEvent, setManualEvent] = useState('Your Loveworld Rehearsal');

  // Rehearsal Clock-in Live Session Controller
  const [isSessionOpen, setIsSessionOpen] = useState(true);
  const [togglingSession, setTogglingSession] = useState(false);

  const fetchSessionStatus = useCallback(async () => {
    try {
      const scopeId = isChurchMode ? activeChurch?.id : activeZone?.id;
      const res = await api.attendance.getSession(scopeId);
      if (res?.data && typeof res.data.isOpen === 'boolean') {
        setIsSessionOpen(res.data.isOpen);
      }
    } catch (err) {
      console.warn('[Attendance] Failed to fetch session status:', err);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  useEffect(() => {
    fetchSessionStatus();
  }, [fetchSessionStatus]);

  async function toggleClockinSession() {
    const scopeId = isChurchMode ? activeChurch?.id : activeZone?.id;
    if (!scopeId) return;
    const nextState = !isSessionOpen;
    setTogglingSession(true);
    try {
      await api.attendance.toggleSession(scopeId, nextState);
      setIsSessionOpen(nextState);
      Alert.alert(
        nextState ? 'Clock-in Opened' : 'Clock-in Closed',
        nextState
          ? 'Rehearsal clock-in is now OPEN. Singers can scan QR or use geofence to check in.'
          : 'Rehearsal clock-in is now CLOSED. Late arrivals cannot check in.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to toggle clock-in session.');
    } finally {
      setTogglingSession(false);
    }
  }

  // Fetch Attendance from API
  const fetchAttendance = useCallback(async () => {
    try {
      const zoneId = activeZone?.id || undefined;
      const churchId = isChurchMode ? activeChurch?.id : undefined;
      const attRes = await api.attendance.getAll(zoneId, undefined, undefined, churchId).catch(() => ({ data: [] as AttendanceRecord[] }));
      setAllRecords(Array.isArray(attRes?.data) ? attRes.data : []);
    } catch {
      setAllRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
    fetchSessionStatus();
  };

  // Date Navigation Helpers
  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toLocaleDateString('en-CA'));
  };

  const isTodaySelected = selectedDate === TODAY_STR;
  const isYesterdaySelected = selectedDate === YESTERDAY_STR;

  const formattedDateLabel = useMemo(() => {
    if (isTodaySelected) return 'Today';
    if (isYesterdaySelected) return 'Yesterday';
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [selectedDate, isTodaySelected, isYesterdaySelected]);

  // Daily Filtered Records
  const dailyRecords = useMemo(() => {
    let list = allRecords.filter(r => {
      const recordDate = r.dateString || r.date_string || (r.checkInTime ? new Date(r.checkInTime).toLocaleDateString('en-CA') : '');
      return recordDate === selectedDate;
    });

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(r => {
        const name = (r.userName || r.user_name || '').toLowerCase();
        const event = (r.eventName || r.event_name || '').toLowerCase();
        return name.includes(q) || event.includes(q);
      });
    }

    return list;
  }, [allRecords, selectedDate, search]);

  // Cumulative / Accumulation Aggregation (1:1 with Web Admin)
  const cumulativeData = useMemo(() => {
    if (viewMode !== 'cumulative') return [];

    const eventDates: Record<string, Set<string>> = {};
    const userEventData: Record<string, { userName: string; eventName: string; datesAttended: Set<string> }> = {};

    allRecords.forEach(r => {
      const eventName = r.eventName || r.event_name || 'Rehearsal';
      const recordDate = r.dateString || r.date_string || (r.checkInTime ? new Date(r.checkInTime).toLocaleDateString('en-CA') : '');
      if (!recordDate) return;

      if (!eventDates[eventName]) {
        eventDates[eventName] = new Set();
      }
      eventDates[eventName].add(recordDate);

      const userId = r.userId || r.user_id || r.userName || r.user_name || 'unknown';
      const userName = r.userName || r.user_name || 'Choir Singer';
      const userKey = `${userId}_${eventName}`;

      if (!userEventData[userKey]) {
        userEventData[userKey] = {
          userName,
          eventName,
          datesAttended: new Set(),
        };
      }

      if (r.status !== 'absent') {
        userEventData[userKey].datesAttended.add(recordDate);
      }
    });

    return Object.values(userEventData)
      .map(item => {
        const attended = item.datesAttended.size;
        const total = eventDates[item.eventName]?.size || 1;
        const rate = Math.round((attended / total) * 100);
        return {
          userName: item.userName,
          eventName: item.eventName,
          attended,
          total,
          rate,
        };
      })
      .filter(item => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        return item.userName.toLowerCase().includes(q) || item.eventName.toLowerCase().includes(q);
      })
      .sort((a, b) => b.rate - a.rate || a.userName.localeCompare(b.userName));
  }, [allRecords, viewMode, search]);

  // Open Scanner with Permission Check
  const handleOpenScanner = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera Access Required',
          'Please grant camera permission in device settings to scan singers at rehearsals.'
        );
        return;
      }
    }
    isProcessingScan.current = false;
    lastScannedPayload.current = null;
    setScanFeedback({
      type: 'ready',
      title: 'Ready to Scan',
      message: "Point camera at singer's app QR code",
    });
    setScannerVisible(true);
  };

  // ── IDEMPOTENT SCANNER HANDLER ──────────────────────────────────────────
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isProcessingScan.current) return;

    const now = Date.now();
    if (lastScannedPayload.current === data && now - lastScanTimestamp.current < 2500) {
      return;
    }

    isProcessingScan.current = true;
    lastScannedPayload.current = data;
    lastScanTimestamp.current = now;

    try {
      let parsedUserId = '';
      let parsedName = '';

      if (data.startsWith('LW-ATTEND-')) {
        const parts = data.split('-');
        parsedUserId = parts[2] || '';
      } else {
        try {
          const json = JSON.parse(data);
          parsedUserId = json.userId || json.uid || json.user_id || '';
          parsedName = json.userName || json.name || '';
        } catch {
          parsedUserId = data.trim();
        }
      }

      const singerName = parsedName || (parsedUserId ? `Singer (${parsedUserId})` : 'Choir Singer');
      const todayDateString = TODAY_STR;
      const eventName = 'Your Loveworld Rehearsal';

      // Deterministic Idempotency Key
      const rawKey = parsedUserId || singerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const idempotencyKey = `idem_${rawKey}_${todayDateString}`;

      // Idempotency Check: Already logged today?
      const existingRecord = allRecords.find(r => {
        if (r.idempotencyKey && r.idempotencyKey === idempotencyKey) return true;
        if (parsedUserId && (r.userId === parsedUserId || r.user_id === parsedUserId)) return true;
        if (r.userName && r.userName.toLowerCase() === singerName.toLowerCase() && (r.dateString === todayDateString || r.date_string === todayDateString)) return true;
        return false;
      });

      if (existingRecord) {
        const checkedTime = existingRecord.checkInTime
          ? new Date(existingRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'earlier today';

        setScanFeedback({
          type: 'duplicate',
          title: 'Already Checked In',
          message: `${singerName} was already clocked in at ${checkedTime}. No duplicate recorded.`,
        });

        setTimeout(() => {
          isProcessingScan.current = false;
        }, 1800);
        return;
      }

      // New Check-In Record
      const newRecord: AttendanceRecord = {
        id: `att-${idempotencyKey}`,
        idempotencyKey,
        userId: parsedUserId,
        userName: singerName,
        eventName,
        checkInTime: new Date().toISOString(),
        dateString: todayDateString,
        status: 'present',
        isManual: false,
        method: 'scanner',
      };

      setAllRecords(prev => [newRecord, ...prev]);

      setScanFeedback({
        type: 'success',
        title: '✓ Checked In',
        message: `${singerName} marked Present!`,
      });

      const scopeId = isChurchMode ? activeChurch?.id : activeZone?.id;
      api.attendance.recordCheckIn({
        idempotencyKey,
        userId: parsedUserId,
        user_name: singerName,
        eventName,
        status: 'present',
        checkInTime: newRecord.checkInTime,
        zoneId: scopeId,
        method: 'scanner',
      }).catch(() => {});

      setTimeout(() => {
        isProcessingScan.current = false;
      }, 1800);
    } catch {
      setScanFeedback({
        type: 'error',
        title: 'Scan Error',
        message: 'Could not read QR token. Please align clearly.',
      });
      setTimeout(() => {
        isProcessingScan.current = false;
      }, 1500);
    }
  };

  // Manual Clock-In
  const handleManualSubmit = async () => {
    if (!manualName.trim()) {
      Alert.alert('Missing Name', 'Please enter singer full name.');
      return;
    }

    const normalizedName = manualName.trim();
    const idempotencyKey = `idem_manual_${normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${selectedDate}`;

    const existing = allRecords.find(r => 
      r.userName && r.userName.toLowerCase() === normalizedName.toLowerCase() && (r.dateString === selectedDate || r.date_string === selectedDate)
    );

    if (existing) {
      Alert.alert('Already Clocked In', `${normalizedName} is already recorded for ${selectedDate}.`);
      setManualModalVisible(false);
      setManualName('');
      return;
    }

    const newRecord: AttendanceRecord = {
      id: `att-manual-${Date.now()}`,
      idempotencyKey,
      userName: normalizedName,
      eventName: manualEvent.trim() || 'Rehearsal Session',
      status: 'present',
      checkInTime: new Date().toISOString(),
      dateString: selectedDate,
      isManual: true,
      method: 'manual',
    };

    setAllRecords(prev => [newRecord, ...prev]);
    setManualModalVisible(false);
    setManualName('');

    try {
      const scopeId = isChurchMode ? activeChurch?.id : activeZone?.id;
      await api.attendance.recordCheckIn({
        idempotencyKey,
        user_name: newRecord.userName,
        eventName: newRecord.eventName,
        status: 'present',
        checkInTime: newRecord.checkInTime,
        zoneId: scopeId,
        method: 'manual',
      });
    } catch {}
    Alert.alert('Clocked In', `${newRecord.userName} has been logged as present.`);
  };

  // Export CSV without freezing modal or UI thread
  const handleExportCSV = async () => {
    try {
      let fileName = '';
      let csvContent = '';

      if (viewMode === 'daily') {
        if (dailyRecords.length === 0) {
          Alert.alert('No Records', `There are no attendance records to export for ${formattedDateLabel}.`);
          return;
        }
        fileName = `Attendance_${selectedDate}.csv`;
        const headers = ['Singer Name', 'Event', 'Date', 'Time', 'Method', 'Status'];
        const rows = dailyRecords.map(r => [
          `"${(r.userName || r.user_name || 'Singer').replace(/"/g, '""')}"`,
          `"${(r.eventName || r.event_name || 'Rehearsal').replace(/"/g, '""')}"`,
          `"${selectedDate}"`,
          `"${r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Present'}"`,
          `"${r.method || (r.isManual ? 'manual' : 'scanner')}"`,
          `"${r.status || 'present'}"`,
        ]);
        csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      } else {
        if (cumulativeData.length === 0) {
          Alert.alert('No Records', 'There are no cumulative records to export.');
          return;
        }
        fileName = `Attendance_Cumulative_${TODAY_STR}.csv`;
        const headers = ['Singer Name', 'Event', 'Attended Sessions', 'Total Sessions', 'Rate'];
        const rows = cumulativeData.map(c => [
          `"${c.userName.replace(/"/g, '""')}"`,
          `"${c.eventName.replace(/"/g, '""')}"`,
          c.attended,
          c.total,
          `"${c.rate}%"`,
        ]);
        csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      }

      // Web: Direct instant download to prevent browser freeze
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      // Mobile (iOS / Android): Safe native share dialog
      await Share.share(
        {
          title: fileName,
          message: csvContent,
        },
        {
          dialogTitle: 'Export Attendance CSV',
        }
      );
    } catch (err: any) {
      console.warn('[Attendance Export error]:', err?.message);
      Alert.alert('Export Notice', 'Attendance CSV prepared.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── 1. Uncrowded Executive Top Bar ────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {viewMode === 'daily' ? `${dailyRecords.length} Present` : `${cumulativeData.length} Singers`}
            </Text>
          </View>
        </View>

        {/* Clean, Non-Crowded Action Group (Primary Scan + Options Menu) */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.scanActionPill}
            onPress={handleOpenScanner}
            activeOpacity={0.8}
          >
            <Ionicons name="scan" size={15} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.scanActionPillText}>Scan QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuIconBtn}
            onPress={() => setActionMenuVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Rehearsal Clock-in Live Session Controller Banner ─────────────── */}
      <View style={[styles.sessionBanner, isSessionOpen ? styles.sessionBannerOpen : styles.sessionBannerClosed]}>
        <View style={styles.sessionBannerLeft}>
          <View style={[styles.sessionDot, { backgroundColor: isSessionOpen ? '#10b981' : '#ef4444' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sessionTitle, { color: isSessionOpen ? '#065f46' : '#991b1b' }]}>
              {isSessionOpen ? 'Clock-in is OPEN' : 'Clock-in is CLOSED'}
            </Text>
            <Text style={[styles.sessionSub, { color: isSessionOpen ? '#047857' : '#b91c1c' }]}>
              {isSessionOpen
                ? 'Singers can scan QR or use geofence to check in'
                : 'Late arrivals are blocked from clocking in'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.sessionToggleBtn, { backgroundColor: isSessionOpen ? '#ef4444' : '#10b981' }]}
          onPress={toggleClockinSession}
          disabled={togglingSession}
          activeOpacity={0.8}
        >
          {togglingSession ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.sessionToggleBtnText}>
              {isSessionOpen ? 'Close Clock-in' : 'Open Clock-in'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── 2. Segmented View Mode Tabs: Daily Logs vs Cumulative ────── */}
      <View style={styles.viewModeTabsContainer}>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'daily' && styles.viewModeTabActive]}
          onPress={() => setViewMode('daily')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={viewMode === 'daily' ? '#7c3aed' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.viewModeTabText, viewMode === 'daily' && styles.viewModeTabTextActive]}>
            Daily Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'cumulative' && styles.viewModeTabActive]}
          onPress={() => setViewMode('cumulative')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="trending-up-outline"
            size={14}
            color={viewMode === 'cumulative' ? '#7c3aed' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.viewModeTabText, viewMode === 'cumulative' && styles.viewModeTabTextActive]}>
            Cumulative
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 3. Date Navigation Strip (Daily Mode Only) ────────────────── */}
      {viewMode === 'daily' && (
        <View style={styles.dateFilterStrip}>
          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => shiftDate(-1)}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="chevron-back" size={16} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.dateCenterInfo}>
            <Ionicons name="time-outline" size={14} color="#7c3aed" style={{ marginRight: 6 }} />
            <Text style={styles.dateLabelText}>{formattedDateLabel}</Text>
            <Text style={styles.dateSubText}>({selectedDate})</Text>
          </View>

          <TouchableOpacity
            style={[styles.dateArrowBtn, isTodaySelected && { opacity: 0.4 }]}
            onPress={() => shiftDate(1)}
            disabled={isTodaySelected}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── 4. Quick Search Bar ───────────────────────────────────────── */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={viewMode === 'daily' ? 'Search checked-in singers...' : 'Search singers across sessions...'}
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 5. Main Content: Daily Cards or Cumulative Aggregates ────── */}
      {viewMode === 'daily' ? (
        <FlatList
          data={dailyRecords}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Attendance for {formattedDateLabel}</Text>
                <Text style={styles.emptySubtitle}>
                  {search ? 'No singers match your search query.' : 'Tap "Scan QR" to start clocking in singers for this date.'}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const name = item.userName || item.user_name || 'Choir Singer';
            const initial = name.charAt(0).toUpperCase();
            const event = item.eventName || item.event_name || 'Rehearsal Session';
            const timeFormatted = item.checkInTime
              ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Present';

            return (
              <View style={styles.recordCard}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarInitialWrap}>
                    <Text style={styles.avatarInitialText}>{initial}</Text>
                  </View>
                  <View style={styles.onlineDot} />
                </View>

                <View style={styles.recordMeta}>
                  <View style={styles.nameRow}>
                    <Text style={styles.singerName} numberOfLines={1}>
                      {name}
                    </Text>
                    {item.isManual ? (
                      <View style={styles.manualTag}>
                        <Text style={styles.manualTagText}>Manual</Text>
                      </View>
                    ) : (
                      <View style={styles.scanTag}>
                        <Ionicons name="scan" size={9} color="#7c3aed" style={{ marginRight: 2 }} />
                        <Text style={styles.scanTagText}>Scanned</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.recordSub} numberOfLines={1}>
                    {event} • {timeFormatted}
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Present</Text>
                </View>
              </View>
            );
          }}
        />
      ) : (
        /* Cumulative Aggregated View */
        <FlatList
          data={cumulativeData}
          keyExtractor={(item, index) => `cum-${item.userName}-${index}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="stats-chart-outline" size={32} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Cumulative Telemetry</Text>
                <Text style={styles.emptySubtitle}>Rehearsal attendance history will accumulate here.</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const initial = item.userName.charAt(0).toUpperCase();
            const rateColor = item.rate >= 80 ? '#10b981' : item.rate >= 50 ? '#f59e0b' : '#ef4444';
            const rateBg = item.rate >= 80 ? '#ecfdf5' : item.rate >= 50 ? '#fffbeb' : '#fef2f2';

            return (
              <View style={styles.cumulativeCard}>
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatarInitialWrap, { backgroundColor: '#f5f3ff' }]}>
                    <Text style={[styles.avatarInitialText, { color: '#7c3aed' }]}>{initial}</Text>
                  </View>
                </View>

                <View style={styles.recordMeta}>
                  <Text style={styles.singerName} numberOfLines={1}>
                    {item.userName}
                  </Text>
                  <Text style={styles.recordSub} numberOfLines={1}>
                    {item.eventName} • {item.attended} of {item.total} sessions
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${item.rate}%`, backgroundColor: rateColor }]} />
                  </View>
                </View>

                <View style={[styles.rateBadge, { backgroundColor: rateBg }]}>
                  <Text style={[styles.rateBadgeText, { color: rateColor }]}>{item.rate}%</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── ACTION SHEET MODAL: Geofence, Manual Clock-In, Export CSV ── */}
      <Modal visible={actionMenuVisible} animationType="slide" transparent onRequestClose={() => setActionMenuVisible(false)}>
        <View style={styles.actionSheetOverlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setActionMenuVisible(false)} />
          <View style={[styles.actionSheetContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.grabBar} />

            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>Attendance Options</Text>
              <TouchableOpacity onPress={() => setActionMenuVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Geofence Settings */}
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setActionMenuVisible(false);
                navigation.navigate('Geofence');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetItemIconWrap, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="navigate-outline" size={18} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetItemTitle}>Venue Geofence & GPS</Text>
                <Text style={styles.sheetItemSub}>Configure rehearsal perimeter & GPS boundary</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            {/* Option 2: Manual Clock-In */}
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setActionMenuVisible(false);
                setTimeout(() => {
                  setManualModalVisible(true);
                }, 350);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetItemIconWrap, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="person-add-outline" size={18} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetItemTitle}>Manual Clock-In</Text>
                <Text style={styles.sheetItemSub}>Record singer without personal device</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            {/* Option 3: Export CSV */}
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setActionMenuVisible(false);
                setTimeout(() => {
                  handleExportCSV();
                }, 350);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetItemIconWrap, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="download-outline" size={18} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetItemTitle}>Export Attendance CSV</Text>
                <Text style={styles.sheetItemSub}>Download roster for {viewMode === 'daily' ? selectedDate : 'Cumulative'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            {/* Option 4: Refresh */}
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setActionMenuVisible(false);
                onRefresh();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetItemIconWrap, { backgroundColor: '#f8fafc' }]}>
                <Ionicons name="refresh" size={18} color="#64748b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetItemTitle}>Sync & Refresh</Text>
                <Text style={styles.sheetItemSub}>Reload latest logs from server</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── CAMERA SCANNER MODAL ──────────────────────────────────────── */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setScannerVisible(false)}
      >
        <SafeAreaView style={styles.scannerSafeArea}>
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torchOn}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={isProcessingScan.current ? undefined : handleBarcodeScanned}
            />

            <View style={styles.overlayLayer}>
              <View style={styles.scannerTopBar}>
                <TouchableOpacity
                  style={styles.scannerControlBtn}
                  onPress={() => setScannerVisible(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>

                <Text style={styles.scannerScreenTitle}>Attendance Scanner</Text>

                <TouchableOpacity
                  style={[styles.scannerControlBtn, torchOn && styles.scannerTorchActive]}
                  onPress={() => setTorchOn(!torchOn)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={torchOn ? 'flashlight' : 'flashlight-outline'} size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View style={styles.viewfinderCenterWrap}>
                <View style={styles.viewfinderFrame}>
                  <View style={[styles.reticleCorner, styles.cornerTopLeft]} />
                  <View style={[styles.reticleCorner, styles.cornerTopRight]} />
                  <View style={[styles.reticleCorner, styles.cornerBottomLeft]} />
                  <View style={[styles.reticleCorner, styles.cornerBottomRight]} />
                </View>
                <Text style={styles.viewfinderHint}>
                  Position singer's QR code within the frame
                </Text>
              </View>

              <View style={styles.scannerBottomHUD}>
                <View
                  style={[
                    styles.feedbackCard,
                    scanFeedback.type === 'success' && styles.feedbackSuccess,
                    scanFeedback.type === 'duplicate' && styles.feedbackDuplicate,
                    scanFeedback.type === 'error' && styles.feedbackError,
                  ]}
                >
                  <View style={styles.feedbackIconWrap}>
                    <Ionicons
                      name={
                        scanFeedback.type === 'success'
                          ? 'checkmark-circle'
                          : scanFeedback.type === 'duplicate'
                          ? 'alert-circle'
                          : scanFeedback.type === 'error'
                          ? 'close-circle'
                          : 'scan-outline'
                      }
                      size={20}
                      color={
                        scanFeedback.type === 'success'
                          ? '#10b981'
                          : scanFeedback.type === 'duplicate'
                          ? '#f59e0b'
                          : scanFeedback.type === 'error'
                          ? '#ef4444'
                          : '#c4b5fd'
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedbackTitle}>{scanFeedback.title}</Text>
                    <Text style={styles.feedbackMessage}>{scanFeedback.message}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.scannerDoneBtn}
                  onPress={() => setScannerVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.scannerDoneBtnText}>Done Scanning</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── MANUAL CLOCK-IN DRAWER ────────────────────────────────────── */}
      <Modal visible={manualModalVisible} animationType="slide" transparent onRequestClose={() => setManualModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.actionSheetOverlay}
        >
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setManualModalVisible(false)} />
          <View style={[styles.actionSheetContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.grabBar} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Clock-In</Text>
              <TouchableOpacity onPress={() => setManualModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 6 }}>
              <Text style={styles.inputLabel}>Singer Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. David Adeyemi"
                placeholderTextColor="#94a3b8"
                value={manualName}
                onChangeText={setManualName}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Rehearsal Event</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Saturday Praise Night Rehearsal"
                placeholderTextColor="#94a3b8"
                value={manualEvent}
                onChangeText={setManualEvent}
              />

              <TouchableOpacity
                style={styles.submitManualBtn}
                onPress={handleManualSubmit}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.submitManualBtnText}>Log Attendance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.4,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  scanActionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  menuIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // View Mode Segmented Switch
  viewModeTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 3,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  viewModeTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  viewModeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  viewModeTabTextActive: {
    fontWeight: '800',
    color: '#7c3aed',
  },

  // Date Filter Strip
  dateFilterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateCenterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    marginRight: 4,
  },
  dateSubText: {
    fontSize: 11,
    color: '#64748b',
  },

  // Search Bar
  searchBarWrap: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    padding: 0,
  },

  // List Content & Record Cards
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 6,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 10,
  },
  avatarInitialWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  recordMeta: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  singerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  manualTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#fef3c7',
  },
  manualTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#b45309',
  },
  scanTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#f5f3ff',
  },
  scanTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7c3aed',
  },
  recordSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ecfdf5',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  // Cumulative Card
  cumulativeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 6,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
    width: '90%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  rateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // ── Action Sheet Modal ──
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  actionSheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  sheetItemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },

  // ── Scanner Styles ──
  scannerSafeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scannerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scannerControlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scannerTorchActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#fbbf24',
  },
  scannerScreenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  viewfinderCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    width: 260,
    height: 260,
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
  },
  reticleCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#c4b5fd',
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  viewfinderHint: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 18,
    textAlign: 'center',
  },
  scannerBottomHUD: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
    borderColor: '#10b981',
  },
  feedbackDuplicate: {
    backgroundColor: 'rgba(120, 53, 15, 0.95)',
    borderColor: '#f59e0b',
  },
  feedbackError: {
    backgroundColor: 'rgba(127, 29, 29, 0.95)',
    borderColor: '#ef4444',
  },
  feedbackIconWrap: {
    marginRight: 10,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  feedbackMessage: {
    fontSize: 12,
    color: '#e2e8f0',
    marginTop: 2,
  },
  scannerDoneBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerDoneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ── Manual Drawer ──
  closeBtn: {
    padding: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  submitManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 18,
  },
  submitManualBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ── Clock-in Session Banner Styles ──
  sessionBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sessionBannerOpen: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  sessionBannerClosed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  sessionBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  sessionSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  sessionToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionToggleBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
