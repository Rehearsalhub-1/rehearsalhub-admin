# Bugfix Requirements Document — Pre-Launch Hardening

## Introduction

RehearsalHub Admin is a React Native / Expo application launching to thousands of users. A pre-launch audit identified **24 bugs** and **10 god files** that must be resolved before the production release. The issues span security vulnerabilities, runtime crashes, silent API failures, scalability limits, UX problems, performance regressions, memory leaks, and dead code. This document captures every defect using the bug condition methodology so that fix-checking and preservation-checking can be applied systematically during implementation.

The bugs are grouped into six priority tiers:
1. **Critical — Security** (bugs 1–2): attack surface in the live APK/IPA
2. **Critical — Crashes & Runtime** (bugs 3–7): conditions that produce white screens or corrupt state
3. **High — Silent Failures** (bugs 8–10): user actions that fail invisibly
4. **High — Error Visibility** (bug 10 screens): fetch errors that show empty lists with no explanation
5. **Medium — Scalability & Performance** (bugs 11–22): issues that degrade under real load
6. **Low — Dead Code & Cleanup** (bugs 23–24): code that should be removed

---

## Bug Analysis

---

### Section 1 — Critical: Security

#### Current Behavior (Defect)

1.1 WHEN the app bundle is extracted from a released APK or IPA THEN the system exposes `EXPO_PUBLIC_INTERNAL_API_KEY` in plain text because the `EXPO_PUBLIC_` prefix causes Metro to inline the value into the JS bundle at build time

1.2 WHEN a WebSocket connection is established THEN the system transmits the JWT access token as a plain-text query-string parameter (`/ws?token=<JWT>`) which causes the full token to appear in server access logs, reverse-proxy logs, and network capture tools

#### Expected Behavior (Correct)

2.1 WHEN the app bundle is extracted from a released APK or IPA THEN the system SHALL NOT expose any API key value in the JS bundle; the key SHALL be passed only via HTTP request headers at runtime where it is protected by TLS and never compiled into the bundle

2.2 WHEN a WebSocket connection is established THEN the system SHALL transmit the JWT via a first-message authentication frame sent over the encrypted WebSocket channel rather than in the URL query string, so the token does not appear in any server-side logs or proxies

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a valid API request is made to any backend endpoint THEN the system SHALL CONTINUE TO include the `x-api-key` header with the correct key value

3.2 WHEN a WebSocket connection is authenticated successfully THEN the system SHALL CONTINUE TO receive real-time events for all subscribed resources

---

### Section 2 — Critical: Crashes & Runtime

#### Current Behavior (Defect)

2.1.1 WHEN any screen component throws an unhandled JavaScript exception THEN the system crashes to a white screen because `ScreenErrorBoundary` exists but is never wrapped around any screen in `AppNavigator.tsx`

2.2.1 WHEN an admin toggles the hidden status of a master song via `toggleHideMasterSong` in `useMasterLibrary.ts` THEN the system updates local React state only and never calls an API endpoint, so the change silently reverts on the next data refetch

2.3.1 WHEN a schedule program is deleted by another admin via WebSocket while the current admin is mid-save in `ScheduleScreen` THEN the system crashes with a TypeError because the non-null assertion `activeProgram!` dereferences a value that has become `undefined`

2.4.1 WHEN `createAudioPlayer` throws during audio playback initiation in `SubmittedSongsScreen` THEN the system sets `playingSongId` before entering the `try` block, so the UI remains permanently stuck in the "playing" state even though no audio is playing

2.5.1 WHEN `adminStore.bootstrap` is called concurrently (e.g., app foreground event fires while a prior call is still awaiting `/auth/me`) THEN the system runs two overlapping bootstrap sequences that race to write conflicting session state, producing a corrupted or partially-overwritten `AdminSession`

#### Expected Behavior (Correct)

2.1.2 WHEN any screen component throws an unhandled JavaScript exception THEN the system SHALL catch the error in a `ScreenErrorBoundary`, display the retry/go-back UI, and keep all other screens functional

2.2.2 WHEN an admin toggles the hidden status of a master song THEN the system SHALL optimistically update local state AND call the appropriate API endpoint (e.g., `PATCH /master-songs/:id` with `{ isHidden: !current }`) and SHALL roll back local state if the API call fails

