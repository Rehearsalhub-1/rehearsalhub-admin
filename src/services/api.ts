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
    logout: (refreshToken?: string) =>
      apiClient.post<{ success: boolean }>('/auth/logout', { refreshToken }).catch(() => ({ success: true })),
    storeTokens: (accessToken: string, refreshToken: string, userId: string = '') =>
      apiClient.storeTokens(accessToken, refreshToken, userId),
    clearTokens: () => apiClient.clearTokens(),
  },

  // ── Dashboard Metrics ────────────────────────────────────────────────────
  dashboard: {
    getStats: async (zoneId?: string, churchId?: string) => {
      const zoneParam = zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : '';
      const [zoneSongsRes, membersRes, programsRes, submittedRes] = await Promise.all([
        apiClient.get<any>(`/songs/zone${zoneParam}`).catch(() => ({ data: [] })),
        churchId
          ? apiClient.get<any>(`/subgroups/${churchId}/members`).catch(() => ({ data: [] }))
          : apiClient.get<any>(`/profiles/directory${zoneParam}`).catch(() => ({ data: [] })),
        apiClient.get<any>(`/programs${zoneParam}`).catch(() => ({ data: [] })),
        apiClient.get<any>(`/submitted-songs${zoneParam}`).catch(() => ({ data: [] })),
      ]);

      const songs = Array.isArray(zoneSongsRes?.data) ? zoneSongsRes.data : [];
      const members = Array.isArray(membersRes?.data) ? membersRes.data : [];
      const programs = Array.isArray(programsRes?.data) ? programsRes.data : [];
      const submitted = Array.isArray(submittedRes?.data) ? submittedRes.data : [];

      const activePrograms = programs.filter((p: any) => (p.status || p.category) === 'ongoing');
      const upcomingPrograms = programs.filter((p: any) => (p.status || p.category) === 'pre-rehearsal');

      return {
        totalSongs: songs.length,
        pendingSongs: submitted.filter((s: any) => s.status === 'pending').length,
        totalMembers: members.length,
        activePrograms: activePrograms.length,
        currentLiveProgram: activePrograms[0] || upcomingPrograms[0] || null,
        recentSubmissions: submitted.slice(0, 5),
      };
    },
  },

  // ── Songs & Master Catalog ────────────────────────────────────────────────
  songs: {
    getMasterSongs: (params?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/songs/master${params ? `?${params}` : ''}`),
    getZoneSongs: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/songs/zone${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    getById: (songId: string) =>
      apiClient.get<{ success: boolean; data: any }>(`/songs/${songId}`),
    getPraiseNightSongs: (praiseNightId: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/songs/praise-night?praiseNightId=${encodeURIComponent(praiseNightId)}`),
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
      if (typeof paramsOrZoneId === 'string') {
        if (paramsOrZoneId) params.append('zoneId', paramsOrZoneId);
      } else if (paramsOrZoneId) {
        if (paramsOrZoneId.zoneId) params.append('zoneId', paramsOrZoneId.zoneId);
        if (paramsOrZoneId.category) params.append('category', paramsOrZoneId.category);
        if (paramsOrZoneId.groupId) params.append('groupId', paramsOrZoneId.groupId);
        if (paramsOrZoneId.subGroupId) params.append('subGroupId', paramsOrZoneId.subGroupId);
        if (paramsOrZoneId.includeChurch) params.append('includeChurch', 'true');
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiClient.get<{ success: boolean; data: any[] }>(`/programs${query}`);
    },
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
  },

  // ── Members & Profiles ───────────────────────────────────────────────────
  members: {
    getDirectory: (zoneId?: string, limit = 500, search = '') => {
      const params = new URLSearchParams();
      params.append('limit', String(limit));
      if (zoneId) params.append('zoneId', zoneId);
      if (search) params.append('search', search);
      return apiClient.get<{ success: boolean; data: any[] }>(`/profiles/directory?${params.toString()}`);
    },
    getAdminRequests: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/members/admin-requests${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    updateRole: (userId: string, role: string) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/members/${userId}`, { role }),
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
  },

  // ── Media & Cloudflare R2 Uploads ────────────────────────────────────────
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
      apiClient.post<{ success: boolean }>('/notifications', payload),
  },

  // ── Rehearsal Schedules ──────────────────────────────────────────────────
  schedule: {
    getAll: (zoneId?: string) =>
      apiClient.get<{ success: boolean; data: any[] }>(`/schedule${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),
    create: (data: Record<string, any>) =>
      apiClient.post<{ success: boolean; data?: any }>('/schedule', data),
    update: (scheduleId: string, data: Record<string, any>) =>
      apiClient.patch<{ success: boolean; data?: any }>(`/schedule/${scheduleId}`, data),
    delete: (scheduleId: string) =>
      apiClient.delete<{ success: boolean }>(`/schedule/${scheduleId}`),
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

  // ── Health ───────────────────────────────────────────────────────────────
  health: () =>
    apiClient.get<{ status: string }>('/health').catch(() => null),
};

export default api;
