/**
 * useAdminResource is replaced by usePrograms / useMembers / useDashboardData.
 * This stub keeps old import sites from crashing during migration.
 */
export interface AdminScope {
  zoneId: string;
  isChurchMode: boolean;
  churchId: string | null;
  churchName: string | null;
}

export function useAdminResource<T = any>(
  _getEndpoint: (scope: AdminScope) => string | null,
  _options?: { skipFocusRefetch?: boolean; transform?: (raw: any[]) => any[] }
) {
  return {
    data: [] as T[],
    loading: false,
    refreshing: false,
    error: null as string | null,
    refetch: () => {},
    scope: {
      zoneId: '',
      isChurchMode: false,
      churchId: null,
      churchName: null,
    } as AdminScope,
  };
}
