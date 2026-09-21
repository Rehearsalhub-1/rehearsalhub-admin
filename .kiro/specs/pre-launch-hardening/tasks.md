# Implementation Plan — Pre-Launch Hardening

## Overview

This task list implements all 24 bugs and 10 god-file refactors identified in the pre-launch audit,
following the exploratory bugfix workflow (explore → preserve → implement → validate). Tasks are
ordered by priority: Critical Security first, then Critical Crashes, High Silent Failures,
Medium Scalability & Performance, Medium Memory Leaks, Low Dead Code, and finally God File Refactor.

Each priority group begins with a Property 1 (Bug Condition exploration) task and a Property 2
(Preservation) task that run on unfixed code, followed by the concrete fix tasks, then verification
sub-tasks that re-run the same tests on fixed code.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2] },
    { "wave": 2, "tasks": [3, 4] },
    { "wave": 3, "tasks": [5] },
    { "wave": 4, "tasks": [6, 7] },
    { "wave": 5, "tasks": [8, 9, 10, 11, 12] },
    { "wave": 6, "tasks": [13] },
    { "wave": 7, "tasks": [14, 15] },
    { "wave": 8, "tasks": [16, 17, 18] },
    { "wave": 9, "tasks": [19] },
    { "wave": 10, "tasks": [20, 21, 22, 23, 24, 25, 26, 27, 28] },
    { "wave": 11, "tasks": [29] },
    { "wave": 12, "tasks": [30, 31] },
    { "wave": 13, "tasks": [32] },
    { "wave": 14, "tasks": [33, 34] },
    { "wave": 15, "tasks": [35] },
    { "wave": 16, "tasks": [36, 37, 38, 39, 40] },
    { "wave": 17, "tasks": [41] },
    { "wave": 18, "tasks": [42] },
    { "wave": 19, "tasks": [43, 44, 45] },
    { "wave": 20, "tasks": [46] },
    { "wave": 21, "tasks": [47] }
  ]
}
```

## Tasks

---

## Group 1 — Critical Security (do first)

- [x] 1. Write bug condition exploration test — Security (API Key + WebSocket JWT)
  - **Property 1: Bug Condition** — API Key Inlined in Bundle & JWT in WebSocket URL
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate both security bugs
  - **S-1 Scoped PBT Approach**: Build a dev bundle and search the output JS for the literal value of `EXPO_PUBLIC_INTERNAL_API_KEY`; assert the key value does NOT appear verbatim — this will fail on unfixed code
  - **S-2 Scoped PBT Approach**: Intercept the WebSocket handshake URL; assert `url` does NOT contain `"?token="` — this will fail on unfixed code
  - `isBugCondition_APIKey(X)`: X.bundle contains regex `/EXPO_PUBLIC_INTERNAL_API_KEY.*=.*\S+/`
  - `isBugCondition_WSToken(X)`: X.url contains `"?token="`
  - Expected counterexample S-1: key value appears verbatim in the bundle
  - Expected counterexample S-2: `GET /ws?token=eyJ...` appears in the request log
  - Run tests on UNFIXED code — **EXPECTED OUTCOME**: Both tests FAIL (confirms bugs exist)
  - Document counterexamples found and mark task complete
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests — Security (BEFORE implementing fix)
  - **Property 2: Preservation** — API Key in Headers & WebSocket Real-Time Events
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: on unfixed code, `x-api-key` header is present and correct in every HTTP request
  - Observe: on unfixed code, WebSocket receives real-time events after connection
  - Write property: for all valid API requests, `x-api-key` header value equals the configured key (Preservation Requirement 3.1)
  - Write property: for any authenticated WebSocket connection, subscribed resource events are received (Preservation Requirement 3.2)
  - Verify tests PASS on UNFIXED code (confirms baseline to preserve)
  - _Requirements: 3.1, 3.2_

- [x] 3. Fix S-1 — Rename `EXPO_PUBLIC_INTERNAL_API_KEY` → `INTERNAL_API_KEY`

  - [x] 3.1 Rename env var in all files
    - In `src/lib/apiClient.ts`: replace `process.env.EXPO_PUBLIC_INTERNAL_API_KEY` with `process.env.INTERNAL_API_KEY`
    - In `src/services/api.ts` (media upload, ~line 259): replace same reference
    - In `.env`: rename key from `EXPO_PUBLIC_INTERNAL_API_KEY` to `INTERNAL_API_KEY`
    - In `.env.example`: rename key from `EXPO_PUBLIC_INTERNAL_API_KEY` to `INTERNAL_API_KEY`
    - In `app.json` / `eas.json`: remove or rename any `extra`/`env` reference to the old key name
    - _Bug_Condition: `isBugCondition_APIKey(X)` — X.bundle contains the inlined key value_
    - _Expected_Behavior: built JS bundle does NOT contain raw API key value; key is only present in runtime HTTP headers protected by TLS_
    - _Preservation: all authenticated requests continue to include `x-api-key` header with correct value_
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 3.2 Verify bug condition exploration test now passes (S-1)
    - **Property 1: Expected Behavior** — API Key Not Inlined in Bundle
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Build a dev bundle and assert the key value does not appear
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1_

  - [x] 3.3 Verify preservation tests still pass (S-1)
    - **Property 2: Preservation** — API Key in Headers
    - Re-run preservation tests from task 2
    - Assert all HTTP requests still carry `x-api-key` header with the correct runtime value
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 4. Fix S-2 — Move WebSocket JWT to first-frame auth message

  - [x] 4.1 Update `useWebSocket.ts` connect() function
    - Remove `?token=${encodeURIComponent(token)}` from the WebSocket URL construction
    - Change socket construction to: `socket = new WebSocket(\`${WS_URL}/ws\`)`
    - In `socket.onopen`, send first-frame auth message before any subscriptions: `socket?.send(JSON.stringify({ type: 'auth', token }))`
    - Preserve all existing subscription logic in `socket.onopen` after the auth frame
    - Coordinate with server team if backend needs to be updated to accept `{ type: "auth", token }` first-frame message
    - _Bug_Condition: `isBugCondition_WSToken(X)` — X.url contains `"?token="`_
    - _Expected_Behavior: WebSocket URL is `${WS_URL}/ws` with no query parameters; auth succeeds via first-frame message_
    - _Preservation: WebSocket continues to receive real-time events for all subscribed resources after first-frame auth_
    - _Requirements: 1.2, 2.2, 3.2_

  - [x] 4.2 Verify bug condition exploration test now passes (S-2)
    - **Property 1: Expected Behavior** — JWT Not in WebSocket URL
    - Re-run the SAME test from task 1
    - Assert WebSocket URL contains no `?token=` and connection authenticates successfully
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.2_

  - [x] 4.3 Verify preservation tests still pass (S-2)
    - **Property 2: Preservation** — WebSocket Real-Time Events
    - Re-run preservation tests from task 2
    - Assert subscribed events are still received after first-frame auth
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 5. Checkpoint — Group 1 complete
  - Ensure all Group 1 tests pass, ask the user if questions arise

---

## Group 2 — Critical Crashes

- [x] 6. Write bug condition exploration test — Crashes (C-1 through C-5)
  - **Property 1: Bug Condition** — Crash & Runtime Defects
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples for each crash condition
  - **C-1**: Mount a test screen that throws in `render()`; assert `ScreenErrorBoundary` fallback renders and other screens are unaffected — will fail (white screen instead)
  - **C-2**: Call `toggleHideMasterSong('test-id')` and intercept network traffic; assert `PATCH /master-songs/:id` was called — will fail (zero API calls observed)
  - **C-3**: Set `activeProgram` to `null` then call `updateProgramData({})`; assert no TypeError is thrown — will fail (throws `Cannot spread undefined`)
  - **C-4**: Mock `createAudioPlayer` to throw; assert `playingSongId` remains `null` — will fail (`playingSongId` is set before the try block)
  - **C-5**: Call `bootstrap()` twice with 0ms delay; assert `/auth/me` is called exactly once — will fail (called twice)
  - Run tests on UNFIXED code — **EXPECTED OUTCOME**: All tests FAIL (confirms bugs exist)
  - Document counterexamples and mark task complete
  - _Requirements: 2.1.1, 2.2.1, 2.3.1, 2.4.1, 2.5.1_

- [x] 7. Write preservation property tests — Crashes (BEFORE implementing fix)
  - **Property 2: Preservation** — Normal Screen Renders, Successful Mutations, Single Bootstrap
  - **IMPORTANT**: Follow observation-first methodology on UNFIXED code
  - Observe: screens that render without throwing display content normally
  - Observe: a successful `toggleHideMasterSong` call updates the list
  - Observe: `activeProgram` defined → `updateProgramData` saves normally
  - Observe: `createAudioPlayer` succeeds → `playingSongId` is set and audio plays
  - Observe: single `bootstrap()` call authenticates and populates session
  - Write property: for all normal (non-throwing) screen renders, screen content is visible with no boundary overhead (Preservation 3.1.1)
  - Write property: for any successful `toggleHideMasterSong`, list reflects updated `isHidden` (Preservation 3.2.1)
  - Write property: for defined `activeProgram`, save continues normally (Preservation 3.3.1)
  - Write property: for successful `createAudioPlayer`, `playingSongId` is set to song.id and audio plays (Preservation 3.4.1)
  - Write property: for single bootstrap call, session is populated (Preservation 3.5.1)
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.1.1, 3.2.1, 3.3.1, 3.4.1, 3.5.1_

- [x] 8. Fix C-1 — Wrap all tab/stack screens in ScreenErrorBoundary

  - [x] 8.1 Apply `withErrorBoundary` HOC to every screen in `AppNavigator.tsx`
    - Add import: `import { withErrorBoundary } from '../components/ScreenErrorBoundary'`
    - Create `Safe*` wrapped variants for all 25+ screens at the top of the file (e.g., `const SafeDashboard = withErrorBoundary(DashboardScreen, 'Dashboard')`)
    - Apply to every `Tab.Screen` and every full-screen `Stack.Screen` component prop
    - Modal wrapper screens (not full screens) do not require wrapping
    - _Bug_Condition: `isBugCondition_NoBoundary(X)` — screen throws and no boundary is present_
    - _Expected_Behavior: ScreenErrorBoundary fallback renders for the throwing screen; all other screens remain functional_
    - _Preservation: screens that render normally continue to render content with no boundary overhead_
    - _Requirements: 2.1.1, 2.1.2, 3.1.1_

  - [x] 8.2 Verify bug condition exploration test now passes (C-1)
    - **Property 1: Expected Behavior** — ScreenErrorBoundary Catches All Screen Exceptions
    - Re-run the SAME test from task 6
    - Assert throwing screen shows fallback UI and other screens are unaffected
    - **EXPECTED OUTCOME**: Test PASSES

  - [x] 8.3 Verify preservation tests still pass (C-1)
    - **Property 2: Preservation** — Normal Screen Renders
    - Re-run preservation tests from task 7
    - **EXPECTED OUTCOME**: Tests PASS

- [x] 9. Fix C-2 — Add PATCH API call + optimistic rollback to `toggleHideMasterSong`

  - [x] 9.1 Update `toggleHideMasterSong` in `useMasterLibrary.ts`
    - Snapshot the previous song value before the optimistic update
    - Apply optimistic `setMasterSongs` update (flip `isHidden`)
    - Await `apiClient.patch(\`/master-songs/${id}\`, { isHidden: nextHidden })`
    - On catch: roll back `setMasterSongs` to the previous snapshot
    - On catch: call `Alert.alert('Error', 'Failed to update song visibility. Please try again.')`
    - _Bug_Condition: `isBugCondition_C2(X)` — valid toggle request with no API call made_
    - _Expected_Behavior: `PATCH /master-songs/:id` is called with `{ isHidden: !current }`; on failure, state rolls back and user is notified_
    - _Preservation: successful toggle keeps updated `isHidden` in the list_
    - _Requirements: 2.2.1, 2.2.2, 3.2.1_

  - [x] 9.2 Verify bug condition exploration test now passes (C-2)
    - **Property 1: Expected Behavior** — toggleHideMasterSong calls PATCH API
    - Re-run the SAME test from task 6
    - **EXPECTED OUTCOME**: Test PASSES

  - [x] 9.3 Verify preservation tests still pass (C-2)
    - **Property 2: Preservation** — Successful toggle keeps list updated
    - **EXPECTED OUTCOME**: Tests PASS

- [x] 10. Fix C-3 — Guard `activeProgram` null assertion in `ScheduleScreen.tsx`

  - [x] 10.1 Add null guard to `updateProgramData` and `handleMakeCurrent`
    - At the top of `updateProgramData`: add `if (!activeProgramId || !activeProgram) { customAlert('Error', 'No schedule selected. Please refresh and try again.'); return; }`
    - Remove the `activeProgram!` non-null assertion from `upsertProgram({ ...activeProgram!, ...payload })`
    - Apply the same guard pattern to `handleMakeCurrent`
    - Remove all remaining `activeProgram!` non-null assertions in the file
    - _Bug_Condition: `isBugCondition_C3(X)` — `activeProgram` is null/undefined when save is called_
    - _Expected_Behavior: guard detects null, aborts save, shows user-facing error — no TypeError thrown_
    - _Preservation: when `activeProgram` is defined and valid, save continues normally_
    - _Requirements: 2.3.1, 2.3.2, 3.3.1_

  - [x] 10.2 Verify bug condition exploration test now passes (C-3)
    - **Property 1: Expected Behavior** — No crash when activeProgram is null
    - Re-run the SAME test from task 6
    - **EXPECTED OUTCOME**: Test PASSES

  - [x] 10.3 Verify preservation tests still pass (C-3)
    - **Property 2: Preservation** — Normal saves still work
    - **EXPECTED OUTCOME**: Tests PASS

- [x] 11. Fix C-4 — Move `setPlayingSongId` after `createAudioPlayer` succeeds in `SubmittedSongsScreen.tsx`

  - [x] 11.1 Reorder `setPlayingSongId` in `handleToggleQuickAudio`
    - Remove `setPlayingSongId(song.id)` from before the `try` block
    - Inside the `try` block, call `setPlayingSongId(song.id)` AFTER `player.play()` succeeds
    - In the `catch` block, ensure `setPlayingSongId(null)` is called to clean up state
    - _Bug_Condition: `isBugCondition_C4(X)` — `createAudioPlayer` throws and `playingSongId` was already set_
    - _Expected_Behavior: `setPlayingSongId` is only set after `player.play()` succeeds; a thrown error leaves the UI in a clean non-playing state_
    - _Preservation: when audio starts successfully, `playingSongId` is set and the playing indicator shows_
    - _Requirements: 2.4.1, 2.4.2, 3.4.1_

  - [x] 11.2 Verify bug condition exploration test now passes (C-4)
    - **Property 1: Expected Behavior** — playingSongId not set on createAudioPlayer failure
    - Re-run the SAME test from task 6
    - **EXPECTED OUTCOME**: Test PASSES

  - [x] 11.3 Verify preservation tests still pass (C-4)
    - **Property 2: Preservation** — Successful audio still shows playing indicator
    - **EXPECTED OUTCOME**: Tests PASS

- [x] 12. Fix C-5 — Add bootstrap mutex in `adminStore.ts`

  - [x] 12.1 Implement Promise-based `_bootstrapPromise` mutex
    - Declare module-level `let _bootstrapPromise: Promise<void> | null = null` outside the store
    - At the start of `bootstrap()`: if `_bootstrapPromise` is set, `await _bootstrapPromise; return`
    - Immediately create a new `Promise<void>` and assign it to `_bootstrapPromise`; capture the `resolve` function
    - Wrap all existing bootstrap logic in a `try/finally`
    - In the `finally` block: set `_bootstrapPromise = null` then call `resolve()`
    - _Bug_Condition: `isBugCondition_Bootstrap(X)` — `concurrentCallCount > 1` while first call is still awaiting `/auth/me`_
    - _Expected_Behavior: exactly one bootstrap executes; concurrent callers await the in-flight promise and see final session state_
    - _Preservation: single bootstrap call on cold start continues to authenticate and populate session_
    - _Requirements: 2.5.1, 2.5.2, 3.5.1_

  - [x] 12.2 Verify bug condition exploration test now passes (C-5)
    - **Property 1: Expected Behavior** — Bootstrap executes exactly once under concurrency
    - Re-run the SAME test from task 6
    - Assert `/auth/me` called exactly once for N concurrent bootstrap calls
    - **EXPECTED OUTCOME**: Test PASSES

  - [x] 12.3 Verify preservation tests still pass (C-5)
    - **Property 2: Preservation** — Single bootstrap call still works normally
    - **EXPECTED OUTCOME**: Tests PASS

- [x] 13. Checkpoint — Group 2 complete
  - Ensure all Group 2 tests pass, ask the user if questions arise

---

## Group 3 — High: Silent Failures

- [x] 14. Write bug condition exploration test — Silent Failures (SF-1, SF-2, SF-3)
  - **Property 1: Bug Condition** — Swallowed Errors & Empty Lists on Fetch Failure
  - **CRITICAL**: These tests MUST FAIL on unfixed code
  - **SF-1**: Mock `api.submittedSongs.approve` to throw; assert song status reverts to `'pending'` and `Alert.alert` was called — will fail (status stays 'approved', no alert)
  - **SF-2**: Mock delete API to throw in `handleDeleteMasterSong`; assert song is re-inserted and user is notified — will fail (song stays deleted, no alert)
  - **SF-3**: Mock fetch to throw in `ActivityLogsScreen`; assert a visible error message is rendered — will fail (empty list shown with no explanation)
  - Run tests on UNFIXED code — **EXPECTED OUTCOME**: All tests FAIL
  - Document counterexamples and mark task complete
  - _Requirements: 3.1.1, 3.2.1, 3.3.1_

- [x] 15. Write preservation property tests — Silent Failures (BEFORE implementing fix)
  - **Property 2: Preservation** — Successful Mutations & Successful Fetches
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: successful `approveSong` / `rejectSong` / `deleteSong` keep the optimistic update with no error UI
  - Observe: successful `handleDeleteMasterSong` permanently removes the song from the list
  - Observe: successful fetch in `ActivityLogsScreen` renders the fetched data
  - Write property-based test: for any song list S and any succeeding mutation M, `M(S).state` reflects the mutation and no error alert is shown (Preservation 3.1.3)
  - Write property: successful `handleDeleteMasterSong` keeps song removed (Preservation 3.2.3)
  - Write property: successful fetch renders data normally (Preservation 3.3.3)
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.1.3, 3.2.3, 3.3.3_

- [x] 16. Fix SF-1 — Add rollback + Alert to `approveSong`, `rejectSong`, `deleteSong` in `useSubmissions.ts`

  - [x] 16.1 Update all three mutation functions with snapshot/rollback/Alert pattern
    - `approveSong`: snapshot previous song; optimistic update to `'approved'`; on catch → rollback to previous + `Alert.alert('Approval Failed', ...)`
    - `rejectSong`: snapshot previous song; optimistic update to `'rejected'` with `rejectNotes`; on catch → rollback + `Alert.alert('Rejection Failed', ...)`
    - `deleteSong`: snapshot previous song and its index; optimistic filter; on catch → re-splice at original index + `Alert.alert('Delete Failed', ...)`
    - Remove all `.catch(() => {})` and `.catch(err => console.warn(...))` patterns from these three functions
    - _Bug_Condition: `isBugCondition_SilentFail(X)` — API call throws or returns failure_
    - _Expected_Behavior: local state is rolled back to pre-action value; user sees Alert with error message_
    - _Preservation: successful mutations keep the optimistic update; no error UI shown_
    - _Requirements: 3.1.1, 3.1.2, 3.1.3_

  - [x] 16.2 Verify bug condition exploration test now passes (SF-1)
    - **Property 1: Expected Behavior** — Rollback + Alert on mutation failure
    - Re-run the SAME test from task 14
    - **EXPECTED OUTCOME**: Test PASSES

  - [x] 16.3 Verify preservation tests still pass (SF-1)
    - **Property 2: Preservation** — Successful mutations unchanged
    - **EXPECTED OUTCOME**: Tests PASS

- [x] 17. Fix SF-2 — Add rollback + Alert to `handleDeleteMasterSong` in `useMasterLibrary.ts`

  - [x] 17.1 Update `removeMasterSong` with snapshot/rollback/Alert pattern
    - Snapshot the previous song and its index before the optimistic filter
    - On API failure: re-splice the song at its original index
    - On API failure: call `Alert.alert('Delete Failed', err?.message || 'Could not delete song. Please try again.')`
    - Make `removeMasterSong` async
    - _Bug_Condition: delete API throws after optimistic removal_
    - _Expected_Behavior: song is re-inserted at original position; user is notified_
    - _Preservation: successful delete keeps song removed permanently_
    - _Requirements: 3.2.1, 3.2.2, 3.2.3_

  - [x] 17.2 Verify bug condition exploration test now passes (SF-2)
    - **Property 1: Expected Behavior** — Rollback + Alert on delete failure
    - Re-run the SAME test from task 14
    - **EXPECTED OUTCOME**: Test PASSES

  - [x] 17.3 Verify preservation tests still pass (SF-2)
    - **Property 2: Preservation** — Successful delete unchanged
    - **EXPECTED OUTCOME**: Tests PASS

- [x] 18. Fix SF-3 — Add `fetchError` state + visible error UI to `ActivityLogsScreen`, `SupportChatScreen`, `CalendarScreen`, `ScheduleScreen`

  - [x] 18.1 Apply error state + ListEmptyComponent pattern to all four screens
    - For each screen: add `const [fetchError, setFetchError] = useState<string | null>(null)`
    - In each fetch function: `setFetchError(null)` at start; in `catch` block: `setFetchError(e?.message || 'Failed to load. Pull to retry.')`
    - Replace empty `ListEmptyComponent` with conditional: if `fetchError` render an error banner (icon + message), else render the existing empty state
    - `ScheduleScreen`: additionally render an inline error banner above the schedule list when `fetchError` is set
    - Remove `console.log` / `console.error` only error handling from fetch catch blocks (keep `console.error` alongside the state update for debugging)
    - _Bug_Condition: fetch fails and only `console.log` is called_
    - _Expected_Behavior: `fetchError` state is set; visible human-readable error message renders in `ListEmptyComponent`_
    - _Preservation: successful fetches continue to render data normally_
    - _Requirements: 3.3.1, 3.3.2, 3.3.3_

  - [x] 18.2 Verify bug condition exploration test now passes (SF-3)
    - **Property 1: Expected Behavior** — Visible error shown on fetch failure
    - Re-run the SAME test from task 14
    - **EXPECTED OUTCOME**: Test PASSES

  - [x] 18.3 Verify preservation tests still pass (SF-3)
    - **Property 2: Preservation** — Successful fetch still renders data
    - **EXPECTED OUTCOME**: Tests PASS

- [x] 19. Checkpoint — Group 3 complete
  - Ensure all Group 3 tests pass, ask the user if questions arise

---

## Group 4 — Medium: Scalability & Performance

- [ ] 20. Fix P-1 — Add pagination (limit=50 + loadMore) to `ActivityLogsScreen`, `MediaLibraryScreen`, `MasterLibraryScreen`
  - Add `PAGE_SIZE = 50`, `page`, `hasMore` state to each screen/hook
  - Update `api.activityLogs.getAll`, media fetch, and `useMasterLibrary` to accept `?limit=50&page=N` query params
  - On response: if `newItems.length === PAGE_SIZE`, set `hasMore = true`; otherwise `hasMore = false`
  - Wire `FlatList`/`FlashList` `onEndReached` to call `loadMore` when `hasMore && !loading`
  - On pull-to-refresh (`reset = true`): reset `page = 1` and replace list
  - First page loads immediately on mount without requiring a "load more" trigger (Preservation 4.1.3)
  - _Requirements: 4.1.1, 4.1.2, 4.1.3_

- [~] 21. Fix P-2 — Debounce `id='all'` WebSocket subscriptions in `useWebSocket.ts`
  - Add `const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()` at module level
  - Add `DEBOUNCE_MS = 300` constant
  - In `socket.onmessage`, for subscriptions where `id === 'all'`: wrap the handler call in a `debounceHandler(\`${resource}:all\`, ...)` that clears and resets the timer before invoking
  - For subscriptions with specific IDs: invoke handler immediately (unchanged path)
  - Ensure specific-ID events still update local state immediately (Preservation 4.2.3)
  - _Requirements: 4.2.1, 4.2.2, 4.2.3_

- [~] 22. Fix P-4 — Fix `KeyboardAvoidingView behavior` on Android across all affected files
  - Search codebase for `KeyboardAvoidingView` with `behavior="padding"` or `behavior='padding'`
  - In each occurrence, replace with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`
  - Ensure `Platform` is imported from `'react-native'` in each affected file
  - Affected files: `SubmittedSongsScreen.tsx`, `SubmissionReviewModal.tsx`, `EditSongModal.tsx`, `MasterEditSongModal.tsx`, `MemberManagementModal.tsx`, `SupportChatScreen.tsx` (verify full list via search)
  - iOS continues to use `'padding'` (Preservation 4.4.3)
  - _Requirements: 4.4.1, 4.4.2, 4.4.3_

- [~] 23. Fix P-5 — Move `MediaLibraryScreen` load error to `ListEmptyComponent`
  - Add `const [loadError, setLoadError] = useState<string | null>(null)` if not already present from SF-3 work
  - Remove the error rendering branch from inside `renderItem`
  - Add `ListEmptyComponent` prop: when `loadError` is set render an error view (cloud-offline icon + message); otherwise render the existing empty state
  - _Requirements: 4.5.1, 4.5.2_

- [~] 24. Fix P-6 — `ScheduleScreen handleMakeCurrent`: single `setPrograms` batch update
  - Replace the `programs.forEach(p => upsertProgram(...))` loop with a single `setPrograms(prev => prev.map(p => ({ ...p, isCurrent: p.id === activeProgramId, ... })))`
  - The API call to `api.schedule.makeCurrent` remains a single call (unchanged)
  - Ensure `useSchedule.ts` exposes a `setPrograms` setter if it does not already; alternatively use a `bulkUpdatePrograms` helper
  - Add null guard for `activeProgram` consistent with C-3 fix (task 10)
  - _Requirements: 4.6.1, 4.6.2_

- [~] 25. Fix P-7 — Add `estimatedItemSize` to `FlashList` in `MembersScreen`, `SubmittedSongsScreen`, `MasterLibraryScreen`
  - `MembersScreen`: add `estimatedItemSize={72}` (member row: avatar + name + role)
  - `SubmittedSongsScreen`: add `estimatedItemSize={80}` (song list row)
  - `MasterLibraryScreen`: add `estimatedItemSize={68}` (song row: title + metadata)
  - _Requirements: 4.7.1, 4.7.2_

- [~] 26. Fix P-8 — Replace `.map()-in-ScrollView` with `FlatList` in `AnalyticsScreen` and `ScheduleScreen`
  - `AnalyticsScreen`: replace `<ScrollView>{events.map(...)}</ScrollView>` with `<FlatList data={events} keyExtractor={e => e.id} renderItem={...} estimatedItemSize={56} />`
  - `ScheduleScreen`: replace the slot list `.map()`-in-`ScrollView` in the timetable tab with `FlatList` scoped to that tab's content
  - _Requirements: 4.8.1, 4.8.2_

- [~] 27. Fix P-9 — Memoize `ZoneContext` value in `ZoneContext.tsx`
  - Wrap the object literal returned by `useZoneContext()` in `useMemo(() => ({ ... }), [session])`
  - Ensure all fields and methods are included inside the `useMemo`
  - `ZoneContext` consumers must still re-render when zone/church actually changes (Preservation 4.9.3)
  - _Requirements: 4.9.1, 4.9.2, 4.9.3_

- [~] 28. Fix P-10 — Cap `eventCursors` Map at 500 entries with LRU eviction in `useWebSocket.ts`
  - Add `MAX_CURSORS = 500` constant and `cursorAccessOrder: string[]` array at module level
  - Implement `setCursor(key, value)` helper: move existing key to end of access order on update; on insert when at capacity, `shift()` the oldest key from `cursorAccessOrder` and `delete` it from the Map
  - Replace all direct `eventCursors.set(...)` calls with `setCursor(...)`
  - _Requirements: 4.10.1, 4.10.2_

- [~] 29. Checkpoint — Group 4 complete
  - Ensure no regressions from performance fixes, ask the user if questions arise

---

## Group 5 — Medium: Memory Leaks

- [~] 30. Fix ML-1 — Add audio player cleanup `useEffect` to `SubmittedSongsScreen`
  - Add a `useEffect` with an empty dependency array that returns a cleanup function
  - Cleanup: if `soundRef.current` is set, call `.pause()`, `.remove()`, and set `soundRef.current = null`
  - Ensures no audio plays after navigation away from the screen
  - When no audio is playing on unmount, cleanup runs cleanly with no errors (Preservation 5.1.3)
  - _Requirements: 5.1.1, 5.1.2, 5.1.3_

- [~] 31. Fix ML-2 — Add `toastTimer` `clearTimeout` to `MediaLibraryScreen` cleanup
  - Add a `useEffect` with an empty dependency array that returns a cleanup function
  - Cleanup: if `toastTimer.current` is set, call `clearTimeout(toastTimer.current)` and set `toastTimer.current = null`
  - When toast completes before unmount, timer fires normally and ref is cleared (Preservation 5.2.3)
  - _Requirements: 5.2.1, 5.2.2, 5.2.3_

- [~] 32. Checkpoint — Group 5 complete
  - Verify no setState-on-unmounted-component warnings after memory leak fixes

---

## Group 6 — Low: Dead Code

- [~] 33. Fix DC-1 — Confirm no `useAdminResource` import sites, then delete the file
  - Run a grep/search for `useAdminResource` across `src/**/*.tsx` and `src/**/*.ts`
  - If import sites are found: migrate each to the appropriate replacement hook per the table in design.md (Programs → `usePrograms`, Members → `useMembers`, Dashboard → `useDashboardData`, Attendance → `useAttendance`)
  - Once confirmed zero import sites: delete `src/hooks/useAdminResource.ts`
  - Verify migrated screens continue to display their data correctly (Preservation 6.1.3)
  - _Requirements: 6.1.1, 6.1.2, 6.1.3_

- [~] 34. Fix DC-2 — Await `SecureStore.setItemAsync` in `adminStore.ts` `setMode` / `setChurch`
  - Make `setMode` and `setChurch` `async`
  - Wrap `SecureStore.setItemAsync(...)` in a `try/catch`; on catch: `console.warn('[AdminStore] setMode/setChurch: SecureStore write failed:', err)` — non-fatal, proceed to update in-memory state
  - Remove `.catch(() => {})` fire-and-forget pattern
  - In-memory `set({ session: updated })` call is made regardless of SecureStore result
  - When `SecureStore.setItemAsync` succeeds, session is persisted as before (Preservation 6.2.3)
  - _Requirements: 6.2.1, 6.2.2, 6.2.3_

- [~] 35. Checkpoint — Group 6 complete
  - Ensure all Group 6 changes verified, ask the user if questions arise

---

## Group 7 — God File Refactor

Each god-file decomposition is a separate task. All refactors are pure moves of existing code — no user-visible behavior changes. All existing feature behaviors must continue to work after each refactor (Preservation 3.7.1, 3.7.2).

- [~] 36. Decompose `MediaLibraryScreen.tsx` (2,847 lines) → `src/screens/mediaLibrary/`
  - Create directory `src/screens/mediaLibrary/`
  - Extract `useMediaLibrary.ts`: all fetch/mutation state, pagination, loadError, uploadFile, deleteMedia, toastTimer cleanup
  - Extract `MediaGridItem.tsx`: grid tile renderer
  - Extract `MediaListItem.tsx`: list row renderer
  - Extract `MediaUploadSheet.tsx`: bottom-sheet modal for picking and uploading a new file
  - Extract `MediaDetailModal.tsx`: full-screen detail/edit view for a single media item
  - Extract `InAppVideoViewer.tsx`: video playback component (current line ~99)
  - Extract `mediaLibraryUtils.ts`: `inferMediaType`, `getYouTubeId`, `getYouTubeThumbnail`, `formatFileSize`, `formatDate` (pure functions)
  - Extract `mediaLibraryStyles.ts`: all StyleSheet definitions
  - `src/screens/mediaLibrary/index.tsx`: thin coordinator, <200 lines
  - Make `src/screens/MediaLibraryScreen.tsx` a one-line re-export: `export { default } from './mediaLibrary/index'`
  - No single extracted file should exceed 400 lines
  - _Requirements: 7.1.1, 7.1.2, 3.7.1_

- [~] 37. Decompose `ProgramSongsScreen.tsx` (1,886 lines) → `src/screens/programSongs/`
  - Create directory `src/screens/programSongs/`
  - Extract `useProgramSongs.ts`: fetch songs, optimistic add/remove/reorder, WS subscription, loading/refreshing state
  - Extract `SongDetailsModal.tsx`: view/edit a single song (~line 132)
  - Extract `CloneFromMasterModal.tsx`: clone songs from master library (~line 157)
  - Extract `CreateSongModal.tsx`: create new song in program (~line 365)
  - Extract `EditProgramModal.tsx`: rename/edit program metadata (~line 389)
  - Extract `SongCard.tsx`: individual song row/card in the program list
  - Extract `programSongsUtils.ts`: `addSong()`, `removeSong()` pure helpers (lines 30–37)
  - `src/screens/programSongs/index.tsx`: thin coordinator
  - Make `src/screens/ProgramSongsScreen.tsx` a one-line re-export
  - _Requirements: 7.1.1, 7.1.2, 3.7.1_

- [~] 38. Decompose `ScheduleScreen.tsx` (1,827 lines) → `src/screens/schedule/`
  - Create directory `src/screens/schedule/`
  - Extract `ScheduleProgramPicker.tsx`: left-panel / top-bar list of programs with make-current, archive, delete actions
  - Extract `ScheduleTimetableView.tsx`: week/day tab grid with slot cards; receives `activeProgram`, `selectedWeekId`, `selectedDayId` as props
  - Extract `ScheduleSlotModal.tsx`: create/edit a single daily slot
  - Extract `ScheduleGenericItemModal.tsx`: the generic 6-tab item modal
  - Extract `ScheduleSongEligibilityList.tsx`: eligible/ineligible song filter tab
  - Extract `scheduleStyles.ts`: shared StyleSheet
  - `src/screens/schedule/index.tsx`: coordinator holding top-level state
  - Make `src/screens/ScheduleScreen.tsx` a one-line re-export
  - `useSchedule.ts` hook already exists; import directly into coordinator
  - _Requirements: 7.1.1, 7.1.2, 3.7.1_

- [~] 39. Decompose `ProgramsScreen.tsx` (1,628 lines) → `src/screens/programs/`
  - Create directory `src/screens/programs/`
  - Re-export `usePrograms.ts` from `src/hooks/usePrograms.ts` for co-location (no duplication)
  - Extract `ProgramModal.tsx`: create/edit program form (~line 167, ~548 lines in current file)
  - Extract `ProgramCard.tsx`: `ProgramCardItem` component (~line 721)
  - Extract `ProgramStatsPanel.tsx`: `ProgramStats` display (~line 715)
  - Extract `ProgramsFilterBar.tsx`: search input + year/stage filter row
  - Extract `programUtils.ts`: `formatDisplayDate`, `getProgramYear`, `getDatePresets`, `normalizeProgramStage` (lines 40–156)
  - `src/screens/programs/index.tsx`: thin coordinator
  - Make `src/screens/ProgramsScreen.tsx` a one-line re-export
  - _Requirements: 7.1.1, 7.1.2, 3.7.1_

- [~] 40. Decompose `AttendanceScreen.tsx` (1,437 lines) → `src/screens/attendance/`
  - Create directory `src/screens/attendance/`
  - Extract `AttendanceSessionControls.tsx`: open/close session toggle, current code QR display
  - Extract `AttendanceCheckInModal.tsx`: manual check-in form (name, QR scan input)
  - Extract `AttendanceRecordList.tsx`: FlashList of attendance records + search/filter bar
  - Extract `AttendanceRecordCard.tsx`: individual record row
  - Extract `AttendanceCodeManager.tsx`: set/rotate attendance code, validity timer
  - Extract `attendanceStyles.ts`: shared StyleSheet
  - `src/screens/attendance/index.tsx`: thin coordinator importing `useAttendance.ts` (already exists)
  - Make `src/screens/AttendanceScreen.tsx` a one-line re-export
  - _Requirements: 7.1.1, 7.1.2, 3.7.1_

- [~] 41. Extract `BaseSongForm.tsx` and decompose `EditSongModal.tsx` → extend `src/components/editSong/`
  - `src/components/editSong/` already exists with 8 files; extend it
  - Create `src/components/editSong/BaseSongForm.tsx`: shared ~70% of form fields and behavior common to `EditSongModal` and `MasterEditSongModal`; implement `BaseSongFormProps` interface as specified in design.md section 7.8
  - Create `src/components/editSong/index.tsx`: thin wrapper replacing `EditSongModal.tsx` root; composes `BaseSongForm` and passes `PraiseNightSong`-specific state (status, isActive, programId, rehearsalCount)
  - Make `src/components/EditSongModal.tsx` a one-line re-export: `export { default } from './editSong/index'`
  - All existing field types, validation rules, and submission flows must continue to work (Preservation 3.7.2)
  - _Requirements: 7.2.1, 7.2.2, 3.7.1, 3.7.2_

- [~] 42. Decompose `MasterEditSongModal.tsx` (1,302 lines) → `src/components/masterEditSong/` composing `BaseSongForm`
  - Create directory `src/components/masterEditSong/`
  - `src/components/masterEditSong/index.tsx`: composes `BaseSongForm` (from task 41) and adds master-only sections via `extraContent` slot; passes master-specific state (isHQOnly, collectionsList)
  - Extract `MasterCollectionPicker.tsx`: inline collection/program picker with "New Collection" input (~80 lines, unique to master modal)
  - Extract `MasterAccessControl.tsx`: `isHQOnly` toggle and visibility settings (~40 lines)
  - Extract `masterEditSongStyles.ts`: styles not shared with `BaseSongForm`
  - Make `src/components/MasterEditSongModal.tsx` a one-line re-export: `export { default } from './masterEditSong/index'`
  - All master modal fields, validation, and submission flows must continue to work (Preservation 3.7.2)
  - _Requirements: 7.2.1, 7.2.2, 3.7.1, 3.7.2_

- [~] 43. Decompose `SubmissionReviewModal.tsx` (1,142 lines) → `src/components/submissionReview/`
  - Create directory `src/components/submissionReview/`
  - Extract `SubmissionHeader.tsx`: song title, submitter name, date, status badge
  - Extract `SubmissionAudioPlayer.tsx`: audio playback bar for submitted audio track
  - Extract `SubmissionConversation.tsx`: message thread FlatList of chat bubbles
  - Extract `SubmissionReplyBar.tsx`: text input + send button for admin replies
  - Extract `SubmissionActionButtons.tsx`: Approve / Reject / Delete action row
  - Extract `submissionReviewUtils.ts`: `getCleanSubmitterName` (line 84) and any other pure helpers
  - `src/components/submissionReview/index.tsx`: thin coordinator
  - Make `src/components/SubmissionReviewModal.tsx` a one-line re-export
  - _Requirements: 7.1.1, 7.1.2, 3.7.1_

- [~] 44. Decompose `MemberManagementModal.tsx` (1,074 lines) → `src/components/memberManagement/`
  - Create directory `src/components/memberManagement/`
  - Extract `MemberProfileHeader.tsx`: avatar, name, role badge, church tag
  - Extract `MemberRoleEditor.tsx`: role dropdown/picker with save button
  - Extract `MemberStatusActions.tsx`: Suspend / Reactivate / Ban / Remove actions with confirmations
  - Extract `MemberChurchAssignment.tsx`: assign member to a subgroup/church
  - Extract `memberManagementStyles.ts`: shared StyleSheet
  - `src/components/memberManagement/index.tsx`: thin coordinator
  - Make `src/components/MemberManagementModal.tsx` a one-line re-export
  - _Requirements: 7.1.1, 7.1.2, 3.7.1_

- [~] 45. Decompose `MembersScreen.tsx` (860 lines) → `src/screens/members/`
  - Create directory `src/screens/members/`
  - Extract `MemberSearchBar.tsx`: debounced search input + filter toggles
  - Extract `MemberListItem.tsx`: FlashList row (avatar, name, role, status dot)
  - Extract `MemberAdminRequestsTab.tsx`: pending admin-request cards with approve/reject
  - Extract `membersStyles.ts`: shared StyleSheet
  - `src/screens/members/index.tsx`: thin coordinator connecting `useMembers` hook to UI
  - `MemberManagementModal` remains a separate import (already extracted in task 44)
  - Make `src/screens/MembersScreen.tsx` a one-line re-export
  - _Requirements: 7.1.1, 7.1.2, 3.7.1_

- [~] 46. Checkpoint — Group 7 complete
  - Run full app navigation smoke test
  - Verify all screens render and behave correctly after refactors
  - Confirm no file exceeds 400 lines in the extracted subdirectories
  - Ask the user if questions arise

---

## Final Checkpoint

- [~] 47. Final validation — all groups complete
  - Re-run all Property 1 (Bug Condition) tests — all must PASS
  - Re-run all Property 2 (Preservation) tests — all must PASS
  - Run full app smoke test: sign-in → navigate all tabs → trigger key flows
  - Confirm no regressions across all 24 bug fixes and 10 god-file refactors
  - Ask the user to review before marking the spec complete

## Notes

- Property 1 (Bug Condition) exploration tests are standalone tasks that MUST run on unfixed code and MUST fail — this confirms each bug exists before any fix is written.
- Property 2 (Preservation) tasks are standalone tasks that MUST run on unfixed code and MUST pass — this establishes the baseline behavior to preserve.
- Implementation sub-tasks reference the exact pseudocode contracts from bugfix.md and the concrete diff patterns from design.md.
- God-file refactor tasks (Group 7) are purely structural moves — no logic changes are permitted. All existing feature behaviors must be preserved.
- Run each group's checkpoint before starting the next group to catch regressions early.
