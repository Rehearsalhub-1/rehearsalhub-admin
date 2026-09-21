# Pre-Launch Hardening — Bugfix Design

## Overview

This document specifies the concrete implementation plan for all 24 bugs and the god-file refactor
identified in the pre-launch audit. Fixes are grouped into seven sections matching the requirements
document. For every bug the design identifies the exact file(s) and functions to change, the minimal
diff required, and the preservation contract that must hold after the change.

The testing strategy follows the bug-condition methodology: exploratory tests run on **unfixed** code
to confirm root causes; fix-checking tests verify the corrected behaviour; preservation-checking tests
(including property-based tests where the input domain is large) verify nothing else regressed.

---

## Glossary

- **Bug_Condition C(X)**: predicate that is `true` when input `X` triggers the defective behaviour
- **Property P(result)**: the correct outcome the fixed code must produce for every `X` where `C(X)` holds
- **Preservation ¬C(X)**: inputs that do not trigger the bug; the fixed code must produce the same result as the original
- **F**: the original (unfixed) function
- **F′**: the fixed function
- **Optimistic mutation**: local state is updated immediately; the API call runs asynchronously
- **Mutex flag**: a boolean guard that prevents a critical section from running concurrently
- **LRU eviction**: evicts the least-recently-used entry when a cache exceeds its capacity limit
- **God file**: a single source file that has grown to contain multiple unrelated concerns (UI, state, API calls, utilities), making it difficult to review, test, or merge safely

---

## Bug Details

### Section 1 — Security

#### Bug S-1: `EXPO_PUBLIC_INTERNAL_API_KEY` inlined into JS bundle

**Bug Condition:**
```
FUNCTION isBugCondition_S1(X)
  INPUT: X of type BuildArtifact (APK/IPA JS bundle)
  OUTPUT: boolean
  RETURN X.bundle contains regex /EXPO_PUBLIC_INTERNAL_API_KEY\s*[:=]\s*\S+/
         OR X.bundle contains the raw API key string value
END FUNCTION
```

Metro Bundler inlines every `process.env.EXPO_PUBLIC_*` variable at build time. The key is
compiled directly into the JavaScript bundle and is trivially extractable with `apktool` or `ipatool`.

**Concrete example:**
- Current: `apiClient.ts` line 9 reads `process.env.EXPO_PUBLIC_INTERNAL_API_KEY`; Metro replaces
  this with the literal key string in the production bundle.
- `services/api.ts` line 259 (media upload) also reads `process.env.EXPO_PUBLIC_INTERNAL_API_KEY`
  directly in the upload headers.

---

#### Bug S-2: JWT transmitted in WebSocket URL query string

**Bug Condition:**
```
FUNCTION isBugCondition_S2(X)
  INPUT: X of type WebSocketConnectionAttempt
  OUTPUT: boolean
  RETURN X.url contains "?token="
END FUNCTION
```

`useWebSocket.ts` `connect()` currently builds the URL as
`${WS_URL}/ws?token=${encodeURIComponent(token)}`.
Server-side access logs, load-balancer logs, and HTTP/2 CONNECT proxy logs all record the full URL,
exposing the JWT.

---

### Section 2 — Crashes & Runtime

#### Bug C-1: No ScreenErrorBoundary wrapping in AppNavigator

**Bug Condition:**
```
FUNCTION isBugCondition_C1(X)
  INPUT: X of type ScreenRender
  OUTPUT: boolean
  RETURN X.screenComponent throws an unhandled JavaScript exception
         AND no React error boundary is wrapping the component tree
END FUNCTION
```

`AppNavigator.tsx` registers 25+ screen components; none is wrapped in `ScreenErrorBoundary`.
An uncaught `TypeError` in any screen propagates to the root and produces a white screen for
the entire app.

---

#### Bug C-2: `toggleHideMasterSong` never calls the API

**Bug Condition:**
```
FUNCTION isBugCondition_C2(X)
  INPUT: X of type ToggleHideRequest { songId: string }
  OUTPUT: boolean
  RETURN X is a valid toggle request
         AND the API endpoint PATCH /master-songs/:id was NOT called
END FUNCTION
```

`useMasterLibrary.ts` `toggleHideMasterSong` only calls `setMasterSongs`; there is no
`api.songs.updateMasterSong` (or equivalent `apiClient.patch`) call anywhere in the function body.

---

#### Bug C-3: Non-null assertion on `activeProgram` in `ScheduleScreen`

**Bug Condition:**
```
FUNCTION isBugCondition_C3(X)
  INPUT: X of type SaveAttempt
  OUTPUT: boolean
  RETURN activeProgram is null or undefined
         AND updateProgramData or handleMakeCurrent is called
END FUNCTION
```

`updateProgramData` contains `upsertProgram({ ...activeProgram!, ...payload })`. If another admin
deletes the active schedule via WebSocket between the user pressing save and the handler executing,
`activeProgram` is `undefined` and the `!` assertion throws `TypeError: Cannot spread undefined`.

---

#### Bug C-4: `playingSongId` set before `createAudioPlayer` succeeds

**Bug Condition:**
```
FUNCTION isBugCondition_C4(X)
  INPUT: X of type AudioPlayRequest
  OUTPUT: boolean
  RETURN createAudioPlayer(X.url) throws an exception
         AND playingSongId was already set to X.songId
END FUNCTION
```

`SubmittedSongsScreen.tsx` `handleToggleQuickAudio` (lines 103–108 approx) calls
`setPlayingSongId(song.id)` before `createAudioPlayer`. If the player constructor throws, the
`catch` sets `playingSongId(null)` — but only if the catch block runs. If the exception is
unhandled or the component unmounts during the try, the state is left as `song.id` with no player.
The fix must move `setPlayingSongId` to after `player.play()` succeeds.

---

#### Bug C-5: Concurrent `bootstrap()` calls race on session state

**Bug Condition:**
```
FUNCTION isBugCondition_C5(X)
  INPUT: X of type BootstrapCallSequence
  OUTPUT: boolean
  RETURN X.concurrentCallCount > 1
         AND the first call has not yet resolved /auth/me
END FUNCTION
```

`adminStore.ts` `bootstrap()` has no guard. When the app resumes from background while a prior
bootstrap is mid-await, two overlapping calls write to `session` concurrently, potentially
persisting a partial or stale session to SecureStore.

---

### Section 3 — Silent Failures

#### Bug SF-1: Swallowed errors in `useSubmissions` mutations

`approveSong`, `rejectSong`, and `deleteSong` all fire the API call with `.catch(() => {})` or
`.catch(err => console.warn(...))`, leaving the optimistic state update in place with no user
notification on failure.

