import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { apiClient } from '../lib/apiClient';
import { useAdminStore } from '../stores/adminStore';
import { api } from '../services/api';

export interface Member {
  id: string;
  membershipId?: string;
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  alias?: string;
  phone?: string;
  church?: string;
  designation?: string;
  zoneId?: string;
  zoneName?: string;
  role: 'member' | 'zone_admin' | 'zone_coordinator' | 'church_admin' | 'church_coordinator' | 'hq_admin';
  isAdmin?: boolean;
  is_active: boolean;
  can_access_ongoing?: boolean;
  can_access_pre_rehearsal?: boolean;
  canAnnotate?: boolean;
  canSeeArchive?: boolean;
  can_access_archive?: boolean;
  hiddenFeatures?: Record<string, boolean>;
  pending_hq_approval?: boolean;
  created_at?: string;
  profile_image_url?: string;
}

function shapeRaw(u: any, churchName?: string): Member {
  const r = (u.role || 'member').toLowerCase();
  const isAdmin = r.includes('admin') || r.includes('coord');
  const role: Member['role'] = isAdmin
    ? r.includes('church') ? 'church_admin'
      : r.includes('hq') ? 'hq_admin'
      : 'zone_admin'
    : 'member';

  return {
    id: u.userId || u.id,
    membershipId: u.id || u.membershipId,
    first_name: u.firstName || u.first_name || (u.name || '').split(' ')[0] || 'Singer',
    last_name: u.lastName || u.last_name || (u.name || '').split(' ').slice(1).join(' ') || '',
    email: u.email || u.userEmail || '',
    username: u.username || '',
    alias: u.alias || '',
    phone: u.phone || '',
    church: churchName || u.church || u.churchName || '',
    designation: u.voicePart || u.designation || '',
    zoneId: u.organizationId || u.zoneId || '',
    zoneName: u.organization?.name || u.zoneName || '',
    role,
    isAdmin,
    is_active:
      u.status !== 'INACTIVE' &&
      u.status !== 'inactive' &&
      u.is_active !== false &&
      u.isActive !== false,
    can_access_ongoing: u.can_access_ongoing !== false,
    can_access_pre_rehearsal: u.can_access_pre_rehearsal !== false,
    canAnnotate: u.canAnnotate !== false,
    canSeeArchive: u.canSeeArchive === true || u.canAccessArchive === true,
    can_access_archive: u.canSeeArchive === true || u.canAccessArchive === true,
    hiddenFeatures: u.hiddenFeatures,
    pending_hq_approval: false,
    created_at: u.joinedAt || u.createdAt || u.created_at,
    profile_image_url: u.avatarUrl || u.profile_image_url || '',
  };
}

export function useMembers() {
  const session = useAdminStore(s => s.session);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session) return;

    // ONE URL — scoped by mode
    const url =
      session.mode === 'church' && session.churchId
        ? `/subgroups/${session.churchId}/members`
        : `/members/zone/${session.zoneId}`;

    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>(url).catch(() => null);
      const raw = Array.isArray(res?.data) ? res.data : [];
      setMembers(
        raw.map(u =>
          shapeRaw(u, session.mode === 'church' ? (session.churchName || '') : undefined)
        )
      );
    } catch (e) {
      console.warn('[useMembers] fetch error:', e);
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.zoneId, session?.churchId, session?.mode]);

  useEffect(() => {
    setMembers([]);
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const approve = useCallback(async (member: Member) => {
    try {
      await Promise.all([
        api.members.approve(member.id).catch(() => {}),
        api.members.approveAdminRequest(member.id).catch(() => {}),
      ]);
      refetch();
    } catch {}
    Alert.alert('Approved', `${member.first_name} ${member.last_name} has been approved.`);
  }, [refetch]);

  const reject = useCallback((member: Member) => {
    Alert.alert(
      'Decline Request',
      `Decline join request from ${member.first_name} ${member.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              api.members.reject(member.id).catch(() => {}),
              api.members.rejectAdminRequest(member.id).catch(() => {}),
            ]);
            refetch();
          },
        },
      ]
    );
  }, [refetch]);

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
      }).catch(() => {});
      refetch();
    } catch (err: any) {
      const msg = err?.message || 'Failed to save member';
      console.error('[useMembers] saveMember:', msg);
      Alert.alert('Save Failed', msg);
    }
  }, [refetch]);

  const removeFromZone = useCallback((id: string) => {
    const target = members.find(m => m.id === id);
    Alert.alert(
      'Remove Member',
      `Remove ${target?.first_name || 'this member'} from ${session?.mode === 'church' ? 'this church choir' : 'the zone directory'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (session?.mode === 'church' && session.churchId) {
              await api.churches.removeMember(session.churchId, id).catch(() => {});
            } else {
              await api.members.removeFromZone(id).catch(() => {});
            }
            refetch();
          },
        },
      ]
    );
  }, [members, session, refetch]);

  return { members, loading, refreshing, refetch, approve, reject, saveMember, removeFromZone };
}
