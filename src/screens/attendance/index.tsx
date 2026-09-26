import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Share, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useZoneContext } from '../../context/ZoneContext';
import { api } from '../../services/api';
import { useAttendance } from '../../hooks/useAttendance';
import { customAlert } from '../../context/AlertContext';
import { styles } from './attendanceStyles';
import AttendanceSessionControls from './AttendanceSessionControls';
import AttendanceRecordList from './AttendanceRecordList';
import AttendanceCheckInModal from './AttendanceCheckInModal';
import AttendanceActionMenuModal from './AttendanceActionMenuModal';
import AttendanceScannerModal from './AttendanceScannerModal';
import AttendanceLiveQrModal from './AttendanceLiveQrModal';
import SingerAttendanceBadgeModal from '../../components/SingerAttendanceBadgeModal';
import type { AttendanceRecord } from './types';

export type { AttendanceRecord };

const TODAY_STR = new Date().toLocaleDateString('en-CA');
const YESTERDAY_STR = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

export default function AttendanceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const {
    allRecords,
    loading,
    refreshing,
    isSessionOpen,
    togglingSession,
    refetch,
    toggleClockinSession,
    addRecord,
  } = useAttendance();

  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_STR);

  // Live QR & Scanner State
  const [liveQrVisible, setLiveQrVisible] = useState(false);
  const [selectedRecordForBadge, setSelectedRecordForBadge] = useState<AttendanceRecord | null>(null);
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

  // Modals
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEvent, setManualEvent] = useState('Your Loveworld Rehearsal');

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

  const handleOpenScanner = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        customAlert('Camera Access Required', 'Please grant camera permission in device settings to scan singers at rehearsals.');
        return;
      }
    }
    isProcessingScan.current = false;
    lastScannedPayload.current = null;
    setScanFeedback({ type: 'ready', title: 'Ready to Scan', message: "Point camera at singer's app QR code" });
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isProcessingScan.current) return;
    const now = Date.now();
    if (lastScannedPayload.current === data && now - lastScanTimestamp.current < 2500) return;

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
      const rawKey = parsedUserId || singerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const idempotencyKey = `idem_${rawKey}_${todayDateString}`;

      const existingRecord = allRecords.find(r => {
        if (r.idempotencyKey && r.idempotencyKey === idempotencyKey) return true;
        if (parsedUserId && (r.userId === parsedUserId || r.user_id === parsedUserId)) return true;
        if (r.userName && r.userName.toLowerCase() === singerName.toLowerCase() && (r.dateString === todayDateString || r.date_string === todayDateString)) return true;
        return false;
      });

      if (existingRecord) {
        const checkedTime = existingRecord.checkInTime ? new Date(existingRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier today';
        setScanFeedback({ type: 'duplicate', title: 'Already Checked In', message: `${singerName} was already clocked in at ${checkedTime}.` });
        setTimeout(() => { isProcessingScan.current = false; }, 1800);
        return;
      }

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

      addRecord(newRecord);
      setScanFeedback({ type: 'success', title: '✓ Checked In', message: `${singerName} marked Present!` });

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

      setTimeout(() => { isProcessingScan.current = false; }, 1800);
    } catch {
      setScanFeedback({ type: 'error', title: 'Scan Error', message: 'Could not read QR token.' });
      setTimeout(() => { isProcessingScan.current = false; }, 1500);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualName.trim()) {
      customAlert('Missing Name', 'Please enter singer full name.');
      return;
    }
    const normalizedName = manualName.trim();
    const idempotencyKey = `idem_manual_${normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${selectedDate}`;

    const existing = allRecords.find(r => r.userName && r.userName.toLowerCase() === normalizedName.toLowerCase() && (r.dateString === selectedDate || r.date_string === selectedDate));
    if (existing) {
      customAlert('Already Clocked In', `${normalizedName} is already recorded for ${selectedDate}.`);
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

    addRecord(newRecord);
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
    customAlert('Clocked In', `${newRecord.userName} has been logged as present.`);
  };

  const handleExportCSV = async () => {
    try {
      if (dailyRecords.length === 0) {
        customAlert('No Records', `There are no attendance records to export for ${formattedDateLabel}.`);
        return;
      }
      const fileName = `Attendance_${selectedDate}.csv`;
      const headers = ['Singer Name', 'Event', 'Date', 'Time', 'Method', 'Status'];
      const rows = dailyRecords.map(r => [
        `"${(r.userName || r.user_name || 'Singer').replace(/"/g, '""')}"`,
        `"${(r.eventName || r.event_name || 'Rehearsal').replace(/"/g, '""')}"`,
        `"${selectedDate}"`,
        `"${r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Present'}"`,
        `"${r.method || (r.isManual ? 'manual' : 'scanner')}"`,
        `"${r.status || 'present'}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

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
      await Share.share({ title: fileName, message: csvContent });
    } catch {
      customAlert('Export Notice', 'Attendance CSV prepared.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Executive Top Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{dailyRecords.length} Present</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.scanActionPill, { backgroundColor: '#7c3aed', marginRight: 6 }]} 
            onPress={() => setLiveQrVisible(true)} 
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code" size={15} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.scanActionPillText}>Live QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanActionPill} onPress={handleOpenScanner} activeOpacity={0.8}>
            <Ionicons name="scan" size={15} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.scanActionPillText}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuIconBtn} onPress={() => setActionMenuVisible(true)} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <AttendanceSessionControls
        isSessionOpen={isSessionOpen}
        togglingSession={togglingSession}
        onToggleSession={toggleClockinSession}
      />

      <AttendanceRecordList
        dailyRecords={dailyRecords}
        search={search}
        setSearch={setSearch}
        selectedDate={selectedDate}
        formattedDateLabel={formattedDateLabel}
        isTodaySelected={isTodaySelected}
        shiftDate={shiftDate}
        loading={loading}
        refreshing={refreshing}
        refetch={refetch}
        insetsBottom={insets.bottom}
        onSelectRecord={(rec) => setSelectedRecordForBadge(rec)}
      />

      <AttendanceActionMenuModal
        visible={actionMenuVisible}
        onClose={() => setActionMenuVisible(false)}
        onOpenLiveQr={() => { setActionMenuVisible(false); setTimeout(() => setLiveQrVisible(true), 350); }}
        onNavigateGeofence={() => { setActionMenuVisible(false); navigation?.navigate?.('Geofence'); }}
        onOpenManual={() => { setActionMenuVisible(false); setTimeout(() => setManualModalVisible(true), 350); }}
        onExportCSV={() => { setActionMenuVisible(false); setTimeout(handleExportCSV, 350); }}
        onRefresh={() => { setActionMenuVisible(false); refetch(); }}
      />

      <AttendanceCheckInModal
        visible={manualModalVisible}
        onClose={() => setManualModalVisible(false)}
        name={manualName}
        setName={setManualName}
        event={manualEvent}
        setEvent={setManualEvent}
        onSubmit={handleManualSubmit}
      />

      <AttendanceScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        torchOn={torchOn}
        onToggleTorch={() => setTorchOn(!torchOn)}
        onBarcodeScanned={handleBarcodeScanned}
        scanFeedback={scanFeedback}
        isProcessing={isProcessingScan.current}
      />

      <AttendanceLiveQrModal
        visible={liveQrVisible}
        onClose={() => setLiveQrVisible(false)}
        zoneId={isChurchMode ? activeChurch?.id : activeZone?.id}
        eventName="Your Loveworld Rehearsal"
      />

      {/* Singer Attendance QR Badge Modal */}
      <SingerAttendanceBadgeModal
        visible={Boolean(selectedRecordForBadge)}
        onClose={() => setSelectedRecordForBadge(null)}
        member={selectedRecordForBadge ? {
          id: selectedRecordForBadge.userId || selectedRecordForBadge.id,
          name: selectedRecordForBadge.userName || selectedRecordForBadge.user_name,
          designation: selectedRecordForBadge.eventName,
        } : null}
      />
    </SafeAreaView>
  );
}