#### Bug SF-2: No rollback in `handleDeleteMasterSong`

`useMasterLibrary.ts` `removeMasterSong` is called optimistically; if the subsequent API call
fails, the song is gone from the list with no recovery or notification.

#### Bug SF-3: Fetch errors show empty list with no explanation

`ActivityLogsScreen`, `SupportChatScreen`, `CalendarScreen`, and `ScheduleScreen` all catch fetch
errors with only `console.log` / `console.error`. The component never sets an error string in state,
so the user sees an empty list with no explanation.

---

### Section 4 — Scalability & Performance

- **P-1** — `ActivityLogsScreen`, `MediaLibraryScreen`, `MasterLibraryScreen`: no pagination  
- **P-2** — `id: 'all'` WebSocket subscriptions trigger full refetch per event  
- **P-4** — `KeyboardAvoidingView behavior='padding'` applied on Android  
- **P-5** — `MediaLibraryScreen` load error rendered inside `renderItem`  
- **P-6** — `handleMakeCurrent` calls `upsertProgram` in a `forEach` loop (N mutations)  
- **P-7** — `FlashList` in `MembersScreen`, `SubmittedSongsScreen`, `MasterLibraryScreen` missing `estimatedItemSize`  
- **P-8** — `.map()`-in-`ScrollView` in `AnalyticsScreen` and `ScheduleScreen`  
- **P-9** — `ZoneContext` value object created on every render  
- **P-10** — `eventCursors` Map in `useWebSocket` grows unbounded  

---

### Section 5 — Memory Leaks

- **ML-1** — `SubmittedSongsScreen`: audio player not released on unmount  
- **ML-2** — `MediaLibraryScreen`: `toastTimer` ref not cleared on unmount  

---

### Section 6 — Dead Code & Fire-and-Forget

- **DC-1** — `useAdminResource.ts` stub: all import sites must be migrated before deletion  
- **DC-2** — `adminStore.ts` `setMode` / `setChurch`: `SecureStore.setItemAsync` called fire-and-forget  

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All authenticated HTTP requests must continue to include `x-api-key` in the request header with the correct value read at runtime from a non-`EXPO_PUBLIC_` env variable.
- WebSocket connections must continue to receive real-time events for all subscribed resources after authentication via first-frame message.
- Screens that render without throwing must continue to render normally with no visible boundary overhead.
- Successful optimistic mutations must keep the UI state without triggering error UI.
- All existing pagination-free screens not listed in P-1 must continue to load their full data sets.
- `KeyboardAvoidingView` must continue to apply `behavior='padding'` on iOS.
- `ZoneContext` consumers must re-render when zone/church actually changes.

---

## Hypothesized Root Causes

1. **EXPO_PUBLIC_ prefix misuse**: The prefix was likely chosen for parity with the web admin env convention, without awareness that Expo/Metro treats it as "embed at build time".
2. **WS token in URL**: Carried over from a rapid prototype; the backend currently validates the token from the query string and was never updated to accept a first-frame auth message.
3. **Missing error boundary wiring**: `withErrorBoundary` HOC and `ScreenErrorBoundary` class exist but `AppNavigator` was never updated to use them.
4. **Incomplete optimistic mutation pattern**: `toggleHideMasterSong` was implemented as a local-only preview without the matching API call being added.
5. **Missing null guard**: `activeProgram!` assertion was added for TypeScript satisfaction rather than true safety.
6. **Premature state update**: `setPlayingSongId` was placed before the async operation it depends on, a common ordering mistake in async handlers.
7. **No bootstrap mutex**: The bootstrap function was written assuming single-caller semantics; background-resume events were added later without updating the guard logic.
8. **Error-swallowing convention**: `.catch(() => {})` was used as a quick silence-TypeScript pattern rather than a deliberate recovery strategy.
9. **No error state in simple screens**: `ActivityLogsScreen` and peers were scaffolded as happy-path-only screens.
10. **Unbounded fetch**: API endpoints were called without limit/offset parameters because the data sets were small during development.
11. **Debounce omission**: `id: 'all'` subscriptions were added for broad coverage without considering the fan-out cost.
12. **Platform.OS branch missing**: `KeyboardAvoidingView` was set to `padding` globally following iOS-centric documentation examples.
13. **Wrong render slot for error**: The load error was placed in `renderItem` because the loading state and error state use the same `if/else` chain that was later factored incorrectly.
14. **N-loop upsert**: `programs.forEach(p => upsertProgram(...))` was written to update isCurrent across all programs locally; a single `api.schedule.makeCurrent` call handles the server side but the local sync loops unnecessarily.
15. **Missing `estimatedItemSize`**: Left as TODO; FlashList silently falls back to expensive measurement.
16. **ScrollView/.map() pattern**: Used for simplicity in early-iteration screens; never replaced with virtualization when data sets grew.
17. **ZoneContext value not memoized**: `useZoneContext()` returns a new object literal on every render of every consumer, causing cascading re-renders.
18. **Unbounded Map**: `eventCursors` accumulates a key per `resource:id` pair seen over the lifetime of the WebSocket module singleton; no eviction was implemented.
19. **Audio player leak**: No `useEffect` cleanup was added after the audio logic was extracted to the screen.
20. **Toast timer leak**: The toast timer ref is cleared in the happy-path flow but not in the `useEffect` cleanup return.
21. **`useAdminResource` stub left in place**: The file was kept as a migration bridge but import sites were never fully migrated.
22. **Fire-and-forget SecureStore writes**: `.catch(() => {})` was added to suppress unhandled-promise warnings without implementing proper error handling.

---

## Correctness Properties

Property 1: Security — API Key Not Inlined in Bundle

_For any_ released build artifact where the env var name `INTERNAL_API_KEY` (without `EXPO_PUBLIC_`)
is used, the fixed build SHALL NOT contain the raw API key value in the JS bundle; the value SHALL
only appear at runtime in HTTP request headers protected by TLS.

**Validates: Requirements 1.1, 2.1, 3.1**

---

Property 2: Security — JWT Not in WebSocket URL

_For any_ WebSocket connection attempt, the fixed `connect()` function SHALL build a URL containing
NO `?token=` query parameter; authentication SHALL succeed via the first-frame `{ type: "auth", token }` message.

**Validates: Requirements 1.2, 2.2, 3.2**

---

Property 3: Crash Isolation — ScreenErrorBoundary Catches All Screen Exceptions

