# Implementation Plan: Admin Feature Parity

## Overview

Nine discrete feature gaps are addressed in strict dependency order. Gap 6 (API routes) must be implemented first because Gap 6 client-wiring and Gap 7 depend on those routes existing. Gap 2 (ProgramSongsScreen) must exist before Gap 3 (LiveConductorScreen). All other gaps are independent and can be worked in any order once the foundation tasks (dependencies + navigation) are done.

---

## Tasks

- [ ] 1. Install dependencies and extend WebSocket resource aliases
  - [-] 1.1 Add `react-native-qrcode-svg@6.3.2` and `expo-document-picker@13.0.3` to `package.json` in `rehearsalhub-admin`; run `npx expo install react-native-qrcode-svg@6.3.2 expo-document-picker@13.0.3` to let Expo resolve peer deps (react-native-svg). Pin versions in package.json.
    - Verify `package.json` contains exact pinned versions before proceeding.
    - _Requirements: 5.2, 7.3_
  - [-] 1.2 In `src/hooks/useWebSocket.ts`, add `song` to `RESOURCE_ALIASES`:
    ```
    song: ['songs', 'praise_night_song', 'active_song'],
    ```
    - Verify the existing subscription/unsubscription logic sends alias subscriptions for the new `song` entry.
    - _Requirements: 3.5, 3.7_

- [ ] 2. Gap 6 (API) — Add attendance code routes to `rehearsalhub-api`
  - [~] 2.1 Add zod schema and `POST /attendance/code` handler to `rehearsalhub-api/src/routes/attendance.routes.ts`:
    - Accept body: `{ code?: string, validMinutes?: number, zoneId?: string, active?: boolean }`
    - Resolve `effectiveZoneId` from tenant middleware or `req.body.zoneId`.
    - Store/upsert in `Setting` model: `key = 'attendance_code_<zoneId>'`, `value = { code, active, validMinutes, zoneId, createdAt, expiresAt }`.
    - If `active === false`: upsert with `{ active: false, code: '', expiresAt: null }`.
    - Guard with `requireAuth` + `requireTenantAdmin`.
    - Return `{ success: true, data: { code, active, expiresAt } }`.
    - Generic error message to client; full error logged server-side.
    - _Requirements: 6.1, 6.5_
  - [~] 2.2 Add `GET /attendance/code` handler in the same file:
    - Resolve `effectiveZoneId` from tenant middleware.
    - Fetch `Setting` by key `'attendance_code_<zoneId>'`.
    - If not found or `active === false`: return `{ success: true, data: { active: false } }`.
    - If `expiresAt < now`: return `{ success: true, data: { active: false } }`.
    - Otherwise return `{ success: true, data: { code, active: true, expiresAt } }`.
    - Guard with `requireAuth` only (any admin can read).
    - _Requirements: 6.2, 6.6_
  - [ ]* 2.3 Write unit tests for POST and GET `/attendance/code` route handlers:
    - Test: code is stored with correct `expiresAt` (now + validMinutes * 60000).
    - Test: expired code returns `{ active: false }`.
    - Test: deactivation sets `active: false`.
    - _Requirements: 6.1, 6.2, 6.7_

- [~] 3. Checkpoint — API routes complete
  - Ensure all tests pass, confirm API compiles with `tsc --noEmit` in `rehearsalhub-api`. Ask the user if questions arise.

- [ ] 4. Gap 8 — Fix Dashboard stats
  - [~] 4.1 In `DashboardScreen.tsx`, replace the `/submitted-songs` fetch for `totalSongs` with `GET /songs/zone`:
    ```typescript
    apiClient.get<any>(`/songs/zone${zoneParam}`)  // replaces /submitted-songs
    ```
    Update `Stats.totalSongs` to use `zoneSongsRes?.data?.length ?? 0`.
    Rename the `"Members"` stat card label to `"Zone Members"`.
    Keep all other stats (pendingSongs, totalMembers, activePrograms) unchanged.
    - _Requirements: 8.1, 8.2, 8.5_
  - [ ]* 4.2 Write unit test for `fetchStats`:
    - Mock `/songs/zone` returning 5 items → `totalSongs = 5`.
    - Mock `/songs/zone` throwing → `totalSongs = 0` (no crash).
    - _Requirements: 8.1, 8.5_

