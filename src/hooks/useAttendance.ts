import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { AttendanceRecord } from '../screens/AttendanceScreen';

export function useAttendance() {
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(true);
  const [togglingSession, setTogglingSession] = useState(false);

  // ── Fetch session open/closed status ──────────────────────────────────────
  const fetchSessionStatus = useCallback(async () => {
    try {
      const scopeId = isChurchMode ? activeChurch?.id : activeZone?.id;
      const res = await api.attendance.getSession(scopeId);
      if (res?.data && typeof res.data.isOpen === 'boolean') {
        setIsSessionOpen(res.data.isOpen);
      }
    } catch (err) {
      console.warn('[useAttendance] fetchSessionStatus error:', err);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  useEffect(() => {
    fetchSessionStatus();
  }, [fetchSessionStatus]);

  // ── Fetch attendance records ───────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      const zoneId = activeZone?.id || undefined;
      const churchId = isChurchMode ? activeChurch?.id : undefined;
      const res = await api.attendance
        .getAll(zoneId, undefined, undefined, churchId)
        .catch(() => ({ data: [] as AttendanceRecord[] }));
      setAllRecords(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setAllRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  // Reset stale records and re-fetch on scope change
  const lastScopeRef = useRef<string>('');
  useEffect(() => {
    const scopeKey = `${activeZone?.id ?? ''}:${isChurchMode ? (activeChurch?.id ?? '') : ''}`;
    if (lastScopeRef.current !== '' && lastScopeRef.current !== scopeKey) {
      setAllRecords([]);
      setLoading(true);
    }
    lastScopeRef.current = scopeKey;
    fetchAttendance();
  }, [fetchAttendance]);

  // Re-fetch on tab focus
  useFocusEffect(
    useCallback(() => {
      fetchAttendance();
      fetchSessionStatus();
    }, [fetchAttendance, fetchSessionStatus])
  );

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetchAttendance();
    fetchSessionStatus();
  }, [fetchAttendance, fetchSessionStatus]);

  // ── Toggle clock-in session open/closed ───────────────────────────────────
  const toggleClockinSession = useCallback(async () => {
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
  }, [isSessionOpen, isChurchMode, activeChurch?.id, activeZone?.id]);

  /** Add a record optimistically (used by scanner and manual check-in) */
  const addRecord = useCallback((record: AttendanceRecord) => {
    setAllRecords(prev => [record, ...prev]);
  }, []);

  return {
    allRecords,
    loading,
    refreshing,
    isSessionOpen,
    togglingSession,
    refetch,
    toggleClockinSession,
    addRecord,
  };
}