_For any_ screen component that throws an unhandled JavaScript exception, the fixed `AppNavigator`
SHALL render the `ScreenErrorBoundary` fallback UI for that screen and SHALL leave all other tab
screens unaffected.

**Validates: Requirements 2.1.1, 2.1.2, 3.1.1**

---

Property 4: Optimistic Mutation with Rollback

_For any_ mutation attempt where `isBugCondition_SilentFail(X)` holds (API call throws or returns
failure), the fixed mutation function SHALL restore the pre-mutation local state AND display a
user-facing error message. _For any_ mutation that succeeds, the optimistic state SHALL remain and
no error UI SHALL appear.

**Validates: Requirements 3.1.2, 3.2.2, 3.1.3, 3.2.3**

---

Property 5: Bootstrap Mutex — Single Execution Under Concurrency

_For any_ call sequence where `bootstrap()` is invoked while a prior invocation is still in-flight,
the fixed store SHALL execute exactly one bootstrap sequence to completion and SHALL produce a
non-corrupted `AdminSession`. Subsequent callers SHALL either await the in-flight promise or skip.

**Validates: Requirements 2.5.1, 2.5.2, 3.5.1**

---

Property 6: Preservation — Non-Buggy Inputs Unchanged

_For any_ input where the bug condition does NOT hold (successful mutations, normal screen renders,
single bootstrap calls, iOS KeyboardAvoidingView, successful fetches), the fixed functions SHALL
produce identical results to the original functions.

**Validates: Requirements 3.x.x (all preservation clauses)**

---

## Fix Implementation

### S-1: Rename env var, remove `EXPO_PUBLIC_` prefix

**Files:** `src/lib/apiClient.ts`, `src/services/api.ts`, `.env`, `.env.example`, `app.json`

**Changes:**
1. In `apiClient.ts` line 9: replace `process.env.EXPO_PUBLIC_INTERNAL_API_KEY` with
   `process.env.INTERNAL_API_KEY`.
2. In `services/api.ts` (media upload, approx line 259): replace the same reference.
3. Rename the key in `.env` and `.env.example` from `EXPO_PUBLIC_INTERNAL_API_KEY` to
   `INTERNAL_API_KEY`.
4. In `app.json` (or `eas.json`), if the key is referenced in `extra` or `env`, remove or rename it.
5. The value continues to be injected at runtime via the `x-api-key` header in every `request()` and
   `uploadRequest()` call — no behaviour change for the server.

> **Why this works**: Variables without the `EXPO_PUBLIC_` prefix are not bundled by Metro. They are
> only accessible during a Node.js build step or server process; they do not appear in the JS bundle.
> `INTERNAL_API_KEY` read at runtime via a React Native config plugin or EAS Secret is TLS-protected.

---

### S-2: Move WS JWT to first-frame auth message

**File:** `src/hooks/useWebSocket.ts`

**Changes:**

```typescript
// BEFORE
socket = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);

// AFTER
socket = new WebSocket(`${WS_URL}/ws`);

socket.onopen = () => {
  // First frame: authenticate
  socket?.send(JSON.stringify({ type: 'auth', token }));
  // … then send existing subscriptions
  reconnectDelay = 1000;
  isConnecting = false;
  subscriptions.forEach(({ resource, id }) => { /* unchanged */ });
};
```

The backend must accept a `{ type: "auth", token }` message before any subscriptions. If the backend
requires a protocol change, coordinate with the server team to add that handler. The WebSocket URL
itself becomes `${WS_URL}/ws` with no query parameters.

---

### C-1: Wrap all tab screens in `ScreenErrorBoundary`

**File:** `src/navigation/AppNavigator.tsx`

Apply `withErrorBoundary` HOC from `ScreenErrorBoundary.tsx` to every `Tab.Screen` component and
to every `Stack.Screen` that renders a full screen (not a modal wrapper). The HOC already accepts
`navigation` and passes `onGoBack`:

```typescript
// Add import
import { withErrorBoundary } from '../components/ScreenErrorBoundary';

// Wrap each screen at the point of import or at the Screen component prop:
const SafeDashboard      = withErrorBoundary(DashboardScreen, 'Dashboard');
const SafeSubmittedSongs = withErrorBoundary(SubmittedSongsScreen, 'SubmittedSongs');
const SafeSchedule       = withErrorBoundary(ScheduleScreen, 'Schedule');
// … repeat for all 25+ screens

// Then in MainTabs and Stack:
<Tab.Screen name="Dashboard" component={SafeDashboard} ... />
<Stack.Screen name="SubmittedSongs" component={SafeSubmittedSongs} />
```

The `withErrorBoundary` HOC already exists and handles `navigation.canGoBack()` / `goBack()`.
This is purely a wiring change; no new component logic is required.

---

### C-2: Add API call to `toggleHideMasterSong` with optimistic rollback

**File:** `src/hooks/useMasterLibrary.ts`

```typescript
const toggleHideMasterSong = useCallback(async (id: string) => {
  // 1. Snapshot previous value
  const previous = masterSongs.find(s => s.id === id);
  if (!previous) return;
  const nextHidden = !previous.isHidden;

  // 2. Optimistic update
  setMasterSongs(prev =>
    prev.map(s => (s.id === id ? { ...s, isHidden: nextHidden } : s))
  );

  try {
    await apiClient.patch(`/master-songs/${id}`, { isHidden: nextHidden });
  } catch (err) {
    // 3. Rollback on failure
    setMasterSongs(prev =>
      prev.map(s => (s.id === id ? { ...s, isHidden: previous.isHidden } : s))
    );
    // 4. Notify user (use Alert or a toast mechanism available in the codebase)
    Alert.alert('Error', 'Failed to update song visibility. Please try again.');
  }
}, [masterSongs]);
```

`apiClient` is already available via import from `../lib/apiClient`. The `PATCH /master-songs/:id`
endpoint is consistent with how `api.songs.update` works for zone songs.

---

### C-3: Guard `activeProgram` null in `ScheduleScreen`

**File:** `src/screens/ScheduleScreen.tsx`

```typescript
const updateProgramData = async (payload: Partial<ScheduleProgram>) => {
  if (!activeProgramId || !activeProgram) {
    customAlert('Error', 'No schedule selected. Please refresh and try again.');
    return;
  }
  try {
    upsertProgram({ ...activeProgram, ...payload }); // remove ! assertion
    await api.schedule.update(activeProgramId, payload);
  } catch (e: any) {
    console.error('[ScheduleScreen] update error:', e);
    customAlert('Error', e?.message || 'Failed to update schedule');
  }
};
```

