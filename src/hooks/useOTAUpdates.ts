import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // re-check at most every 15 min when foregrounded

export interface OTACheckResult {
  status: 'updated' | 'up_to_date' | 'disabled' | 'error';
  message: string;
}

/**
 * useOTAUpdates
 *
 * Silently checks for an EAS OTA (JS bundle) update on app launch and foreground transitions.
 * Returns `showUpdateModal` + `dismissModal` to drive <OTAUpdateModal /> instead of Alert.
 */
export function useOTAUpdates() {
  const lastCheckedAt = useRef<number>(0);
  const isChecking = useRef<boolean>(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const runBackgroundCheck = async () => {
    if (__DEV__ || !Updates.isEnabled) return;
    if (isChecking.current) return;

    const now = Date.now();
    if (now - lastCheckedAt.current < CHECK_INTERVAL_MS) return;

    isChecking.current = true;
    lastCheckedAt.current = now;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        console.log('[OTA] Auto-downloading new update in background...');
        await Updates.fetchUpdateAsync();
        console.log('[OTA] Auto-download complete — showing modal.');
        // Show custom modal instead of Alert so users see spinner on restart
        setShowUpdateModal(true);
      }
    } catch (err: any) {
      console.warn('[OTA] Background check warning:', err?.message || err);
    } finally {
      isChecking.current = false;
    }
  };

  /** Call from a manual "Check for Updates" button */
  const checkManually = async (): Promise<OTACheckResult> => {
    if (__DEV__ || !Updates.isEnabled) {
      return { status: 'disabled', message: 'OTA updates are only active in Release builds.' };
    }
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        setShowUpdateModal(true);
        return { status: 'updated', message: 'Update downloaded and ready to apply.' };
      }
      return { status: 'up_to_date', message: 'App is already up to date.' };
    } catch (err: any) {
      return { status: 'error', message: err?.message || String(err) };
    }
  };

  useEffect(() => {
    runBackgroundCheck();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        runBackgroundCheck();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    showUpdateModal,
    dismissModal: () => setShowUpdateModal(false),
    checkManually,
  };
}

/**
 * Standalone function for manually triggering an OTA check from a settings screen.
 * @deprecated Prefer using the `checkManually` return value from `useOTAUpdates()` instead.
 */
export async function checkAndApplyUpdate(isManual: boolean = false): Promise<OTACheckResult> {
  console.log('[OTA] Status check:', {
    isEnabled: Updates.isEnabled,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  });

  if (__DEV__ || !Updates.isEnabled) {
    const msg = 'OTA updates are only active in Release builds.';
    console.log(`[OTA] ${msg}`);
    return { status: 'disabled', message: msg };
  }

  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Caller is responsible for showing the modal
      return { status: 'updated', message: 'Update downloaded and ready to apply.' };
    }
    return { status: 'up_to_date', message: 'App is already up to date.' };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('[OTA] Update check failed:', errMsg);
    return { status: 'error', message: errMsg };
  }
}