2.3.2 WHEN `activeProgram` is `null` or `undefined` at the point of a save operation in `ScheduleScreen` THEN the system SHALL guard against the null case, abort the save, and present a user-facing error instead of crashing

2.4.2 WHEN audio playback is initiated in `SubmittedSongsScreen` THEN the system SHALL only set `playingSongId` after `createAudioPlayer` resolves successfully, so a thrown error leaves the UI in a clean non-playing state

2.5.2 WHEN `adminStore.bootstrap` is called while a previous bootstrap call is still in-flight THEN the system SHALL apply a mutex (e.g., an `isBootstrapping` guard flag) so that only one bootstrap sequence executes at a time and concurrent callers wait for or skip the in-flight call

#### Unchanged Behavior (Regression Prevention)

3.1.1 WHEN a screen operates normally without throwing THEN the system SHALL CONTINUE TO render the screen content without any additional error boundary overhead visible to the user

3.2.1 WHEN a master song's hidden status is successfully toggled via the API THEN the system SHALL CONTINUE TO reflect the updated `isHidden` value in the list

3.3.1 WHEN `activeProgram` is defined and valid during a save THEN the system SHALL CONTINUE TO save schedule changes normally

3.4.1 WHEN audio playback starts successfully THEN the system SHALL CONTINUE TO show the playing indicator and allow the user to stop playback

3.5.1 WHEN `adminStore.bootstrap` is called once (normal cold-start path) THEN the system SHALL CONTINUE TO authenticate and populate session state as before

---

### Section 3 — High: Silent Failures

#### Current Behavior (Defect)

3.1.1 WHEN `approveSong`, `rejectSong`, or `deleteSong` fails in `useSubmissions.ts` THEN the system swallows the error with `.catch(() => {})` or `.catch(err => console.warn(...))`, leaves the optimistic UI update in place, and gives the user no indication that their action did not persist

3.2.1 WHEN `handleDeleteMasterSong` fails in `useMasterLibrary` THEN the system keeps the song removed from the local list with no error recovery and no user notification

3.3.1 WHEN a fetch fails in `ActivityLogsScreen`, `SupportChatScreen`, `CalendarScreen`, or `ScheduleScreen` THEN the system only calls `console.log` or `console.error` on the error, leaving the user looking at an empty list with no explanation

#### Expected Behavior (Correct)

3.1.2 WHEN `approveSong`, `rejectSong`, or `deleteSong` fails THEN the system SHALL roll back the optimistic state update to its pre-action value AND display a user-facing error message (toast or alert) so the admin knows the action did not succeed

3.2.2 WHEN `handleDeleteMasterSong` fails THEN the system SHALL roll back the optimistic delete by re-inserting the song into local state at its original position AND display a user-facing error message

3.3.2 WHEN a fetch fails in `ActivityLogsScreen`, `SupportChatScreen`, `CalendarScreen`, or `ScheduleScreen` THEN the system SHALL store an error string in component state AND render a visible, human-readable error message (e.g., an inline error banner or non-empty `ListEmptyComponent`) instead of an unexplained empty list

#### Unchanged Behavior (Regression Prevention)

3.1.3 WHEN `approveSong`, `rejectSong`, or `deleteSong` succeeds THEN the system SHALL CONTINUE TO keep the optimistic update and not trigger any error UI

3.2.3 WHEN `handleDeleteMasterSong` succeeds THEN the system SHALL CONTINUE TO remove the song from the list permanently

3.3.3 WHEN a fetch succeeds in any of those screens THEN the system SHALL CONTINUE TO render the fetched data normally

---

### Section 4 — Medium: Scalability & Performance

#### Current Behavior (Defect)

4.1.1 WHEN `ActivityLogsScreen`, `MediaLibraryScreen`, or `MasterLibraryScreen` loads THEN the system fetches every record from the API with no limit or cursor parameter, causing memory spikes and slow renders as data grows

4.2.1 WHEN any connected admin screen subscribes to a WebSocket resource with `id: 'all'` THEN the system triggers a full data refetch for every incoming event of that resource type regardless of whether the specific record changed, creating O(n×admins) network load