Remove all `activeProgram!` non-null assertions. The `activeProgram` derivation already returns
`null` via the `useMemo` when `programs` is empty; all call sites of `updateProgramData` and
`handleMakeCurrent` must guard on `activeProgram` being non-null before proceeding.

---

### C-4: Move `setPlayingSongId` after player creation succeeds

**File:** `src/screens/SubmittedSongsScreen.tsx`

```typescript
async function handleToggleQuickAudio(song: SongSubmission) {
  const url = song.audioUrl || (song as any).rawData?.audioUrl;
  if (!url) { showAlert('No Audio', 'No audio track uploaded.'); return; }

  if (playingSongId === song.id && soundRef.current) {
    soundRef.current.pause();
    soundRef.current.remove();
    soundRef.current = null;
    setPlayingSongId(null);
    return;
  }

  if (soundRef.current) {
    soundRef.current.pause();
    soundRef.current.remove();
    soundRef.current = null;
  }

  // ← DO NOT set playingSongId here (was the bug)
  try {
    const player = createAudioPlayer({ uri: url });
    player.play();
    soundRef.current = player;
    setPlayingSongId(song.id); // ← set AFTER player is created and playing
    (player as any).addListener('playbackStatusUpdate', (status: any) => {
      if (status.didJustFinish) setPlayingSongId(null);
    });
  } catch {
    setPlayingSongId(null); // ensure clean state on failure
  }
}
```

---

### C-5: Bootstrap mutex with `isBootstrapping` flag

**File:** `src/stores/adminStore.ts`

```typescript
// Module-level flag (outside the store)
let _bootstrapPromise: Promise<void> | null = null;

// Inside the store:
bootstrap: async () => {
  // If a bootstrap is already running, await it and return
  if (_bootstrapPromise) {
    await _bootstrapPromise;
    return;
  }

  let resolve!: () => void;
  _bootstrapPromise = new Promise<void>(r => { resolve = r; });

  set({ loading: true });
  try {
    // … all existing bootstrap logic unchanged …
  } finally {
    _bootstrapPromise = null;
    resolve();
  }
},
```

Using a Promise-based mutex (rather than a boolean flag) ensures concurrent callers await the
in-flight call and see the final session state rather than triggering a skip.

---

### SF-1: Rollback + toast in `useSubmissions` mutations

**File:** `src/hooks/useSubmissions.ts`

Pattern applied to `approveSong`, `rejectSong`, and `deleteSong`:

```typescript
const approveSong = useCallback(async (id: string) => {
  const previous = songs.find(s => s.id === id);
  if (!previous) return;

  // Optimistic update
  setSongs(prev => prev.map(s => (s.id === id ? { ...s, status: 'approved' } : s)));

  try {
    await api.submittedSongs.approve(id);
  } catch (err: any) {
    // Rollback
    setSongs(prev => prev.map(s => (s.id === id ? previous : s)));
    Alert.alert('Approval Failed', err?.message || 'Could not approve song. Please try again.');
  }
}, [songs]);

const rejectSong = useCallback(async (id: string, notes: string) => {
  const previous = songs.find(s => s.id === id);
  if (!previous) return;
  setSongs(prev => prev.map(s => (s.id === id ? { ...s, status: 'rejected', rejectNotes: notes } : s)));
  try {
    await api.submittedSongs.reject(id, notes);
  } catch (err: any) {
    setSongs(prev => prev.map(s => (s.id === id ? previous : s)));
    Alert.alert('Rejection Failed', err?.message || 'Could not reject song. Please try again.');
  }
}, [songs]);

const deleteSong = useCallback(async (id: string) => {
  const previous = songs.find(s => s.id === id);
  const previousIndex = songs.findIndex(s => s.id === id);
  if (!previous) return;
  setSongs(prev => prev.filter(s => s.id !== id));
  try {
    await api.submittedSongs.delete(id);
  } catch (err: any) {
    // Re-insert at original position
    setSongs(prev => {
      const next = [...prev];
      next.splice(previousIndex, 0, previous);
      return next;
    });
    Alert.alert('Delete Failed', err?.message || 'Could not delete submission. Please try again.');
  }
}, [songs]);
```

---

### SF-2: Rollback in `handleDeleteMasterSong`

**File:** `src/hooks/useMasterLibrary.ts`

```typescript
const removeMasterSong = useCallback(async (id: string) => {
  const previous = masterSongs.find(s => s.id === id);
  const previousIndex = masterSongs.findIndex(s => s.id === id);
  if (!previous) return;

  setMasterSongs(prev => prev.filter(s => s.id !== id));

  try {
    await apiClient.delete(`/master-songs/${id}`);
  } catch (err: any) {
    setMasterSongs(prev => {
      const next = [...prev];
      next.splice(previousIndex, 0, previous);
      return next;
    });
    Alert.alert('Delete Failed', err?.message || 'Could not delete song. Please try again.');
  }
}, [masterSongs]);
```

`removeMasterSong` is renamed to be async; callers do not need to `await` it since errors are
handled internally and UI feedback is provided via `Alert`.

---

### SF-3: Error state + visible error UI in four screens

**Pattern** (applied identically to `ActivityLogsScreen`, `SupportChatScreen`, `CalendarScreen`,
`ScheduleScreen`):

```typescript
// State additions:
const [fetchError, setFetchError] = useState<string | null>(null);

// In fetch function:
async function fetchLogs() {
  setFetchError(null);
  try {
    const result = await api.activityLogs.getAll();
    setLogs(Array.isArray(result.data) ? result.data : []);
  } catch (e: any) {
    setFetchError(e?.message || 'Failed to load activity logs. Pull to retry.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}

// In render, ListEmptyComponent shows the error when set:
ListEmptyComponent={
  fetchError ? (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={36} color="#ef4444" style={{ marginBottom: 10 }} />
      <Text style={styles.errorText}>{fetchError}</Text>
    </View>
  ) : (
    <View style={styles.center}>
      <Text style={styles.emptyText}>No records found</Text>
    </View>
  )
}
```

`ScheduleScreen` additionally renders an inline banner above the schedule list when `fetchError` is
set, since the screen has a more complex layout than a simple list.

---

### P-1: Pagination in ActivityLogsScreen / MediaLibraryScreen / MasterLibraryScreen

Add `limit=50` and cursor/offset parameters. Expose a `loadMore` callback and wire to
`onEndReached` on `FlatList` / `FlashList`.

