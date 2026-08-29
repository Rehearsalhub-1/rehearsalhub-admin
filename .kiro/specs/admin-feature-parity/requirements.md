# Requirements Document

## Introduction

The `rehearsalhub-admin` Expo/React Native app must reach full feature parity with the Zonal Portal (Next.js web app). This document captures the nine discrete gaps between the two clients. All changes are client-side in `rehearsalhub-admin` unless a new API route is required. The `rehearsalhub-api` is the single source of truth; all data access goes through it via Bearer-JWT `apiClient`. No direct database, Firebase, or Supabase access is permitted from any client.

## Glossary

- **Admin_App**: The `rehearsalhub-admin` Expo/React Native application.
- **API**: The `rehearsalhub-api` Express backend, accessed only over HTTP/REST or WebSocket.
- **Program**: A praise-night rehearsal setlist entity stored at `POST/GET/PATCH/DELETE /programs`.
- **PraiseNightScreen**: The existing screen at `src/screens/PraiseNightScreen.tsx` that lists programs.
- **ProgramSongsScreen**: A new screen showing all songs belonging to a single program.
- **LiveConductorScreen**: A new screen for live-session song broadcast control.
- **Zone_Song**: A song record scoped to a single zone, stored in the `zone_songs` table and served via `GET /songs/zone`, `POST /subgroups/songs`, `PATCH /subgroups/songs/:id`, `DELETE /subgroups/songs/:id`.
- **Master_Song**: A global HQ-level song from the `ministered_songs` table, served via `GET /songs/master`. Admins must not edit master songs.
- **Attendance_Code**: A short alphanumeric passcode that singers use to self-check in, persisted server-side via a new `/attendance/code` route backed by the `Setting` model.
- **Active_Song**: The song currently being rehearsed live; set via `PATCH /songs/praise-night/:songId` with `{ isActive: true }` and broadcast over WebSocket `song` resource.
- **WebSocket**: The existing `useWebSocket` hook at `src/hooks/useWebSocket.ts` that subscribes to resource/id events.
- **FAB**: Floating action button — a circular `+` button overlaid at the bottom-right of a screen.
- **apiClient**: The typed HTTP client at `src/lib/apiClient.ts` that injects Bearer JWT and zone-scope headers.
- **ZoneContext**: The React context providing `activeZone` and `isAllZones` flags consumed by every screen.

---

## Requirements

### Requirement 1 — Program CRUD (Create / Edit / Delete)

**User Story:** As a coordinator, I want to create, edit, and delete programs directly from the admin app, so that I can manage praise-night setlists without needing a desktop browser.

#### Acceptance Criteria

1. WHEN the coordinator views `PraiseNightScreen`, THE Admin_App SHALL display a FAB (+) button in the bottom-right corner.
2. WHEN the coordinator taps the FAB, THE Admin_App SHALL open a bottom-sheet modal containing a form with fields: Name, Date (ISO `YYYY-MM-DD`), Location, and Category (defaulting to `pre-rehearsal`).
3. WHEN the coordinator submits the create form with all required fields, THE Admin_App SHALL call `POST /programs` with body `{ name, date, location, category: 'pre-rehearsal', status: 'pre-rehearsal', zoneId }` and refresh the program list on success.
4. IF the `POST /programs` call returns a non-2xx response, THEN THE Admin_App SHALL display a user-friendly error message and leave the modal open.
5. WHEN the coordinator long-presses a program card, THE Admin_App SHALL display an action sheet with options: Edit and Delete.
6. WHEN the coordinator selects Edit from the action sheet, THE Admin_App SHALL open the bottom-sheet modal pre-populated with the program's current name, date, location, and category.
7. WHEN the coordinator submits the edit form, THE Admin_App SHALL call `PATCH /programs/:id` with the updated fields and refresh the list on success.
8. WHEN the coordinator selects Delete from the action sheet, THE Admin_App SHALL display a confirmation alert before calling `DELETE /programs/:id`.
9. WHEN `DELETE /programs/:id` returns a 2xx response, THE Admin_App SHALL remove the program from the list without a full reload.
10. IF the coordinator does not provide a program name before submitting the create or edit form, THEN THE Admin_App SHALL display an inline validation message and prevent submission.

---

### Requirement 2 — Program Song Management

**User Story:** As a coordinator, I want to view, add, and remove songs from a program setlist, so that I can curate the exact repertoire for each praise night.

#### Acceptance Criteria