- [ ] 5. Gap 9 — Fix SongDetailScreen save endpoint
  - [~] 5.1 In `SongDetailScreen.tsx`, add `isZoneSong` derived from `song?.subGroupId || song?.sub_group_id`.
    In `handleSave`, replace `apiClient.patch('/songs/${song.id}', ...)` with `apiClient.patch('/subgroups/songs/${song.id}', ...)`.
    Guard: if `!isZoneSong`, return early without saving.
    In the header, replace the Edit toggle button with a conditional:
    - `isZoneSong` → show existing edit/save toggle button.
    - `!isZoneSong` → show a "Master — Read Only" badge (no edit button).
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ]* 5.2 Write property test for save endpoint routing (Property 5):
    - `// Feature: admin-feature-parity, Property 5: save endpoint routing invariant`
    - Generate `fc.record({ id: fc.uuid(), subGroupId: fc.option(fc.uuid(), { nil: undefined }) })`.
    - Assert `resolveEndpoint(song)` returns `/subgroups/songs/${id}` iff `subGroupId` is defined.
    - _Requirements: 9.1, 9.2_

- [ ] 6. Gap 1 — Program CRUD (Create / Edit / Delete)
  - [~] 6.1 Add state and handlers to `PraiseNightScreen.tsx`:
    - State: `showProgramModal`, `editingProgram`, `form` (name, date, location, category).
    - Implement `handleCreateOrUpdate`: calls `POST /programs` or `PATCH /programs/:id` based on `editingProgram`.
    - Implement `handleDeleteProgram`: shows `Alert.alert` confirmation, then calls `DELETE /programs/:id`; removes item from local state on success.
    - On `POST /programs` body: `{ name, date, location, category: 'pre-rehearsal', status: 'pre-rehearsal', zoneId: activeZone?.id ?? '' }`.
    - _Requirements: 1.3, 1.7, 1.8, 1.9_
  - [~] 6.2 Add FAB and bottom-sheet modal UI to `PraiseNightScreen.tsx`:
    - FAB: absolutely positioned `bottom: 28, right: 20`, `zIndex: 100`.
    - Modal form: `<Modal>` with `animationType="slide"` containing name, date, location, category TextInputs.
    - Inline validation: if `form.name.trim() === ''`, show error text and prevent submit.
    - Long-press on card: `Alert.alert` with Edit / Delete / Cancel options.
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.10_
  - [ ]* 6.3 Write unit tests for Gap 1:
    - FAB renders in list.
    - Empty name blocks submit.
    - API called with correct body on create.
    - API called with correct body on edit.
    - Confirmation shown before delete.
    - _Requirements: 1.1, 1.3, 1.7, 1.8, 1.10_

- [ ] 7. Gap 2 — Create ProgramSongsScreen
  - [~] 7.1 Create `src/screens/ProgramSongsScreen.tsx`:
    - Accept `route.params.program` (full Program object).
    - On mount: fetch `GET /songs/praise-night?praiseNightId=<program.id>`.
    - Render list of songs with title, key, heard/unheard toggle (Switch).
    - "Add Song" button: opens search modal, fetches `GET /songs/master`.
    - On song select from modal: calls `PATCH /programs/:id` with merged `songIds`.
    - Swipe-left or remove icon: calls `PATCH /programs/:id` with filtered `songIds` after confirmation.
    - Heard toggle: calls `PATCH /songs/praise-night/:songId` with `{ isHeard: bool }`.
    - "Go Live" button visible only when `program.status === 'ongoing'`; navigates to `LiveConductorScreen`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1_
  - [ ]* 7.2 Write property test for song array add (Property 1):
    - `// Feature: admin-feature-parity, Property 1: song array add invariant`
    - `fc.array(fc.uuid()) × fc.uuid()` → `addSong(arr, id).length === arr.length + 1 && addSong(arr, id).includes(id)`.
    - _Requirements: 2.4_
  - [ ]* 7.3 Write property test for song array remove (Property 2):
    - `// Feature: admin-feature-parity, Property 2: song array remove invariant`
    - `fc.array(fc.uuid(), { minLength: 1 })` × pick element → `removeSong(arr, id).length === arr.length - 1 && !removeSong(arr, id).includes(id)`.
    - _Requirements: 2.5_