**ActivityLogsScreen:**
```typescript
const PAGE_SIZE = 50;
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

async function fetchLogs(reset = false) {
  const currentPage = reset ? 1 : page;
  const result = await api.activityLogs.getAll(`?limit=${PAGE_SIZE}&page=${currentPage}`);
  const newLogs = Array.isArray(result.data) ? result.data : [];
  setLogs(prev => reset ? newLogs : [...prev, ...newLogs]);
  setHasMore(newLogs.length === PAGE_SIZE);
  if (!reset) setPage(p => p + 1);
}
```

`api.activityLogs.getAll()` signature updated to accept an optional query string parameter.

**MasterLibraryScreen / MediaLibraryScreen:**  
Same pattern. `useMasterLibrary.ts` and the media fetch gain `page`, `hasMore`, `loadMore` return
values. `FlashList` wires `onEndReached={() => { if (hasMore && !masterLoading) loadMore(); }}`.

---

### P-2: Debounce `id: 'all'` WebSocket subscriptions

**File:** `src/hooks/useWebSocket.ts`

```typescript
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 300;

function debounceHandler(key: string, fn: () => void): void {
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);
  debounceTimers.set(key, setTimeout(() => {
    debounceTimers.delete(key);
    fn();
  }, DEBOUNCE_MS));
}

// In socket.onmessage, when id === 'all':
subscriptions.forEach(({ resource, id, handler }) => {
  if (matchesResource(resource, msg.resource) &&
      (id === msg.id || id === 'all' || msg.id === 'all')) {
    if (id === 'all') {
      debounceHandler(`${resource}:all`, () => {
        try { handler(msg.data); } catch (err) {
          console.warn(`[useWebSocket] Handler error for ${resource}:all:`, err);
        }
      });
    } else {
      try { handler(msg.data); } catch (err) {
        console.warn(`[useWebSocket] Handler error for ${resource}:${id}:`, err);
      }
    }
  }
});
```

---

### P-4: Fix `KeyboardAvoidingView` behavior on Android

**All affected files** (search: `KeyboardAvoidingView` with `behavior="padding"` or `behavior='padding'`):

```tsx
// BEFORE
<KeyboardAvoidingView behavior="padding" ...>

// AFTER
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} ...>
```

Files containing this pattern (from initial audit): `SubmittedSongsScreen.tsx`,
`SubmissionReviewModal.tsx`, `EditSongModal.tsx`, `MasterEditSongModal.tsx`,
`MemberManagementModal.tsx`, `SupportChatScreen.tsx`. Apply across all occurrences.

---

### P-5: Move `MediaLibraryScreen` load error to `ListEmptyComponent`

**File:** `src/screens/MediaLibraryScreen.tsx`

Remove the error branch from inside `renderItem`. Add `loadError` state:

```typescript
const [loadError, setLoadError] = useState<string | null>(null);

// In FlashList/FlatList:
ListEmptyComponent={
  loadError ? (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color="#ef4444" />
      <Text style={styles.errorText}>{loadError}</Text>
    </View>
  ) : (
    <EmptyState message="No media files found" />
  )
}
```

---

### P-6: Fix `handleMakeCurrent` to single local update

**File:** `src/screens/ScheduleScreen.tsx`

The `programs.forEach(p => upsertProgram(...))` loop triggers N store updates. Replace with a single
immutable batch:

```typescript
const handleMakeCurrent = async () => {
  if (!activeProgramId || !activeProgram) return;
  try {
    await api.schedule.makeCurrent(activeProgramId, selectedWeekId, selectedDayId);
    // Single batch update — set isCurrent on all programs at once
    setPrograms(prev => prev.map(p => ({
      ...p,
      isCurrent: p.id === activeProgramId,
      currentWeekId: p.id === activeProgramId ? selectedWeekId : p.currentWeekId,
      currentDayId: p.id === activeProgramId ? selectedDayId : p.currentDayId,
    })));
    customAlert('Active Schedule Set', `"${activeProgram.name}" is now current.`);
  } catch (e: any) {
    customAlert('Error', e?.message || 'Failed to set current program');
  }
};
```

`useSchedule.ts` must expose a `setPrograms` setter (or a `bulkUpdatePrograms` helper) in addition
to `upsertProgram`. If that's not feasible, `upsertProgram` can be called once per changed program
inside a `startTransition` — but a single state update is the cleaner solution.

---

### P-7: Add `estimatedItemSize` to FlashList in three screens

| Screen | List item type | Estimated height |
|--------|---------------|-----------------|
| `MembersScreen` | Member row (avatar + name + role) | 72 |
| `SubmittedSongsScreen` | Song card (grid tile ~160px or list row ~80px) | 80 (list mode) |
| `MasterLibraryScreen` | Song row (title + metadata) | 68 |

```tsx
<FlashList estimatedItemSize={72} ... />
```

---

### P-8: Replace `.map()`-in-`ScrollView` with `FlatList`

**AnalyticsScreen** — the events list:
```tsx
// Replace
<ScrollView>
  {events.map(e => <EventCard key={e.id} item={e} />)}
</ScrollView>

// With
<FlatList
  data={events}
  keyExtractor={e => e.id}
  renderItem={({ item }) => <EventCard item={item} />}
  estimatedItemSize={56}
/>
```

**ScheduleScreen** — the slot list inside the timetable tab uses the same pattern; replace with
`FlatList` scoped to that tab's rendered content.

---

### P-9: Memoize `ZoneContext` value

**File:** `src/context/ZoneContext.tsx`

The `useZoneContext` hook currently returns a new object literal on every call. Since `ZoneContext`
is now a shim over `adminStore`, memoize the return value:

```typescript
export function useZoneContext() {
  const session = useAdminStore(s => s.session);

  return useMemo(() => ({
    activeZone: session ? { id: session.zoneId, name: session.zoneName, invitationCode: '' } : null,
    // … all other fields …
    isChurchMode: session?.mode === 'church',
    // … all methods …
  }), [session]);
}
```

The `useMemo` keyed on `session` means the returned object only changes when the session object
reference changes (i.e., after a bootstrap, setMode, or setChurch call).

---

### P-10: Cap `eventCursors` Map at 500 entries with LRU eviction

**File:** `src/hooks/useWebSocket.ts`

Replace the bare `Map` with a simple LRU:

```typescript
const MAX_CURSORS = 500;
const eventCursors = new Map<string, number>();
const cursorAccessOrder: string[] = [];

function setCursor(key: string, value: number): void {
  if (eventCursors.has(key)) {
    // Move to end (most recently used)
    const idx = cursorAccessOrder.indexOf(key);
    if (idx > -1) cursorAccessOrder.splice(idx, 1);
  } else if (eventCursors.size >= MAX_CURSORS) {
    // Evict least recently used
    const lruKey = cursorAccessOrder.shift();
    if (lruKey) eventCursors.delete(lruKey);
  }
  cursorAccessOrder.push(key);
  eventCursors.set(key, value);
}

// In onmessage, replace direct Map.set:
// eventCursors.set(`${msg.resource}:${msg.id}`, Number(msg.sequence));
// with:
setCursor(`${msg.resource}:${msg.id}`, Number(msg.sequence));
```

