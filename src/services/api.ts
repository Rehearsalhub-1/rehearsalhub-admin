import { apiClient } from '../lib/apiClient';

/**
 * ============================================================================
 * Centralized API Service for RehearsalHub Admin
 * All admin screens connect through this single service.
 * ============================================================================
 */

export const api = {
  // ── Auth & Session ────────────────────────────────────────────────────────
  auth: {
    me: () => apiClient.get<{ success: boolean; data: any }>('/auth/me'),
    login: (identifier: string, password: string) =>
      apiClient.post<{ success: boolean; data?: any; error?: string }>('/auth/login', { identifier, password }),
    kingschatLogin: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; code?: string; accounts?: any[]; data?: any; error?: string }>('/auth/kingschat-login', data),
    logout: (refreshToken?: string) =>
      apiClient.post<{ success: boolean }>('/auth/logout', { refreshToken }).catch(() => ({ success: true })),
    storeTokens: (accessToken: string, refreshToken: string, userId: string = '') =>
      apiClient.storeTokens(accessToken, refreshToken, userId),
    clearTokens: () => apiClient.clearTokens(),
  },

  // ── Dashboard Metrics ────────────────────────────────────────────────────
  // Stats are fetched directly from /admin/dashboard/stats by useDashboardData.
  // No client-side aggregation — the API does it in a single DB round-trip.
  dashboard: {
    getStats: (_zoneId?: string, _churchId?: string) => {
      // Deprecated: use apiClient.get('/admin/dashboard/stats?zoneId=...') directly.
      // Kept as a stub so existing call sites don't crash during the transition.
      console.warn('[api.dashboard.getStats] deprecated — use /admin/dashboard/stats endpoint directly');
      return Promise.resolve({
        totalSongs: 0, pendingSongs: 0, totalMembers: 0,
        activePrograms: 0, currentLiveProgram: null, recentSubmissions: [],
      });
    },
  },

  // ── Songs & Master Catalog ────────────────────────────────────────────────
  songs: {
    getMasterSongs: (params?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/master-songs${params ? `?${params}` : ''}`),
    getMaster: () =>
      apiClient.get<any>('/master-songs'),
    getZoneSongs: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/songs/zone${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    getById: (songId: string) =>
      apiClient.get<{ success: boolean; data: any }>(`/songs/${songId}`),
    getProgramSongs: (programId: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/songs?programId=${encodeURIComponent(programId)}`),
    getPraiseNightSongs: (praiseNightId: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/songs?programId=${encodeURIComponent(praiseNightId)}`),
    getSongHistory: (songId: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/songs/${encodeURIComponent(songId)}/history`),
    createSongHistory: (data: { songId: string; type?: string; description?: string; old_value?: any; new_value?: any }) =>
      apiClient.post<{ success: boolean; data?: any }>('/songs/history', data),
    setActiveSong: (songId: string) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/songs/praise-night/${songId}`, { isActive: true }),
    toggleActive: (songId: string, isActive: boolean) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/songs/praise-night/${songId}`, { isActive }),
    toggleHeard: (songId: string, isHeard: boolean) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/songs/praise-night/${songId}`, { isHeard, status: isHeard ? 'heard' : 'unheard' }),
    create: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; data?: any }>('/songs', data),
    update: (songId: string, data: Record<string, any>) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/songs/${songId}`, data),
    delete: (songId: string) =>
      apiClient.delete<{ success: boolean }>(`/songs/${songId}`),
    createSubgroupSong: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; data?: any }>('/subgroups/songs', data),
    updateSubgroupSong: (songId: string, data: Record<string, any>) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/subgroups/songs/${songId}`, data),
    deleteSubgroupSong: (songId: string) =>
      apiClient.delete<{ success: boolean }>(`/subgroups/songs/${songId}`),
  },

  // ── Programs & Rehearsal Events ──────────────────────────────────────────
  programs: {
    getAll: (paramsOrZoneId?: string | { zoneId?: string; category?: string; groupId?: string; subGroupId?: string; includeChurch?: boolean }) => {
      const params = new URLSearchParams();
      let hasChurch = false;

      if (typeof paramsOrZoneId === 'string') {
        const cleanZone = paramsOrZoneId && paramsOrZoneId !== 'all' && paramsOrZoneId !== 'global' ? paramsOrZoneId : undefined;
        if (cleanZone) params.append('zoneId', cleanZone);
      } else if (paramsOrZoneId) {
        if (paramsOrZoneId.zoneId && paramsOrZoneId.zoneId !== 'all' && paramsOrZoneId.zoneId !== 'global') {
          params.append('zoneId', paramsOrZoneId.zoneId);
        }
        if (paramsOrZoneId.groupId) {
          params.append('groupId', paramsOrZoneId.groupId);
          hasChurch = true;
        }
        if (paramsOrZoneId.subGroupId) {
          params.append('subGroupId', paramsOrZoneId.subGroupId);
          hasChurch = true;
        }
        if (paramsOrZoneId.includeChurch) {
          hasChurch = true;
        }
        if (paramsOrZoneId.category && paramsOrZoneId.category !== 'all') {
          params.append('category', paramsOrZoneId.category);
        }
      }

      // Only pass includeChurch=true when explicitly querying for church/subgroup mode
      // Otherwise rehearsalhub-api isolates where.groupId = null, preventing subgroup leaks!
      if (hasChurch) {
        params.append('includeChurch', 'true');
      }

      const query = params.toString() ? `?${params.toString()}` : '';
      return apiClient.get<{ success: boolean; data: any[] }>(`/programs${query}`);
    },
    getMemberRehearsals: () =>
      apiClient.get<{ success: boolean; data: any[] }>('/subgroups/member-rehearsals'),
    getById: (programId: string) =>
      apiClient.get<{ success: boolean; data: any }>(`/programs/${programId}`),
    create: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; data?: any }>('/programs', data),
    update: (programId: string, data: Record<string, any>) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/programs/${programId}`, data),
    delete: (programId: string) =>
      apiClient.delete<{ success: boolean }>(`/programs/${programId}`),
    updateSongIds: (programId: string, songIds: string[]) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/programs/${programId}`, { songIds }),
    updateCategoryOrder: (programId: string, categoryOrder: string[]) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/programs/${programId}`, { categoryOrder }),
  },

  // ── Submitted Songs (Review Pipeline) ────────────────────────────────────
  submittedSongs: {
    getAll: (zoneId?: string, status?: string) => {
      const params = new URLSearchParams();
      if (zoneId) params.append('zoneId', zoneId);
      if (status) params.append('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiClient.get<{ success: boolean; data: any[] }>(`/submitted-songs${query}`);
    },
    updateStatus: (id: string, status: string) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/submitted-songs/${id}`, { status }),
    approve: (id: string) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/submitted-songs/${id}`, { status: 'approved' }),
    reject: (id: string, reason?: string) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/submitted-songs/${id}`, { status: 'rejected', rejectNotes: reason }),
    reply: (id: string, message: string, senderName?: string, replyTo?: any) =>
      apiClient.post<{ success: boolean; data?: any }>(`/submitted-songs/${id}/reply`, { message, senderName, replyTo }),
    delete: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/submitted-songs/${id}`),
  },

  // ── Members & Profiles ───────────────────────────────────────────────────
  members: {
    getGlobalMembers: (search?: string) =>
      apiClient.get<{ success: boolean; count: number; data: any[] }>(`/members?scope=global${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    getDirectory: (zoneId?: string, limit = 500, search = '') => {
      const params = new URLSearchParams();
      params.append('limit', String(limit));
      if (zoneId) {
        params.append('zone_code', zoneId);
        params.append('zoneId', zoneId);
      }
      if (search) params.append('search', search);
      return apiClient.get<{ success: boolean; data: any[] }>(`/profiles/directory?${params.toString()}`);
    },
    getZoneMembers: (zoneId: string) =>
      apiClient.get<{ success: boolean; count?: number; data: any[] }>(`/members/zone/${encodeURIComponent(zoneId)}`),
    getAdminRequests: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/members/admin-requests${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    updateRole: (userId: string, role: string) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/members/${userId}`, { role }),
    updateProfile: (id: string, data: Record<string, any>) =>
      apiClient.patch<{ success: boolean; error?: string; data?: any }>(`/profiles/${encodeURIComponent(id)}`, data),
    suspend: (id: string) =>
      apiClient.post<{ success: boolean }>(`/profiles/${encodeURIComponent(id)}/suspend`, {}),
    reactivate: (id: string) =>
      apiClient.post<{ success: boolean }>(`/profiles/${encodeURIComponent(id)}/reactivate`, {}),
    ban: (id: string) =>
      apiClient.post<{ success: boolean }>(`/profiles/${encodeURIComponent(id)}/ban`, {}),
    removeFromZone: (id: string) =>
      apiClient.post<{ success: boolean }>(`/profiles/${encodeURIComponent(id)}/remove-from-zone`, {}),
    delete: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/profiles/${encodeURIComponent(id)}`),
    approve: (id: string) =>
      apiClient.post<{ success: boolean }>(`/profiles/${encodeURIComponent(id)}/approve`, {}),
    reject: (id: string, reason?: string) =>
      apiClient.post<{ success: boolean }>(`/profiles/${encodeURIComponent(id)}/reject`, { reason }),
    approveAdminRequest: (requestId: string) =>
      apiClient.post<{ success: boolean }>(`/members/admin-requests/${requestId}/approve`, {}),
    rejectAdminRequest: (requestId: string) =>
      apiClient.post<{ success: boolean }>(`/members/admin-requests/${requestId}/reject`, {}),
  },

  // ── Churches & Subgroups ─────────────────────────────────────────────────
  churches: {
    mine: () =>
      apiClient.get<{ success: boolean; data: any[] }>('/subgroups/mine'),
    coordinated: () =>
      apiClient.get<{ success: boolean; data: any[] }>('/subgroups/coordinated'),
    getAll: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/subgroups${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    getRequests: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/subgroups/requests${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    create: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; data?: any }>('/subgroups', data),
    approve: (churchId: string) =>
      apiClient.post<{ success: boolean }>(`/subgroups/${churchId}/approve`, {}),
    reject: (churchId: string, reason = 'Declined by coordinator') =>
      apiClient.post<{ success: boolean }>(`/subgroups/${churchId}/reject`, { reason }),
    addCoordinator: (churchId: string, data: { userId?: string; identifier?: string; name?: string }) =>
      apiClient.post<{ success: boolean }>(`/subgroups/${churchId}/coordinators`, data),
    getMembers: (churchId: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/subgroups/${churchId}/members`),
    addMember: (data: { subGroupId: string; userId: string; role?: string }) =>
      apiClient.post<{ success: boolean }>('/subgroups/members', data),
    removeMember: (subgroupId: string, userId: string) =>
      apiClient.delete<{ success: boolean }>(`/subgroups/members?subGroupId=${encodeURIComponent(subgroupId)}&userId=${encodeURIComponent(userId)}`),
  },

  // ── Organizations / Zones ────────────────────────────────────────────────
  organizations: {
    getAll: () =>
      apiClient.get<{ success: boolean; data: any[] }>('/organizations'),
    getMine: () =>
      apiClient.get<{ success: boolean; data: any }>('/members/mine'),
  },

  // ── Attendance Tracking ──────────────────────────────────────────────────
  attendance: {
    getAll: (zoneId?: string, programId?: string, date?: string, subGroupId?: string) => {
      const params = new URLSearchParams();
      if (zoneId) params.append('zoneId', zoneId);
      if (subGroupId) params.append('subGroupId', subGroupId);
      if (programId) params.append('programId', programId);
      if (date) params.append('date', date);
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiClient.get<{ success: boolean; data: any[] }>(`/attendance${query}`);
    },
    getActiveCode: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: { code?: string; active?: boolean } }>(
        `/attendance/code${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`
      ),
    setActiveCode: (code: string, active = true, zoneId?: string, validMinutes = 60) =>
      apiClient.post<{ success: boolean; data: { code?: string; active?: boolean } }>('/attendance/code', {
        code,
        active,
        validMinutes,
        zoneId,
      }),
    recordCheckIn: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; data?: any }>('/attendance', data),
    deleteRecord: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/attendance/${id}`),
    getSession: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: { zoneId: string; isOpen: boolean; lastToggledAt: string | null; toggledBy: string | null } }>(
        `/attendance/session${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`
      ),
    toggleSession: (zoneId: string, isOpen: boolean) =>
      apiClient.post<{ success: boolean; data: { zoneId: string; isOpen: boolean; lastToggledAt: string; toggledBy: string } }>(
        '/attendance/session/toggle',
        { zoneId, isOpen }
      ),
    checkIn: (payload: { userId?: string; eventName?: string; qrCode?: string; zoneId?: string; programId?: string }) =>
      apiClient.post<{ success: boolean; data: any }>('/attendance/check-in', payload),
    createManual: (payload: { name: string; eventName?: string; zoneId?: string }) =>
      apiClient.post<{ success: boolean; data: any }>('/attendance/manual', payload),
  },

  // ── Media Assets & Cloud Uploads ────────────────────────────────────────
  media: {
    getAll: (zoneId?: string, limit = 100, type?: string) => {
      const params = new URLSearchParams();
      params.append('limit', String(limit));
      if (zoneId) params.append('zoneId', zoneId);
      if (type) params.append('type', type);
      return apiClient.get<{ success: boolean; data: any[] }>(`/media?${params.toString()}`);
    },
    create: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; data?: any }>('/media', data),
    update: (mediaId: string, data: Record<string, any>) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/media/${mediaId}`, data).catch(() => ({ success: true })),
    delete: (mediaId: string) =>
      apiClient.delete<{ success: boolean }>(`/media/${mediaId}`),
    upload: async (file: { uri: string; name: string; type: string }, folder = 'rehearsals') => {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
      formData.append('folder', folder);
      return apiClient.upload<{ success: boolean; data: { url: string; key: string; size: number } }>('/upload', formData);
    },
  },

  // ── Broadcast Notifications ──────────────────────────────────────────────
  notifications: {
    getAll: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/notifications${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    broadcast: (payload: { title: string; message: string; priority?: string; category?: string; targetAudience?: string }) =>
      apiClient.post<{ success: boolean }>('/notifications/broadcast', payload),
    send: (payload: Record<string, any>) =>
      apiClient.post<{ success: boolean; recipientCount?: number }>('/notifications', payload),
    getSent: () =>
      apiClient.get<{ success: boolean; count: number; data: any[] }>('/notifications/sent'),
  },

  // ── Helpdesk & Support Desk ──────────────────────────────────────────────
  support: {
    getThreads: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/support${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    getMessages: (threadId: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/support/${threadId}/messages`),
    sendMessage: (threadId: string, payload: { message: string; attachments?: any[] }) =>
      apiClient.post<{ success: boolean; data?: any }>(`/support/${threadId}/messages`, payload),
    updateStatus: (threadId: string, status: string) =>
      apiClient.patch<{ success: boolean }>(`/support/${threadId}`, { status }),
  },

  // ── Categories ───────────────────────────────────────────────────────────
  categories: {
    getAll: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/categories${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    getPage: () =>
      apiClient.get<{ success: boolean; data: any[] }>('/categories/page'),
    create: (data: { name: string; color?: string; description?: string; isActive?: boolean }) =>
      apiClient.post<{ success: boolean; data?: any }>('/categories', data),
    update: (id: string, data: { name?: string; color?: string }) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/categories/${id}`, data),
    delete: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/categories/${id}`),
  },

  // ── System Audit Logs ────────────────────────────────────────────────────
  activityLogs: {
    getAll: () =>
      apiClient.get<{ success: boolean; data: any[] }>('/activity-logs'),
  },

  // ── Analytics ────────────────────────────────────────────────────────────
  analytics: {
    getOverview: () =>
      apiClient.get<{ success: boolean; data: { totalSingers: number; totalZones: number; totalChurches: number; globalAttendanceRate: number; totalAttendanceRecords: number } }>('/analytics/overview'),
    getEvents: (limit = 100) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/analytics/events?limit=${limit}`),
  },

  // ── Organizations & Zones ────────────────────────────────────────────────
  zones: {
    getAll: () =>
      apiClient.get<{ success: boolean; data: any[] }>('/organizations'),
    getById: (id: string) =>
      apiClient.get<{ success: boolean; data: any }>(`/organizations/${id}`),
  },

  // ── Settings & Geofence ───────────────────────────────────────────────────
  settings: {
    get: (key: string) =>
      apiClient.get<{ success: boolean; data: any }>(`/settings/${encodeURIComponent(key)}`),
    update: (key: string, data: Record<string, any>) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/settings/${encodeURIComponent(key)}`, data),
  },

  // ── Rehearsal Schedule & Timetable Board ──────────────────────────────────
  schedule: {
    getAll: (zoneId?: string, isArchived?: boolean, subGroupId?: string) => {
      const params = new URLSearchParams();
      if (zoneId && zoneId !== 'all') params.append('zoneId', zoneId);
      if (subGroupId) params.append('subGroupId', subGroupId);
      if (isArchived !== undefined) params.append('isArchived', String(isArchived));
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiClient.get<{ success: boolean; data: any[] }>(`/schedules${query}`);
    },
    getById: (id: string) =>
      apiClient.get<{ success: boolean; data: any }>(`/schedules/${id}`),
    create: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; data: any }>('/schedules', data),
    update: (id: string, data: Record<string, any>) =>
      apiClient.patch<{ success: boolean; data: any }>(`/schedules/${id}`, data),
    delete: (id: string) =>
      apiClient.delete<{ success: boolean; message?: string }>(`/schedules/${id}`),
    makeCurrent: (id: string, weekId?: string, dayId?: string) =>
      apiClient.patch<{ success: boolean; data: any }>(`/schedules/${id}`, {
        isCurrent: true,
        ...(weekId ? { currentWeekId: weekId } : {}),
        ...(dayId ? { currentDayId: dayId } : {}),
      }),
    toggleArchive: (id: string, isArchived: boolean) =>
      apiClient.patch<{ success: boolean; data: any }>(`/schedules/${id}`, { isArchived }),
  },

  // ── Calendar & Upcoming Events ──────────────────────────────────────────
  calendar: {
    getEvents: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/upcoming-events${zoneId && zoneId !== 'all' ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    create: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; data?: any }>('/upcoming-events', data),
    update: (id: string, data: Record<string, any>) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/upcoming-events/${id}`, data),
    delete: (id: string) =>
      apiClient.delete<{ success: boolean; message?: string }>(`/upcoming-events/${id}`),
  },

  // ── Health ───────────────────────────────────────────────────────────────
  health: () =>
    apiClient.get<{ status: string }>('/health').catch(() => null),
};

export { SessionExpiredError } from '../lib/apiClient';
export default api;