1. WHEN the coordinator taps a program card in `PraiseNightScreen`, THE Admin_App SHALL navigate to `ProgramSongsScreen` passing the selected program as a route parameter.
2. WHEN `ProgramSongsScreen` mounts, THE Admin_App SHALL fetch the program's full details including its `songIds` array and display each song's title, key, and heard/unheard status.
3. THE Admin_App SHALL provide an Add Song button in `ProgramSongsScreen` that opens a search modal listing songs from `GET /songs/master`.
4. WHEN the coordinator selects a song from the search modal, THE Admin_App SHALL call `PATCH /programs/:id` with `{ songIds: [...existingSongIds, selectedSongId] }` and refresh the list.
5. WHEN the coordinator swipes a song row left or taps a remove icon, THE Admin_App SHALL call `PATCH /programs/:id` with `{ songIds: existingSongIds.filter(id => id !== removedId) }` after a confirmation prompt.
6. WHEN the coordinator toggles a song's heard/unheard switch, THE Admin_App SHALL call `PATCH /songs/praise-night/:songId` with `{ isHeard: <boolean> }` and update the UI optimistically.
7. IF any song management API call returns a non-2xx response, THEN THE Admin_App SHALL display a user-friendly error and revert any optimistic UI change.

---

### Requirement 3 — Live Rehearsal Conductor View (Set Active Song)

**User Story:** As a coordinator, I want to mark a song as actively being rehearsed, so that all 740+ singers' mobile apps update in real time to show the correct song.

#### Acceptance Criteria

1. WHEN `ProgramSongsScreen` displays a program with `status === 'ongoing'`, THE Admin_App SHALL show a "Go Live" button that navigates to `LiveConductorScreen`.
2. WHEN `LiveConductorScreen` mounts, THE Admin_App SHALL display the program's songs in a scrollable list with the currently active song (where `isActive === true`) visually highlighted.
3. WHEN the coordinator taps a song in `LiveConductorScreen`, THE Admin_App SHALL call `PATCH /songs/praise-night/:songId` with `{ isActive: true }` to set that song as active.
4. WHEN the `PATCH /songs/praise-night/:songId` call succeeds, THE Admin_App SHALL broadcast the change and update the highlighted active song in the UI without requiring a manual refresh.
5. THE Admin_App SHALL subscribe to `useWebSocket('song', 'all', handler)` in `LiveConductorScreen` and update the active song indicator WHEN a WebSocket event is received with an updated `isActive` flag.
6. IF the `PATCH /songs/praise-night/:songId` call fails, THEN THE Admin_App SHALL display a brief toast or alert and revert the highlight to the previous active song.
7. WHEN the coordinator navigates away from `LiveConductorScreen`, THE Admin_App SHALL unsubscribe from the WebSocket `song` resource.

---

### Requirement 4 — Zone Song CRUD

**User Story:** As a coordinator, I want to add, edit, and delete zone-specific songs, so that I can maintain an up-to-date zone repertoire without switching to a desktop app.

#### Acceptance Criteria

1. WHEN the coordinator opens `MasterLibraryScreen`, THE Admin_App SHALL display two tabs: "Master Songs" and "Zone Songs".
2. WHEN the "Zone Songs" tab is active, THE Admin_App SHALL fetch songs from `GET /songs/zone` and display them in a list.
3. WHEN the "Zone Songs" tab is active, THE Admin_App SHALL display a FAB (+) button.
4. WHEN the coordinator taps the FAB on the Zone Songs tab, THE Admin_App SHALL open a modal form with fields: Title, Writer, Key, Tempo, and Category.
5. WHEN the coordinator submits the add-zone-song form with a title, THE Admin_App SHALL call `POST /subgroups/songs` with the form data and refresh the zone song list.
6. WHEN the coordinator long-presses a zone song row, THE Admin_App SHALL show an action sheet with Edit and Delete options.
7. WHEN the coordinator selects Edit, THE Admin_App SHALL open the modal form pre-populated with the song's fields and call `PATCH /subgroups/songs/:id` on submit.
8. WHEN the coordinator selects Delete, THE Admin_App SHALL prompt for confirmation and then call `DELETE /subgroups/songs/:id`.
9. IF the create or update call returns a non-2xx response, THEN THE Admin_App SHALL display a user-friendly error without dismissing the form.
10. WHILE the "Master Songs" tab is active, THE Admin_App SHALL remain read-only with no FAB and no edit controls.

---

### Requirement 5 — Media Upload

**User Story:** As a coordinator, I want to upload files to the zone media library directly from my phone, so that rehearsal guides and audio stems are immediately accessible to singers.

#### Acceptance Criteria

1. WHEN the coordinator views `MediaScreen`, THE Admin_App SHALL display a FAB (+) button in the bottom-right corner.
2. WHEN the coordinator taps the FAB, THE Admin_App SHALL invoke `expo-document-picker` to let the coordinator choose a file from device storage.
3. WHEN a file is selected, THE Admin_App SHALL upload the file binary to `POST /upload` using `multipart/form-data` with field name `file`.
4. WHEN the upload API returns a file URL in the response, THE Admin_App SHALL call `POST /media` with `{ name: fileName, url: uploadedUrl, type: inferredType, zoneId }` to register the asset.
5. WHEN both API calls succeed, THE Admin_App SHALL refresh the media list and display the new item without requiring a manual pull-to-refresh.
6. WHILE an upload is in progress, THE Admin_App SHALL display a progress indicator and disable the FAB.
7. IF either the upload or the media registration call returns a non-2xx response, THEN THE Admin_App SHALL display a descriptive error message and allow the coordinator to retry.