4.3.1 WHEN the Dashboard renders the "Online" dot for a member THEN the system derives presence from the `is_active` profile field (a static database column) rather than real-time connection state, so the indicator is misleading

4.4.1 WHEN a `KeyboardAvoidingView` is rendered on Android THEN the system applies `behavior='padding'` unconditionally, which pushes content incorrectly on Android where `undefined` is the correct value

4.5.1 WHEN `MediaLibraryScreen` renders a load error THEN the system renders the error inside `renderItem` rather than `ListEmptyComponent`, meaning the error appears inline in the list area in an unintuitive location

4.6.1 WHEN `handleMakeCurrent` is called in `ScheduleScreen` THEN the system calls `upsertProgram` N times in a loop (once per program entry), triggering N sequential API calls and N re-renders instead of a single batched update

4.7.1 WHEN `FlashList` is rendered in `MembersScreen`, `SubmittedSongsScreen`, or `MasterLibraryScreen` THEN the system omits `estimatedItemSize`, forcing `FlashList` to measure every item on first render and degrading scroll performance

4.8.1 WHEN `AnalyticsScreen` or `ScheduleScreen` renders a list THEN the system uses `.map()` inside a `ScrollView`, rendering all items into a single non-virtualized DOM tree and causing frame drops with large data sets

4.9.1 WHEN any component consumes `ZoneContext` THEN the system creates new object literals on every render of the context provider, triggering unnecessary re-renders in all consumer components because referential equality fails on every cycle

4.10.1 WHEN `useWebSocket` processes events over a long-running session THEN the `eventCursors` Map grows without bound as new `resource:id` keys are added but never pruned, leaking memory

#### Expected Behavior (Correct)

4.1.2 WHEN `ActivityLogsScreen`, `MediaLibraryScreen`, or `MasterLibraryScreen` loads THEN the system SHALL request a bounded first page (e.g., `limit=50`) and SHALL support a "load more" / infinite-scroll pattern to fetch subsequent pages on demand

4.2.2 WHEN a WebSocket event arrives for a resource with `id: 'all'` subscriptions THEN the system SHALL apply a debounce or differential update strategy so that a burst of events causes at most one refetch per resource per debounce window rather than one refetch per event

4.3.2 WHEN the Dashboard renders presence indicators THEN the system SHALL derive online status only from the WebSocket connection presence channel or equivalent real-time signal, not from the static `is_active` field

4.4.2 WHEN a `KeyboardAvoidingView` is rendered THEN the system SHALL apply `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` so that Android layout is unaffected

4.5.2 WHEN `MediaLibraryScreen` encounters a load error THEN the system SHALL pass the error UI through the `ListEmptyComponent` prop so it is displayed in the correct empty-state slot

4.6.2 WHEN `handleMakeCurrent` is called in `ScheduleScreen` THEN the system SHALL issue a single API call to mark the selected program current and update local state once, not call `upsertProgram` in a loop

4.7.2 WHEN `FlashList` is rendered in `MembersScreen`, `SubmittedSongsScreen`, or `MasterLibraryScreen` THEN the system SHALL include a calibrated `estimatedItemSize` prop appropriate for each screen's item height

4.8.2 WHEN `AnalyticsScreen` or `ScheduleScreen` renders a long list THEN the system SHALL replace the `.map()`-in-`ScrollView` pattern with `FlashList` or `FlatList` with `estimatedItemSize` so items are virtualized

4.9.2 WHEN `ZoneContext` provides its value THEN the system SHALL memoize the returned object with `useMemo` (keyed on the values that actually change) so consumer components only re-render when meaningful data changes

4.10.2 WHEN the `eventCursors` Map in `useWebSocket` grows beyond a configured maximum (e.g., 500 entries) THEN the system SHALL evict the oldest entries to keep memory usage bounded

#### Unchanged Behavior (Regression Prevention)

4.1.3 WHEN the first page of data is loaded in any paginated screen THEN the system SHALL CONTINUE TO display results immediately without requiring a manual "load more" trigger

4.2.3 WHEN a WebSocket event carries a specific record update THEN the system SHALL CONTINUE TO update that record in the local state