---

### ML-1: Audio player cleanup on unmount

**File:** `src/screens/SubmittedSongsScreen.tsx`

```typescript
useEffect(() => {
  return () => {
    // Release audio player when screen unmounts
    if (soundRef.current) {
      soundRef.current.pause();
      soundRef.current.remove();
      soundRef.current = null;
    }
  };
}, []); // empty deps — runs only on mount/unmount
```

---

### ML-2: Clear toast timer on unmount

**File:** `src/screens/MediaLibraryScreen.tsx`

```typescript
useEffect(() => {
  return () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
  };
}, []);
```

---

### DC-1: Migrate `useAdminResource` import sites and delete stub

**File:** `src/hooks/useAdminResource.ts` — **to be deleted**

A search for `useAdminResource` across `src/**/*.tsx` and `src/**/*.ts` currently returns no matches,
which means all import sites have already been removed. Verify this with a final grep before deleting
the file. If any import site is found during implementation, migrate it according to the table:

| Former `useAdminResource` usage | Replacement hook |
|---------------------------------|-----------------|
| Programs list | `usePrograms()` from `hooks/usePrograms.ts` |
| Members list | `useMembers()` from `hooks/useMembers.ts` |
| Dashboard stats | `useDashboardData()` from `hooks/useDashboardData.ts` |
| Attendance records | `useAttendance()` from `hooks/useAttendance.ts` |

After confirming no import sites exist, delete `src/hooks/useAdminResource.ts`.

---

### DC-2: Await `SecureStore.setItemAsync` in `setMode` and `setChurch`

**File:** `src/stores/adminStore.ts`

```typescript
setMode: async (mode) => {
  const { session } = get();
  if (!session) return;
  const updated: AdminSession = { ...session, mode };
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[AdminStore] setMode: SecureStore write failed:', err);
    // Non-fatal — proceed to update in-memory state; next bootstrap will re-sync
  }
  syncScopeFromSession(updated);
  set({ session: updated });
},

setChurch: async (churchId: string) => {
  const { session } = get();
  if (!session) return;
  const church = session.churches.find(item => item.id === churchId);
  if (!church) return;
  const updated: AdminSession = { ...session, mode: 'church', churchId: church.id, churchName: church.name };
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[AdminStore] setChurch: SecureStore write failed:', err);
  }
  syncScopeFromSession(updated);
  set({ session: updated });
},
```

Both methods become `async`. Call sites that do not need to await them will still work correctly
since the in-memory state update (`set(...)`) happens regardless of the SecureStore result.

---

## God File Refactor — Section 7

The goal is to get every file under 400 lines by extracting focused sub-components, custom hooks,
and utility modules into co-located subdirectories. The pattern from `src/components/editSong/`
(8 files, each with a single card or modal) is the template.

No user-visible behaviour changes. All extractions are pure renames/moves of existing code.

---

### 7.1 `MediaLibraryScreen.tsx` (2,847 lines)

**Target directory:** `src/screens/mediaLibrary/`

```
src/screens/mediaLibrary/
├── index.tsx                     ← renamed MediaLibraryScreen.tsx (thin coordinator, <200 lines)
├── useMediaLibrary.ts            ← all fetch/mutation state: media items, pagination, loading,
│                                    loadError, uploadFile, deleteMedia, toastTimer cleanup
├── MediaGridItem.tsx             ← grid tile renderer (image, video thumbnail, type badge)
├── MediaListItem.tsx             ← list row renderer (icon, name, size, date, actions)
├── MediaUploadSheet.tsx          ← bottom-sheet modal for picking and uploading a new file
├── MediaDetailModal.tsx          ← full-screen detail/edit view for a single media item
├── InAppVideoViewer.tsx          ← extracted from current line 99 — video playback component
├── mediaLibraryUtils.ts          ← inferMediaType, getYouTubeId, getYouTubeThumbnail,
│                                    formatFileSize, formatDate (already pure functions)
└── mediaLibraryStyles.ts         ← StyleSheet.create(...) for all sub-components
```

`src/screens/MediaLibraryScreen.tsx` becomes a one-line re-export:
```typescript
export { default } from './mediaLibrary/index';
```

---

### 7.2 `ProgramSongsScreen.tsx` (1,886 lines)

**Target directory:** `src/screens/programSongs/`

```
src/screens/programSongs/
├── index.tsx                     ← thin coordinator, passes props to sub-components
├── useProgramSongs.ts            ← fetch songs for a program, optimistic add/remove/reorder,
│                                    WS subscription, loading/refreshing state
├── SongDetailsModal.tsx          ← extracted from current line 132 — view/edit a single song
├── CloneFromMasterModal.tsx      ← extracted from current line 157 — clone songs from master lib
├── CreateSongModal.tsx           ← extracted from current line 365 — create new song in program
├── EditProgramModal.tsx          ← extracted from current line 389 — rename/edit program metadata
├── SongCard.tsx                  ← individual song row/card in the program list
└── programSongsUtils.ts          ← addSong(), removeSong() pure helpers (lines 30–37)
```

---

### 7.3 `ScheduleScreen.tsx` (1,827 lines)

**Target directory:** `src/screens/schedule/`

```
src/screens/schedule/
├── index.tsx                     ← coordinator: holds top-level state, passes down to sub-screens
├── ScheduleProgramPicker.tsx     ← left-panel / top-bar list of programs with make-current,
│                                    archive, delete actions
├── ScheduleTimetableView.tsx     ← the week/day tab grid with slot cards; receives activeProgram
│                                    and selectedWeekId/selectedDayId as props
├── ScheduleSlotModal.tsx         ← create/edit a single daily slot (time, title, key, allotment,
│                                    status, note)
├── ScheduleGenericItemModal.tsx  ← the generic 6-tab item modal (fields 1–5 + bool)
├── ScheduleSongEligibilityList.tsx ← the eligible/ineligible song filter tab
└── scheduleStyles.ts             ← shared StyleSheet
```

The `useSchedule.ts` hook already exists and covers data-fetching. `ScheduleTimetableView` and
`ScheduleProgramPicker` each receive their data as props from the coordinator `index.tsx`.

---

### 7.4 `ProgramsScreen.tsx` (1,628 lines)

