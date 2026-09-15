import { useEffect, useRef } from 'react';
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
 * Silently checks for and downloads EAS OTA updates on launch and foreground.
 * The update is applied automatically on the NEXT cold launch — no modal, no interruption.
 */
export function useOTAUpdates() {
  const lastCheckedAt = useRef<number>(0);
  const isChecking = useRef<boolean>(false);

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
        console.log('[OTA] New update found — downloading silently...');
        await Updates.fetchUpdateAsync();
        // Update is now cached. It will be applied automatically on next cold launch.
        // No modal, no interruption — users see the new version next time they open the app.
        console.log('[OTA] Download complete. Will apply on next launch.');
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
        // Still no forced restart — just tell the user it'll apply next time
        return { status: 'updated', message: 'Update downloaded! You\'ll see it next time you open the app.' };
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
    // Kept for backwards compatibility — always false now (no modal shown)
    showUpdateModal: false as const,
    dismissModal: () => {},
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