4.4.3 WHEN a `KeyboardAvoidingView` is rendered on iOS THEN the system SHALL CONTINUE TO apply `behavior='padding'` as before

4.9.3 WHEN `ZoneContext` values change (e.g., zone switch) THEN the system SHALL CONTINUE TO propagate those changes to all consumers

---

### Section 5 — Medium: Memory Leaks

#### Current Behavior (Defect)

5.1.1 WHEN `SubmittedSongsScreen` unmounts while audio is playing THEN the system does not stop or release the audio player, causing the audio to continue playing in the background and the native audio session to remain open

5.2.1 WHEN `MediaLibraryScreen` unmounts while a toast timer is pending THEN the system does not clear the `toastTimer` ref, causing the timer callback to fire on an unmounted component, potentially triggering a state update on a dead component tree

#### Expected Behavior (Correct)

5.1.2 WHEN `SubmittedSongsScreen` unmounts THEN the system SHALL stop and release the active audio player in the `useEffect` cleanup function so no audio plays after navigation

5.2.2 WHEN `MediaLibraryScreen` unmounts THEN the system SHALL call `clearTimeout(toastTimer.current)` in the `useEffect` cleanup function so no stale callbacks fire after unmount

#### Unchanged Behavior (Regression Prevention)

5.1.3 WHEN the user navigates away from `SubmittedSongsScreen` while no audio is playing THEN the system SHALL CONTINUE TO unmount cleanly with no errors

5.2.3 WHEN a toast notification completes its timer before `MediaLibraryScreen` unmounts THEN the system SHALL CONTINUE TO display the toast and clear the ref normally

---

### Section 6 — Low: Dead Code & Fire-and-Forget Writes

#### Current Behavior (Defect)

6.1.1 WHEN any screen imports from `useAdminResource.ts` THEN the system provides a stub that returns empty data and no-op functions, making any screen relying on it silently broken without any compile-time or runtime warning

6.2.1 WHEN `adminStore.setMode` or `adminStore.setChurch` is called THEN the system calls `SecureStore.setItemAsync` with `.catch(() => {})` in a fire-and-forget pattern, so a SecureStore write failure (e.g., storage full, keychain locked) silently corrupts the persisted session without any logging or recovery

#### Expected Behavior (Correct)

6.1.2 WHEN the codebase is audited for dead code THEN the system SHALL NOT contain `useAdminResource.ts`; all former import sites SHALL have been migrated to `usePrograms`, `useMembers`, `useDashboardData`, or equivalent real hooks before the file is deleted

6.2.2 WHEN `adminStore.setMode` or `adminStore.setChurch` calls `SecureStore.setItemAsync` THEN the system SHALL await the result and log a warning (or surface an error) if the write fails, rather than silently discarding the failure

#### Unchanged Behavior (Regression Prevention)

6.1.3 WHEN screens that previously used `useAdminResource` are migrated THEN the system SHALL CONTINUE TO display their data correctly using the replacement hooks

6.2.3 WHEN `SecureStore.setItemAsync` succeeds in `setMode` or `setChurch` THEN the system SHALL CONTINUE TO persist the updated session as before

---

## God File Refactor Requirements

### Introduction

Ten files have grown to between 860 and 2,847 lines, making them difficult to review, test, and maintain. These must be decomposed before launch to reduce the risk of introducing regressions during last-minute bug fixes.

### Current Behavior (Defect)

7.1.1 WHEN a developer edits logic inside `MediaLibraryScreen.tsx` (2,847 lines), `ProgramSongsScreen.tsx` (1,886 lines), `ScheduleScreen.tsx` (1,827 lines), `ProgramsScreen.tsx` (1,628 lines), `AttendanceScreen.tsx` (1,437 lines), `MasterEditSongModal.tsx` (1,302 lines), `EditSongModal.tsx` (1,159 lines), `SubmissionReviewModal.tsx` (1,142 lines), `MemberManagementModal.tsx` (1,074 lines), or `MembersScreen.tsx` (860 lines) THEN the system requires navigating thousands of lines of interleaved UI, state, and business logic in a single file, increasing the probability of merge conflicts and inadvertent regressions