**Target directory:** `src/screens/programs/`

```
src/screens/programs/
├── index.tsx                     ← coordinator, minimal state wiring
├── usePrograms.ts                ← already exists at src/hooks/usePrograms.ts; re-exported here
│                                    for co-location convenience (no duplication)
├── ProgramModal.tsx              ← extracted from current line 167 — create/edit program form
│                                    (548 lines in current file)
├── ProgramCard.tsx               ← extracted from around line 721 — ProgramCardItem component
├── ProgramStatsPanel.tsx         ← extracted from around line 715 — ProgramStats display
├── ProgramsFilterBar.tsx         ← search input + year/stage filter row
└── programUtils.ts               ← formatDisplayDate, getProgramYear, getDatePresets,
                                     normalizeProgramStage (lines 40–156)
```

---

### 7.5 `AttendanceScreen.tsx` (1,437 lines)

**Target directory:** `src/screens/attendance/`

```
src/screens/attendance/
├── index.tsx                     ← thin coordinator
├── AttendanceSessionControls.tsx ← open/close session toggle, current code QR display
├── AttendanceCheckInModal.tsx    ← manual check-in form (name, QR scan input)
├── AttendanceRecordList.tsx      ← FlashList of attendance records + search/filter bar
├── AttendanceRecordCard.tsx      ← individual record row
├── AttendanceCodeManager.tsx     ← set/rotate attendance code, validity timer
└── attendanceStyles.ts           ← shared StyleSheet
```

The `useAttendance.ts` hook already exists; `index.tsx` imports it directly.

---

### 7.6 `MasterEditSongModal.tsx` (1,302 lines) — see also 7.7

See shared `BaseSongForm` extraction in section 7.8 below.

**Target directory:** `src/components/masterEditSong/`

```
src/components/masterEditSong/
├── index.tsx                     ← MasterEditSongModal: composes BaseSongForm + master-only sections
├── MasterCollectionPicker.tsx    ← inline collection/program picker with "New Collection" input
│                                    (unique to master modal; ~80 lines)
├── MasterAccessControl.tsx       ← isHQOnly toggle and visibility settings (~40 lines)
└── masterEditSongStyles.ts       ← any styles not shared with BaseSongForm
```

`src/components/MasterEditSongModal.tsx` becomes:
```typescript
export { default } from './masterEditSong/index';
```

---

### 7.7 `EditSongModal.tsx` (1,159 lines) — see also 7.6

**Target directory:** `src/components/editSong/` (already exists — extend it)

```
src/components/editSong/                  ← existing directory
├── editSongStyles.ts                     ← (exists)
├── FullscreenLyricsModal.tsx             ← (exists)
├── SongAudioStemsCard.tsx                ← (exists)
├── SongCommentsCard.tsx                  ← (exists)
├── SongGeneralCard.tsx                   ← (exists)
├── SongHistoryModal.tsx                  ← (exists)
├── SongLyricsCard.tsx                    ← (exists)
├── SongPersonnelCard.tsx                 ← (exists)
├── BaseSongForm.tsx                      ← NEW — see section 7.8
└── index.tsx                             ← NEW thin wrapper replacing EditSongModal.tsx root
```

`src/components/EditSongModal.tsx` becomes:
```typescript
export { default } from './editSong/index';
```

---

### 7.8 `BaseSongForm` — shared form logic for EditSongModal + MasterEditSongModal

**File:** `src/components/editSong/BaseSongForm.tsx`

The ~70% shared fields and behaviour between the two modals is extracted into one component.

**Shared `BaseSongFormProps` interface:**
```typescript
export interface BaseSongFormProps {
  // Identity
  title: string;
  onTitleChange: (v: string) => void;
  writer: string;
  onWriterChange: (v: string) => void;

  // Music details
  songKey: string;
  onKeyChange: (v: string) => void;
  tempo: string;
  onTempoChange: (v: string) => void;

  // Personnel
  leadSinger: string;
  onLeadSingerChange: (v: string) => void;
  conductor: string;
  onConductorChange: (v: string) => void;
  leadKeyboardist?: string;
  onLeadKeyboardistChange?: (v: string) => void;
  bassGuitarist?: string;
  onBassGuitaristChange?: (v: string) => void;
  drummer?: string;
  onDrummerChange?: (v: string) => void;

  // Audio stems
  audioUrls: Record<string, string>;
  onAudioUrlChange: (part: string, url: string) => void;
  customParts: string[];
  onAddCustomPart: (name: string) => void;

  // Lyrics
  lyrics: string;
  onLyricsChange: (v: string) => void;
  solfa: string;
  onSolfaChange: (v: string) => void;

  // Media
  imageUrl: string;
  onImageUrlChange: (v: string) => void;

  // Categories / programs
  availableCategories: string[];
  selectedCategories: string[];
  onCategoryToggle: (cat: string) => void;

  // Tab navigation (controlled externally so each modal can add its own tabs)
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ id: string; label: string; icon: string }>;

  // Submission
  saving: boolean;
  onSave: () => void;
  onClose: () => void;

  // Optional slot for modal-specific content rendered below shared fields
  extraContent?: React.ReactNode;
}
```

`EditSongModal/index.tsx` renders `<BaseSongForm>` and passes down `PraiseNightSong`-specific state
(status, isActive, programId, rehearsalCount). `masterEditSong/index.tsx` renders `<BaseSongForm>`
and passes down master-specific state (isHQOnly, collectionsList), plus the `extraContent` slot
containing `MasterCollectionPicker` and `MasterAccessControl`.

---

### 7.9 `SubmissionReviewModal.tsx` (1,142 lines)

**Target directory:** `src/components/submissionReview/`

```
src/components/submissionReview/
├── index.tsx                     ← SubmissionReviewModal: thin coordinator
├── SubmissionHeader.tsx          ← song title, submitter name, date, status badge
├── SubmissionAudioPlayer.tsx     ← audio playback bar for the submitted audio track
├── SubmissionConversation.tsx    ← message thread: FlatList of chat bubbles
├── SubmissionReplyBar.tsx        ← text input + send button for admin replies
├── SubmissionActionButtons.tsx   ← Approve / Reject / Delete action row
└── submissionReviewUtils.ts      ← getCleanSubmitterName (line 84) and any other pure helpers
```

---

### 7.10 `MemberManagementModal.tsx` (1,074 lines)

**Target directory:** `src/components/memberManagement/`

