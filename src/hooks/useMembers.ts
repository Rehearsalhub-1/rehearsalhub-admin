import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { isHQGroup } from '../constants/zones';
import { Member } from '../components/MemberManagementModal';

export type { Member };

export function useMembers() {
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetch = useCallback(async () => {
    try {
      if (isChurchMode && activeChurch?.id) {
        const churchRes = await api.churches.getMembers(activeChurch.id).catch(() => ({ data: [] }));
        const rawChurch = Array.isArray(churchRes?.data) ? churchRes.data : [];
        const mapped: Member[] = rawChurch.map((u: any) => {
          const firstName = u.firstName || (u.name || '').split(' ')[0] || 'Singer';
          const lastName = u.lastName || (u.name || '').split(' ').slice(1).join(' ') || '';
          const r = (u.role || 'member').toLowerCase();
          return {
            id: u.userId || u.id,
            membershipId: u.id,
            first_name: firstName,
            last_name: lastName,
            email: u.email || '',
            username: u.username || '',
            alias: u.alias || '',
            phone: u.phone || '',
            church: activeChurch.name,
            designation: u.voicePart || '',
            zoneId: activeZone?.id || '',
            zoneName: activeZone?.name || '',
            role: (r.includes('admin') || r.includes('coord') ? 'church_admin' : 'member') as any,
            isAdmin: r.includes('admin') || r.includes('coord'),
            is_active: u.status !== 'inactive',
            can_access_ongoing: true,
            can_access_pre_rehearsal: true,
            canAnnotate: true,
            canSeeArchive: false,
            can_access_archive: false,
            created_at: u.joinedAt,
            pending_hq_approval: false,
          };
        });
        setMembers(mapped);
        return;
      }

      const resolvedZoneId = activeZone?.id || 'zone-001';
      const isHQ = isHQGroup(resolvedZoneId);

      const [dirRes, reqRes] = await Promise.all([
        (isHQ
          ? api.members.getDirectory(undefined, 1000)
          : api.members.getZoneMembers(resolvedZoneId).catch(() => api.members.getDirectory(resolvedZoneId))
        ).catch(() => ({ data: [] })),
        api.members.getAdminRequests(isHQ ? undefined : resolvedZoneId).catch(() => ({ data: [] })),
      ]);

      const rawDir = Array.isArray(dirRes?.data) ? dirRes.data : [];
      const rawReqs = Array.isArray(reqRes?.data) ? reqRes.data : [];

      const mappedMembers: Member[] = rawDir.map((u: any) => {
        const userObj = u.user || u.profile || u;
        const uid = userObj.id || u.userId || u.id;
        const firstName = userObj.firstName || userObj.first_name || (userObj.name || '').split(' ')[0] || 'Singer';
        const lastName = userObj.lastName || userObj.last_name || (userObj.name || '').split(' ').slice(1).join(' ') || '';
        const r = (u.role || userObj.role || 'member').toLowerCase();
        return {
          id: uid,
          membershipId: u.id || u.membershipId || uid,
          first_name: firstName,
          last_name: lastName,
          email: userObj.email || u.email || '',
          username: userObj.username || u.username || '',
          alias: userObj.alias || u.alias || '',
          phone: userObj.phone || u.phone || '',
          church: u.churchName || u.church || '',
          designation: u.voicePart || u.designation || '',
          zoneId: u.organizationId || u.zoneId || activeZone?.id || '',
          zoneName: u.organization?.name || u.zoneName || activeZone?.name || '',
          role: (r.includes('admin') || r.includes('coord')
            ? r.includes('church') ? 'church_admin' : r.includes('hq') ? 'hq_admin' : 'zone_admin'
            : 'member') as any,
          isAdmin: r.includes('admin') || r.includes('coord'),
          is_active: u.status !== 'INACTIVE' && u.is_active !== false && u.isActive !== false,
          can_access_ongoing: u.can_access_ongoing !== false,
          can_access_pre_rehearsal: u.can_access_pre_rehearsal !== false,
          canAnnotate: u.canAnnotate !== false,
          canSeeArchive: u.canSeeArchive === true || u.canAccessArchive === true,
          can_access_archive: u.canSeeArchive === true || u.canAccessArchive === true,
          hiddenFeatures: u.hiddenFeatures,
          created_at: u.joinedAt || u.createdAt || u.created_at,
          pending_hq_approval: false,
        };
      });

      const mappedPending: Member[] = rawReqs.map((req: any) => {
        const userObj = req.user || req;
        const uid = req.userId || userObj.id || req.id;
        const firstName = userObj.firstName || userObj.first_name || (userObj.name || '').split(' ')[0] || 'Applicant';
        const lastName = userObj.lastName || userObj.last_name || (userObj.name || '').split(' ').slice(1).join(' ') || '';
        return {
          id: uid,
          membershipId: req.id || req.membershipId || uid,
          first_name: firstName,
          last_name: lastName,
          email: userObj.email || req.email || '',
          username: userObj.username || req.username || '',
          alias: userObj.alias || req.alias || '',
          phone: userObj.phone || req.phone || '',
          church: req.church || '',
          zoneId: req.zoneId || activeZone?.id || '',
          zoneName: req.zoneName || activeZone?.name || '',
          role: 'member' as any,
          isAdmin: false,
          is_active: false,
          pending_hq_approval: true,
          created_at: req.createdAt || req.created_at,
        };
      });

      // Strict deduplication by id + email
      const seenKeys = new Set<string>();
      const combined: Member[] = [];

      for (const m of mappedMembers) {
        const idKey = m.id ? `id:${m.id}` : null;
        const emailKey = m.email ? `email:${m.email.toLowerCase().trim()}` : null;
        if ((idKey && seenKeys.has(idKey)) || (emailKey && seenKeys.has(emailKey))) continue;
        if (idKey) seenKeys.add(idKey);
        if (emailKey) seenKeys.add(emailKey);
        combined.push(m);
      }

      for (const p of mappedPending) {
        const idKey = p.id ? `id:${p.id}` : null;
        const emailKey = p.email ? `email:${p.email.toLowerCase().trim()}` : null;
        const isDuplicate = (idKey && seenKeys.has(idKey)) || (emailKey && seenKeys.has(emailKey));
        if (isDuplicate) {
          const existing = combined.find(
            x => (idKey && `id:${x.id}` === idKey) || (emailKey && x.email && `email:${x.email.toLowerCase().trim()}` === emailKey)
          );
          if (existing) existing.pending_hq_approval = true;
        } else {
          if (idKey) seenKeys.add(idKey);
          if (emailKey) seenKeys.add(emailKey);
          combined.push(p);
        }
      }

      setMembers(combined);
    } catch (err) {
      console.warn('[useMembers] fetch error:', err);
      setMembers([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [activeZone?.id, isChurchMode, activeChurch?.id]);

  // Reset stale data and re-fetch on scope change
  const lastScopeRef = useRef<string>('');
  useEffect(() => {
    const scopeKey = `${activeZone?.id ?? ''}:${isChurchMode ? (activeChurch?.id ?? '') : ''}`;
    if (lastScopeRef.current !== '' && lastScopeRef.current !== scopeKey) {
      setMembers([]);
      setLoading(true);
    }
    lastScopeRef.current = scopeKey;
    fetch();
  }, [fetch]);

  // Re-fetch on tab focus
  useFocusEffect(
    useCallback(() => {
      fetch();
    }, [fetch])
  );

  const refetch = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const approve = useCallback(async (member: Member) => {
    setMembers(prev =>
      prev.map(m => m.id === member.id ? { ...m, pending_hq_approval: false, is_active: true } : m)
    );
    try {
      await Promise.all([
        api.members.approve(member.id).catch(() => {}),
        api.members.approveAdminRequest(member.id).catch(() => {}),
      ]);
    } catch (e) {
      console.warn('[useMembers] approve sync error:', e);
    }
    Alert.alert('Approved', `${member.first_name} ${member.last_name} has been approved.`);
  }, []);

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
            setMembers(prev => prev.filter(m => m.id !== member.id));
            try {
              await Promise.all([
                api.members.reject(member.id).catch(() => {}),
                api.members.rejectAdminRequest(member.id).catch(() => {}),
              ]);
            } catch (e) {
              console.warn('[useMembers] reject sync error:', e);
            }
          },
        },
      ]
    );
  }, []);

  const saveMember = useCallback(async (updated: Member) => {
    setMembers(prev => prev.map(m => (m.id === updated.id ? updated : m)));
    try {
      if (updated.role) await api.members.updateRole(updated.id, updated.role).catch(() => {});
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
    } catch (err) {
      console.warn('[useMembers] saveMember error:', err);
    }
  }, []);

  const removeFromZone = useCallback((id: string) => {
    const target = members.find(m => m.id === id);
    const scopeLabel = isChurchMode
      ? `this church choir (${activeChurch?.name})`
      : 'the zone directory';
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${target?.first_name || 'this member'} from ${scopeLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setMembers(prev => prev.filter(m => m.id !== id));
            if (isChurchMode && activeChurch?.id) {
              await api.churches.removeMember(activeChurch.id, id).catch(() => {});
            } else {
              await api.members.removeFromZone(id).catch(() => {});
            }
            Alert.alert('Removed', `${target?.first_name || 'Member'} was removed.`);
          },
        },
      ]
    );
  }, [members, isChurchMode, activeChurch]);

  return {
    members,
    loading,
    refreshing,
    refetch,
    approve,
    reject,
    saveMember,
    removeFromZone,
  };
}