7.2.1 WHEN `EditSongModal.tsx` and `MasterEditSongModal.tsx` are both maintained THEN the system contains approximately 70% duplicated form logic across the two files, so every form fix must be applied twice and can easily diverge

### Expected Behavior (Correct)

7.1.2 WHEN each god file is refactored THEN the system SHALL decompose each file into focused sub-components, custom hooks, and utility modules such that no single file exceeds 400 lines; extracted pieces SHALL live in co-located subdirectories (e.g., `src/screens/mediaLibrary/`, `src/screens/schedule/`) following the existing pattern in `src/components/editSong/`

7.2.2 WHEN `EditSongModal` and `MasterEditSongModal` share form logic THEN the system SHALL extract a shared `BaseSongForm` (or equivalent) component that encapsulates the common ~70% of fields and behavior; each modal SHALL compose `BaseSongForm` and add only its own distinctive fields or actions

### Unchanged Behavior (Regression Prevention)

3.7.1 WHEN any god file is refactored THEN the system SHALL CONTINUE TO pass all existing feature behaviors — no user-visible functionality SHALL be removed or altered as a side effect of the file split

3.7.2 WHEN `EditSongModal` and `MasterEditSongModal` are unified via a shared base THEN the system SHALL CONTINUE TO support all field types, validation rules, and submission flows present in both modals before the refactor

---

## Bug Condition Summary

The following pseudocode formalises the fix-checking and preservation-checking contracts for the most critical defects.

```pascal
// ── Security: API Key Exposure ──────────────────────────────────────────────
FUNCTION isBugCondition_APIKey(X)
  INPUT: X of type BuildArtifact
  OUTPUT: boolean
  RETURN X contains substring matching /EXPO_PUBLIC_INTERNAL_API_KEY.*=.*\S+/
END FUNCTION

FOR ALL X WHERE isBugCondition_APIKey(X) DO
  ASSERT X.extractedBundle does NOT contain raw API key value
END FOR

FOR ALL X WHERE NOT isBugCondition_APIKey(X) DO
  ASSERT F(X) = F'(X)  // request headers still carry the key at runtime
END FOR


// ── Security: JWT in WebSocket URL ─────────────────────────────────────────
FUNCTION isBugCondition_WSToken(X)
  INPUT: X of type WebSocketConnectionAttempt
  OUTPUT: boolean
  RETURN X.url contains "?token="
END FUNCTION

FOR ALL X WHERE isBugCondition_WSToken(X) DO
  result ← connectWebSocket'(X)
  ASSERT result.url does NOT contain "?token="
  ASSERT result.authenticated = true
END FOR


// ── Crash: No Error Boundary ────────────────────────────────────────────────
FUNCTION isBugCondition_NoBoundary(X)
  INPUT: X of type ScreenRender
  OUTPUT: boolean
  RETURN X.screenComponent throws an unhandled exception
END FUNCTION

FOR ALL X WHERE isBugCondition_NoBoundary(X) DO
  result ← renderScreen'(X)
  ASSERT result = ErrorBoundaryUI  // not white screen
  ASSERT otherScreens.unaffected = true
END FOR


// ── Silent Failure: Optimistic mutation with swallowed error ────────────────
FUNCTION isBugCondition_SilentFail(X)
  INPUT: X of type MutationAttempt
  OUTPUT: boolean
  RETURN X.apiCall throws OR X.apiCall resolves with success = false
END FUNCTION

FOR ALL X WHERE isBugCondition_SilentFail(X) DO
  result ← mutate'(X)
  ASSERT result.localStateRolledBack = true
  ASSERT result.userNotified = true
END FOR

FOR ALL X WHERE NOT isBugCondition_SilentFail(X) DO
  ASSERT F(X) = F'(X)  // optimistic update stays, no error shown
END FOR


// ── Bootstrap Mutex ─────────────────────────────────────────────────────────
FUNCTION isBugCondition_Bootstrap(X)
  INPUT: X of type BootstrapCallSequence
  OUTPUT: boolean
  RETURN X.concurrentCallCount > 1
END FUNCTION

FOR ALL X WHERE isBugCondition_Bootstrap(X) DO
  result ← bootstrap'(X)
  ASSERT result.finalSessionState.corrupted = false
  ASSERT result.apiCallCount = 1
END FOR
```