```
src/components/memberManagement/
├── index.tsx                     ← MemberManagementModal: thin coordinator
├── MemberProfileHeader.tsx       ← avatar, name, role badge, church tag
├── MemberRoleEditor.tsx          ← role dropdown/picker with save button
├── MemberStatusActions.tsx       ← Suspend / Reactivate / Ban / Remove actions with confirmations
├── MemberChurchAssignment.tsx    ← assign member to a subgroup/church
└── memberManagementStyles.ts     ← shared StyleSheet
```

---

### 7.11 `MembersScreen.tsx` (860 lines)

**Target directory:** `src/screens/members/`

```
src/screens/members/
├── index.tsx                     ← thin coordinator (connects useMembers hook to UI)
├── MemberSearchBar.tsx           ← debounced search input + filter toggles
├── MemberListItem.tsx            ← FlashList row: avatar, name, role, status dot
├── MemberAdminRequestsTab.tsx    ← pending admin-request cards with approve/reject
└── membersStyles.ts              ← shared StyleSheet
```

`MemberManagementModal` is already a separate component file (handled in 7.10); `MembersScreen`
only needs its search, list, and admin-request tab extracted.

---

## Testing Strategy

### Validation Approach

Two phases per bug group:
1. **Exploratory**: run tests on the unfixed code to observe the failure and confirm the root cause.
2. **Fix-checking + Preservation-checking**: run the same tests on the fixed code to verify both the
   fix and non-regression.

---

### Exploratory Bug Condition Checking

**Goal**: Surface concrete counterexamples that demonstrate each bug on unfixed code.

**Security S-1 (Bundle inspection)**
- Build a development bundle and search the output JS for the literal value of `EXPO_PUBLIC_INTERNAL_API_KEY`.
- Expected counterexample: the key value appears verbatim in the bundle.

**Security S-2 (WebSocket URL)**
- Intercept the WebSocket handshake using a local proxy (e.g., mitmproxy or React Native's `__DEV__` network interceptor).
- Expected counterexample: `GET /ws?token=eyJ...` appears in the request log.

**Crash C-1 (Error boundary)**
- Mount a test screen that throws in `render()` without a boundary.
- Expected counterexample: the entire app goes white / throws to the root error handler.

**Crash C-2 (toggleHideMasterSong)**
- Call `toggleHideMasterSong('test-id')` in isolation, intercept network traffic.
- Expected counterexample: zero HTTP requests are made; local state flips but reverts on next fetch.

**Silent Failure SF-1 (approveSong with mock failure)**
- Mock `api.submittedSongs.approve` to throw.
- Expected counterexample: song status stays 'approved' in the list with no error shown.

**Bootstrap C-5 (concurrent calls)**
- Call `adminStore.bootstrap()` twice with a 0ms delay between calls.
- Expected counterexample: `/auth/me` is called twice; `loading` flickers between `true/false/true`.

---

### Fix Checking

```
FOR ALL X WHERE isBugCondition(X) DO
  result ← fixedFunction(X)
  ASSERT expectedBehavior(result)
END FOR
```

**S-1**: After rename, build a production bundle. Assert the bundle does NOT contain the API key string.  
**S-2**: After URL change, assert the WebSocket URL contains no `?token=`; assert auth succeeds via first-frame message.  
**C-1**: After wrapping screens, throw from a screen inside a Jest/RNTL test. Assert `ScreenErrorBoundary` fallback renders; assert other screens still render.  
**C-2**: After API call added, call `toggleHideMasterSong`. Assert `PATCH /master-songs/:id` was called with `{ isHidden: true }`.  
**SF-1**: After rollback added, mock `approve` to throw. Assert song reverts to `'pending'` and `Alert.alert` was called.  
**C-5**: After mutex added, call `bootstrap()` twice concurrently. Assert `/auth/me` called exactly once.

---

### Preservation Checking

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F′(X)
END FOR
```

**Property-based tests are appropriate for:**
- `useSubmissions` mutations: generate random song lists and verify that successful mutations produce
  the same list state as before the fix (no unexpected rollbacks).
- `useWebSocket` LRU eviction: generate sequences of up to 600 distinct resource-id keys and assert
  the Map never exceeds 500 entries and that the 500 most-recently-set keys are always retained.
- `ZoneContext` memoization: render a component consuming `useZoneContext` 100 times without changing
  session; assert reference equality of returned value across all renders.
- Bootstrap mutex: generate random concurrency levels (1–10 concurrent calls) and assert
  `apiCallCount === 1` and `session.corrupted === false` for all cases.

**Unit / integration tests:**
- All existing screen render tests must pass after god-file refactors (no behaviour change).
- `AppNavigator` renders all tab screens without errors after boundary wrapping.
- `KeyboardAvoidingView` renders with `behavior={undefined}` on Android and `'padding'` on iOS.
- `ActivityLogsScreen` renders error banner when fetch throws.
- `SubmittedSongsScreen` `handleToggleQuickAudio` sets `playingSongId` only after `player.play()` returns.
- Audio player cleanup: unmount `SubmittedSongsScreen` while playing; assert `soundRef.current` is null.
- Toast timer cleanup: unmount `MediaLibraryScreen` while timer pending; assert no state update fires.

### Unit Tests

- `toggleHideMasterSong` calls `PATCH /master-songs/:id` with correct body
- `toggleHideMasterSong` rolls back on API failure and calls `Alert.alert`
- `approveSong` / `rejectSong` / `deleteSong` roll back on failure and notify user
- `bootstrap()` concurrent calls produce `apiCallCount === 1`
- `handleMakeCurrent` calls `api.schedule.makeCurrent` exactly once
- `handleToggleQuickAudio` does not set `playingSongId` when `createAudioPlayer` throws
- `setCursor` evicts oldest entry when Map size exceeds 500
- `KeyboardAvoidingView` has `behavior={undefined}` on Android

### Property-Based Tests

- **Mutation rollback invariant**: for any song list state S and any failing mutation M, `M(S).state === S`
- **LRU cap invariant**: for any sequence of setCursor calls, `eventCursors.size <= 500`
- **Memoization stability**: for any unchanged session, `useZoneContext()` returns same object reference
- **Bootstrap idempotency**: for any N ≥ 1 concurrent bootstrap calls, exactly one `/auth/me` request is made

### Integration Tests

- Full sign-in → screen navigation → one screen throws → error boundary shows → back navigation works
- `SubmittedSongsScreen` approve flow: approve → mock failure → list shows original status → alert shown
- `MediaLibraryScreen` unmount while video playing: no console errors, no setState-on-unmounted-component warnings
- `ScheduleScreen` make-current: single API call, all programs in list updated with correct `isCurrent` values
- `MasterLibraryScreen` load more: second page appended to list, not replacing first page