- [ ] 8. Gap 3 — Create LiveConductorScreen
  - [~] 8.1 Create `src/screens/LiveConductorScreen.tsx`:
    - Accept `route.params.program`.
    - On mount: fetch `GET /songs/praise-night?praiseNightId=<program.id>`.
    - Initialise `activeSongId` from the song where `isActive === true`.
    - Subscribe: `useWebSocket('song', 'all', handler)` — handler extracts `data.id` and `data.isActive`, updates `activeSongId`.
    - On song card tap: optimistically set `activeSongId = song.id`; call `PATCH /songs/praise-night/${song.id}` with `{ isActive: true }`; on failure revert and show Alert.
    - Active card: `borderColor: Colors.success, borderWidth: 2` + green `● LIVE` badge.
    - Back button: unsubscribe is automatic via `useWebSocket` cleanup on unmount.
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  - [ ]* 8.2 Write property test for at-most-one-active (Property 3):
    - `// Feature: admin-feature-parity, Property 3: at most one active song`
    - `fc.array(fc.record({ id: fc.uuid(), isActive: fc.boolean() }), { minLength: 1 })` × random target id → after `setActive(songs, targetId)`, exactly one element has `isActive === true`.
    - _Requirements: 3.3, 3.4_

- [~] 9. Checkpoint — New screens and fixes complete
  - Ensure all tests pass for Gaps 1-3, 8, 9. Ask the user if questions arise.

- [ ] 10. Register new screens in AppNavigator
  - [~] 10.1 In `src/navigation/AppNavigator.tsx`:
    - Import `ProgramSongsScreen` and `LiveConductorScreen`.
    - Add two `Stack.Screen` entries: `ProgramSongs` and `LiveConductor`, both with `headerShown: false`.
    - Verify `PraiseNightScreen` navigates to `ProgramSongs` on card tap.
    - Verify `ProgramSongsScreen` navigates to `LiveConductor` on Go Live tap.
    - _Requirements: 2.1, 3.1_

- [ ] 11. Gap 4 — Zone Songs tab in MasterLibraryScreen
  - [~] 11.1 Create `src/screens/ZoneSongFormModal.tsx` (new file, single-responsibility):
    - Props: `visible`, `editSong: ZoneSong | null`, `onClose`, `onSaved`.
    - Fields: Title (required), Writer, Key, Tempo, Category.
    - On submit: if `editSong` — `PATCH /subgroups/songs/:id`; else `POST /subgroups/songs`.
    - Inline validation: Title must be non-empty.
    - _Requirements: 4.4, 4.5, 4.7, 4.9_
  - [~] 11.2 Extend `MasterLibraryScreen.tsx` with zone songs tab:
    - Add `TABS = ['master', 'zone']` tab bar at top.
    - State: `activeTab`, `zoneSongs`, `showZoneForm`, `editingZoneSong`.
    - When `activeTab === 'zone'`: fetch `GET /songs/zone`; display songs; show FAB.
    - Long-press zone song: Alert with Edit / Delete.
    - Delete: confirmation → `DELETE /subgroups/songs/:id`.
    - Render `<ZoneSongFormModal>` passing correct props.
    - When `activeTab === 'master'`: existing read-only behaviour unchanged; no FAB.
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.8, 4.10_
  - [ ]* 11.3 Write unit tests for zone song CRUD:
    - Zone Songs tab renders after tap.
    - FAB not visible on Master tab.
    - Empty title blocks form submit.
    - Correct API endpoint called for create vs edit.
    - _Requirements: 4.3, 4.5, 4.7, 4.9, 4.10_