---

### Requirement 6 — Server-Side Attendance Code

**User Story:** As a coordinator, I want the attendance check-in code to be stored on the server, so that it persists across app restarts and is accessible to all coordinators in the zone.

#### Acceptance Criteria

1. THE API SHALL expose `POST /attendance/code` that accepts `{ code: string, validMinutes: number, zoneId: string }` and stores the code in the `Setting` model under key `attendance_code_<zoneId>` with fields `{ code, active: true, expiresAt, createdAt }`.
2. THE API SHALL expose `GET /attendance/code` that returns the active attendance code for the requesting zone, or `{ active: false }` if none exists.
3. WHEN the coordinator taps "Set Code" in `AttendanceScreen`, THE Admin_App SHALL call `POST /attendance/code` instead of managing the code locally, and display the returned code as the active code.
4. WHEN `AttendanceScreen` mounts, THE Admin_App SHALL call `GET /attendance/code` to hydrate the `activeCode` state from the server.
5. WHEN the coordinator taps "Close" on the active code, THE Admin_App SHALL call `POST /attendance/code` with `{ active: false }` to deactivate the code server-side.
6. IF `GET /attendance/code` returns `{ active: false }` or an error, THEN THE Admin_App SHALL display the "No Active Passcode" state.
7. WHEN a singer submits a check-in with a code, THE API SHALL validate the code against the stored `Setting` record and reject expired or inactive codes with a `400` status.

---

### Requirement 7 — QR Code Check-in Display

**User Story:** As a coordinator, I want to show a QR code on screen that singers can scan to check in, so that check-in is faster than manually entering a code.

#### Acceptance Criteria

1. WHEN an active attendance code is set in `AttendanceScreen`, THE Admin_App SHALL display a "Show QR" button next to the active code indicator.
2. WHEN the coordinator taps "Show QR", THE Admin_App SHALL open a full-screen modal displaying a QR code whose content is the active attendance code string.
3. THE Admin_App SHALL render the QR code using `react-native-qrcode-svg` at a minimum size of 240×240 points.
4. WHEN no active attendance code exists, THE Admin_App SHALL hide the "Show QR" button.
5. WHEN the coordinator taps outside the QR modal or a close button, THE Admin_App SHALL dismiss the modal.

---

### Requirement 8 — Dashboard Stats Fix

**User Story:** As a coordinator, I want the Dashboard stats to show accurate counts, so that I can make informed decisions about zone health at a glance.

#### Acceptance Criteria

1. THE Admin_App SHALL fetch the "Total Songs" stat from `GET /songs/zone` and display the count of zone songs, not submissions.
2. THE Admin_App SHALL rename the existing "Members" stat card to "Zone Members" while keeping the same `GET /profiles/directory` data source.
3. THE Admin_App SHALL display "Active Programs" using programs where `status === 'ongoing'` from `GET /programs`, which already matches the existing logic and SHALL be preserved.
4. THE Admin_App SHALL display "Pending Review" using submissions where `status === 'pending'` from `GET /submitted-songs`, which already matches the existing logic and SHALL be preserved.
5. WHEN `GET /songs/zone` fails or returns no data, THE Admin_App SHALL display `0` for "Total Songs" without crashing.

---

### Requirement 9 — SongDetailScreen Save Endpoint Fix

**User Story:** As a coordinator, I want editing a zone song to save correctly, so that my changes persist and are not silently lost.

#### Acceptance Criteria

1. WHEN `SongDetailScreen` receives a song with a truthy `subGroupId` field (indicating a zone song), THE Admin_App SHALL call `PATCH /subgroups/songs/:id` on save instead of `PATCH /songs/:id`.
2. WHEN `SongDetailScreen` receives a song without a `subGroupId` field (indicating a master song), THE Admin_App SHALL hide the Edit button and display a read-only badge indicating the song is a global master record.
3. WHEN the coordinator saves a zone song successfully via `PATCH /subgroups/songs/:id`, THE Admin_App SHALL display a success confirmation and update the local state.
4. IF the `PATCH /subgroups/songs/:id` call returns a non-2xx response, THEN THE Admin_App SHALL display a user-friendly error message and leave the form in edit mode so the coordinator can retry.
5. WHEN `SongDetailScreen` receives a song that has no `subGroupId` and no `id`, THE Admin_App SHALL display an error state instead of allowing an invalid save attempt.
