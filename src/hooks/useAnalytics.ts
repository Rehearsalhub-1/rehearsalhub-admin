import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Member } from '../components/MemberManagementModal';

interface OverviewStats {
  totalSingers: number;
  totalZones: number;
  totalChurches: number;
  globalAttendanceRate: number;
}

const INITIAL_OVERVIEW: OverviewStats = {
  totalSingers: 0,
  totalZones: 0,
  totalChurches: 0,
  globalAttendanceRate: 0,
};

export function useAnalytics() {
  const { adminUser } = useAuth();
  const isHQ = adminUser?.isHQAdmin === true;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<OverviewStats>(INITIAL_OVERVIEW);
  const [zonesList, setZonesList] = useState<any[]>([]);

  // Member search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // ── Fetch global overview ──────────────────────────────────────────────────
  const fetchGlobalData = useCallback(async () => {
    try {
      const [overviewRes, zonesRes] = await Promise.all([
        api.analytics.getOverview().catch(() => null),
        api.zones.getAll().catch(() => ({ data: [] })),
      ]);
      if (overviewRes?.data) setOverview(overviewRes.data);
      setZonesList(Array.isArray(zonesRes?.data) ? zonesRes.data : []);
    } catch (e) {
      console.error('[useAnalytics] fetchGlobalData:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isHQ) {
      setLoading(true);
      fetchGlobalData();
    }
  }, [isHQ, fetchGlobalData]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetchGlobalData();
  }, [fetchGlobalData]);

  // ── Debounced member search ────────────────────────────────────────────────
  useEffect(() => {
    if (!isHQ || !searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.members.getGlobalMembers(searchQuery.trim());
        setSearchResults(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isHQ]);

  // ── Member management actions ──────────────────────────────────────────────
  const saveMember = useCallback(async (updated: Member) => {
    try {
      if (updated.role) await api.members.updateRole(updated.id, updated.role);
      await api.members.updateProfile(updated.id, {
        role: updated.role,
        is_active: updated.is_active,
        church: updated.church,
        canSeeArchive: updated.canSeeArchive,
        can_access_archive: updated.can_access_archive,
        can_access_ongoing: updated.can_access_ongoing,
        can_access_pre_rehearsal: updated.can_access_pre_rehearsal,
        canAnnotate: updated.canAnnotate,
        hiddenFeatures: updated.hiddenFeatures,
      });
      setSearchResults(prev =>
        prev.map(m => ((m.id || m.userId) === updated.id ? { ...m, role: updated.role, churchName: updated.church } : m))
      );
      Alert.alert('Updated', `${updated.first_name}'s role and access passes were updated successfully.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update member role.');
    }
  }, []);

  const removeMember = useCallback(async (id: string) => {
    try {
      await api.members.removeFromZone(id);
      setSearchResults(prev => prev.filter(m => (m.id || m.userId) !== id));
      Alert.alert('Removed', 'Member was removed from their zone successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to remove member from zone.');
    }
  }, []);

  return {
    isHQ,
    loading,
    refreshing,
    overview,
    zonesList,
    searchQuery,
    setSearchQuery,
    searching,
    searchResults,
    refetch,
    saveMember,
    removeMember,
  };
}