- [ ] 12. Gap 5 — Media upload FAB
  - [~] 12.1 Add upload functionality to `MediaScreen.tsx`:
    - Import `DocumentPicker` from `expo-document-picker` and `SecureStore` from `expo-secure-store`.
    - Implement `inferMediaType(mimeType: string)` pure helper.
    - Implement `handleUpload`: pick file → multipart `POST /upload` via raw `fetch` (not `apiClient`) → `POST /media` via `apiClient`.
    - State: `uploading`, `uploadProgress`.
    - FAB: absolutely positioned, disabled and showing `ActivityIndicator` while `uploading === true`.
    - On success: call `fetchMedia()`. On failure: `Alert.alert`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [ ]* 12.2 Write property test for media type inference (Property 4):
    - `// Feature: admin-feature-parity, Property 4: media type inference completeness`
    - `fc.constantFrom('audio/mpeg','video/mp4','image/png','application/pdf','application/zip','text/plain','')` → `inferMediaType(mime)` always returns one of `['audio','video','image','document']`.
    - _Requirements: 5.4_

- [ ] 13. Gap 6 (client) + Gap 7 — AttendanceScreen server wiring and QR code
  - [~] 13.1 Wire `AttendanceScreen.tsx` to the new API routes:
    - On mount: call `GET /attendance/code`; set `activeCode` from response or `null` if inactive/error.
    - `handleCreateCode`: replace TODO comment with `apiClient.post('/attendance/code', { code, validMinutes: 60, zoneId: activeZone?.id })`.
    - `handleEndCode`: replace TODO with `apiClient.post('/attendance/code', { active: false, zoneId: activeZone?.id })`.
    - Remove all "// TODO" comments.
    - _Requirements: 6.3, 6.4, 6.5, 6.6_
  - [~] 13.2 Add QR code modal to `AttendanceScreen.tsx`:
    - Import `QRCode` from `react-native-qrcode-svg`.
    - State: `qrModalVisible`.
    - "Show QR" button: rendered inline on the active-code card when `activeCode !== null`.
    - Modal: full-screen overlay with centred card, `<QRCode value={activeCode} size={260} />`, code text, Close button.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ]* 13.3 Write unit tests for attendance code and QR:
    - On mount, `GET /attendance/code` is called.
    - Network error on GET leaves `activeCode = null`.
    - "Show QR" hidden when `activeCode = null`.
    - "Show QR" visible when `activeCode` is set.
    - _Requirements: 6.4, 6.6, 7.1, 7.4_

- [~] 14. Final Checkpoint — Ensure all tests pass
  - Run `tsc --noEmit` in both `rehearsalhub-admin` and `rehearsalhub-api`.
  - Run the full test suite. Ensure all tests pass; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery.
- All test tasks must use `fast-check` for property-based tests and the project's existing test runner.
- Property test tag comment format: `// Feature: admin-feature-parity, Property N: <property_text>`.
- Tasks 2.1 and 2.2 (API routes) MUST be completed before tasks 13.1 and 13.2 (client wiring).
- Tasks 7.1 and 8.1 (new screens) MUST be completed before task 10.1 (navigation registration).
- `inferMediaType` in task 12.1 should be a standalone exported pure function so it is independently testable.
- `addSong` / `removeSong` helpers in task 7.1 should be standalone exported pure functions for the same reason.
- Never use `PATCH /songs/:id` for zone songs — always `PATCH /subgroups/songs/:id`.
- Never allow editing master songs (`ministered_songs` table) from the admin app.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "4.1", "5.1"] },
    { "id": 2, "tasks": ["2.3", "4.2", "5.2", "6.1", "6.2"] },
    { "id": 3, "tasks": ["6.3", "7.1", "8.1", "11.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "8.2", "10.1", "11.2", "12.1"] },
    { "id": 5, "tasks": ["11.3", "12.2", "13.1", "13.2"] },
    { "id": 6, "tasks": ["13.3"] }
  ]
}
```
