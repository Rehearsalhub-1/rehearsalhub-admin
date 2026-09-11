import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAdminStore } from '../stores/adminStore';
import { api } from '../services/api';
import { customAlert } from '../context/AlertContext';

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
  const userObj = u.user || u.profile || {};
  const rawRoleStr = (u.rawRole || u.role || userObj.role || 'member').toLowerCase();
  const isAdmin = Boolean(
    u.isAdmin ||
    rawRoleStr.includes('admin') ||
    rawRoleStr.includes('coord') ||
    rawRoleStr === 'org_admin' ||
    rawRoleStr === 'group_admin'
  );
  const role: Member['role'] = isAdmin
    ? (rawRoleStr.includes('church') || rawRoleStr === 'group_admin' ? 'church_admin'
      : rawRoleStr.includes('hq') ? 'hq_admin'
      : 'zone_admin')
    : 'member';

  const rawFirstName =
    u.firstName ||
    u.first_name ||
    userObj.firstName ||
    userObj.first_name ||
    (u.displayName ? u.displayName.split(' ')[0] : '') ||
    (u.userName ? u.userName.split(' ')[0] : '') ||
    (u.name ? u.name.split(' ')[0] : '') ||
    (userObj.name ? userObj.name.split(' ')[0] : '');

  const rawLastName =
    u.lastName ||
    u.last_name ||
    userObj.lastName ||
    userObj.last_name ||
    (u.displayName ? u.displayName.split(' ').slice(1).join(' ') : '') ||
    (u.userName ? u.userName.split(' ').slice(1).join(' ') : '') ||
    (u.name ? u.name.split(' ').slice(1).join(' ') : '') ||
    (userObj.name ? userObj.name.split(' ').slice(1).join(' ') : '');

  const email =
    u.email ||
    u.userEmail ||
    userObj.email ||
    userObj.userEmail ||
    '';

  const first_name = rawFirstName || (email ? email.split('@')[0] : 'Singer');
  const last_name = rawLastName || '';

  return {
    id: u.userId || userObj.id || u.id,
    membershipId: u.id || u.membershipId,
    first_name,
    last_name,
    email,
    username: u.username || userObj.username || '',
    alias: u.alias || userObj.alias || '',
    phone: u.phone || userObj.phone || '',
    church:
      churchName ||
      u.church ||
      u.churchName ||
      u.group?.name ||
      u.subgroup?.name ||
      u.subGroup?.name ||
      userObj.group?.name ||
      '',
    designation: u.voicePart || u.designation || userObj.voicePart || userObj.designation || '',
    zoneId: u.organizationId || u.zoneId || '',
    zoneName: u.organization?.name || u.zoneName || '',
    role,
    isAdmin,
    is_active:
      u.status !== 'INACTIVE' &&
      u.status !== 'inactive' &&
      u.is_active !== false &&
      u.isActive !== false,
    can_access_ongoing: u.can_access_ongoing !== false && u.canAccessOngoing !== false,
    can_access_pre_rehearsal: Boolean(u.can_access_pre_rehearsal || u.canAccessPreRehearsal),
    canAnnotate: Boolean(u.canAnnotate || u.can_annotate),
    canSeeArchive: Boolean(u.canSeeArchive || u.canAccessArchive || u.can_access_archive),
    can_access_archive: Boolean(u.canSeeArchive || u.canAccessArchive || u.can_access_archive),
    hiddenFeatures: u.hiddenFeatures,
    pending_hq_approval: false,
    created_at: u.joinedAt || u.createdAt || u.created_at,
    profile_image_url:
      u.avatarUrl ||
      u.profile_image_url ||
      userObj.avatarUrl ||
      userObj.profile_image_url ||
      '',
  };
}

export function useMembers() {
  const session = useAdminStore(s => s.session);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session) return;

    // ONE URL — scoped by mode and role
    const url =
      session.mode === 'church' && session.churchId
        ? `/subgroups/${session.churchId}/members`
        : session.role === 'hq_admin' && (!session.zoneId || session.zoneId === 'hq')
        ? `/members/hq`
        : session.zoneId
        ? `/members/zone/${session.zoneId}`
        : `/members/hq`;

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
  }, [session?.zoneId, session?.churchId, session?.mode, session?.role]);

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
    customAlert('Approved', `${member.first_name} ${member.last_name} has been approved.`);
  }, [refetch]);

  const reject = useCallback((member: Member) => {
    customAlert(
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

  const saveMember = useCallback(async (updated: Member, newPassword?: string) => {
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
      if (newPassword && newPassword.trim()) {
        await apiClient.post(`/profiles/${encodeURIComponent(updated.id)}/password`, { password: newPassword.trim() }).catch(() => {});
      }
      refetch();
    } catch (err: any) {
      const msg = err?.message || 'Failed to save member';
      console.error('[useMembers] saveMember:', msg);
      customAlert('Save Failed', msg);
    }
  }, [refetch]);

  const removeFromZone = useCallback((id: string) => {
    const target = members.find(m => m.id === id);
    customAlert(
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
