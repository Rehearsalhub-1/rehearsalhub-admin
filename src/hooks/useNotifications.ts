import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useNotifications() {
  const [sentHistory, setSentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  const fetchSentHistory = useCallback(async () => {
    try {
      const res = await api.notifications.getSent();
      if (res?.data && Array.isArray(res.data)) {
        setSentHistory(res.data);
      }
    } catch (err) {
      console.warn('[useNotifications] fetchSentHistory:', err);
    } finally {
      setLoadingHistory(false);
      setRefreshingHistory(false);
    }
  }, []);

  /** Call this when the History tab becomes active */
  const loadHistory = useCallback(() => {
    setLoadingHistory(true);
    fetchSentHistory();
  }, [fetchSentHistory]);

  const refreshHistory = useCallback(() => {
    setRefreshingHistory(true);
    fetchSentHistory();
  }, [fetchSentHistory]);

  return {
    sentHistory,
    loadingHistory,
    refreshingHistory,
    loadHistory,
    refreshHistory,
  };
}
