# Design Document — Admin Feature Parity

## Overview

This document describes the exact implementation plan to close nine feature gaps between `rehearsalhub-admin` (Expo/React Native) and the Zonal Portal (Next.js). All changes are scoped to `rehearsalhub-admin` except Gap 6, which adds two routes to `rehearsalhub-api/src/routes/attendance.routes.ts`.

The work touches eight existing screens, adds three new screens, adds two new API routes, registers those screens in `AppNavigator.tsx`, and installs two new pinned dependencies (`react-native-qrcode-svg@6.3.2`, `expo-document-picker@13.0.3`).

Every screen communicates with the API exclusively through the existing `apiClient` (Bearer JWT + zone-scope headers). WebSocket events are consumed via the existing `useWebSocket` hook.

---

## Architecture

```
rehearsalhub-admin (Expo SDK 54)
│
├── src/navigation/AppNavigator.tsx        ← register new screens
├── src/screens/
│   ├── PraiseNightScreen.tsx              ← Gap 1: add FAB + CRUD modals
│   ├── ProgramSongsScreen.tsx             ← Gap 2: NEW
│   ├── LiveConductorScreen.tsx            ← Gap 3: NEW
│   ├── MasterLibraryScreen.tsx            ← Gap 4: add Zone Songs tab + FAB
│   ├── ZoneSongFormModal.tsx              ← Gap 4: NEW shared modal component
│   ├── MediaScreen.tsx                    ← Gap 5: add upload FAB
│   ├── AttendanceScreen.tsx               ← Gap 6 + 7: server-side code + QR
│   ├── DashboardScreen.tsx                ← Gap 8: fix Total Songs stat
│   └── SongDetailScreen.tsx               ← Gap 9: fix save endpoint routing
│
rehearsalhub-api
└── src/routes/attendance.routes.ts        ← Gap 6: add /code routes
```

### Client-API Boundary

```
Admin_App  ──Bearer JWT──►  rehearsalhub-api  ──Prisma──►  PostgreSQL
Admin_App  ──WebSocket──►   rehearsalhub-api  ──broadcast─►  all subscribers
```

No screen may import `prisma`, `pg`, or any database library. No screen may contact any service other than `rehearsalhub-api`.

---

## Components and Interfaces

### Gap 1 — PraiseNightScreen CRUD

**Additions to `PraiseNightScreen.tsx`:**

```typescript
// State additions
const [showProgramModal, setShowProgramModal] = useState(false);
const [editingProgram, setEditingProgram] = useState<Program | null>(null);
const [form, setForm] = useState({ name: '', date: '', location: '', category: 'pre-rehearsal' });

// Handlers
async function handleCreateOrUpdate(): Promise<void>
async function handleDeleteProgram(program: Program): Promise<void>
```

**Modal form fields:**
- `name` (required, TextInput)
- `date` (required, format: `YYYY-MM-DD`, TextInput)
- `location` (TextInput)
- `category` (TextInput, defaults to `pre-rehearsal`)

**FAB:** `position: 'absolute', bottom: 28, right: 20` on the outer `SafeAreaView`, `zIndex: 100`.

**Long-press:** `onLongPress` prop on the existing `renderItem` card `<View>` — shows `ActionSheetIOS` (iOS) or an `Alert` with options (Android/cross-platform).

**API calls:**
- Create: `apiClient.post('/programs', { name, date, location, category: 'pre-rehearsal', status: 'pre-rehearsal', zoneId: activeZone?.id ?? '' })`
- Update: `apiClient.patch('/programs/${id}', { name, date, location, category })`
- Delete: `apiClient.delete('/programs/${id}')`

---

### Gap 2 — ProgramSongsScreen (New Screen)

**File:** `src/screens/ProgramSongsScreen.tsx`

**Route params:**
```typescript
interface ProgramSongsParams {
  program: Program;  // full Program object passed from PraiseNightScreen
}
```

**State:**
```typescript
const [programSongs, setProgramSongs] = useState<PraiseSong[]>([]);
const [masterSongs, setMasterSongs] = useState<MasterSong[]>([]);
const [searchQuery, setSearchQuery] = useState('');
const [addModalVisible, setAddModalVisible] = useState(false);
const [loading, setLoading] = useState(true);
```

**Data flow:**
1. On mount: fetch `GET /songs/praise-night?praiseNightId=<program.id>` to get current songs.
2. On "Add Song" tap: open modal, fetch `GET /songs/master` to populate search.
3. On song select: call `PATCH /programs/:id` with merged `songIds` array.
4. On remove: call `PATCH /programs/:id` with filtered `songIds` array.
5. On heard toggle: call `PATCH /songs/praise-night/:songId` with `{ isHeard: <boolean> }`.

**"Go Live" button:** Visible only when `program.status === 'ongoing'`; navigates to `LiveConductorScreen` with `program` param.

**Interfaces:**
```typescript
interface PraiseSong {
  id: string;
  title: string;
  key?: string;
  isActive?: boolean;
  isHeard?: boolean;
  songOrder?: number;
}
```

---

### Gap 3 — LiveConductorScreen (New Screen)

**File:** `src/screens/LiveConductorScreen.tsx`

**Route params:**
```typescript
interface LiveConductorParams {
  program: Program;
}
```

**State:**
```typescript
const [songs, setSongs] = useState<PraiseSong[]>([]);
const [activeSongId, setActiveSongId] = useState<string | null>(null);
const [setting, setSetting] = useState(false); // in-flight
```

**WebSocket subscription:**
```typescript
useWebSocket('song', 'all', (data: unknown) => {
  const event = data as { id?: string; isActive?: boolean };
  if (event.isActive && event.id) {
    setActiveSongId(event.id);
  }
}, true);
```

The `song` resource alias must be added to `RESOURCE_ALIASES` in `useWebSocket.ts`:
```typescript
song: ['songs', 'praise_night_song', 'active_song'],
```

**Set active song flow:**
```typescript
async function handleSetActive(song: PraiseSong) {
  const prev = activeSongId;
  setActiveSongId(song.id); // optimistic
  try {
    await apiClient.patch(`/songs/praise-night/${song.id}`, { isActive: true });
  } catch {
    setActiveSongId(prev); // revert
    // show toast
  }
}
```

**Visual highlight:** Active song card has `borderColor: Colors.success, borderWidth: 2` and a green `● LIVE` badge.

---

### Gap 4 — MasterLibraryScreen Zone Songs Tab

**Additions to `MasterLibraryScreen.tsx`:**

```typescript
const TABS = ['master', 'zone'] as const;
const [activeTab, setActiveTab] = useState<typeof TABS[number]>('master');
const [zoneSongs, setZoneSongs] = useState<ZoneSong[]>([]);
const [showZoneForm, setShowZoneForm] = useState(false);
const [editingZoneSong, setEditingZoneSong] = useState<ZoneSong | null>(null);
```

**New component:** `ZoneSongFormModal.tsx` (separate file, <300 lines)

```typescript
interface ZoneSongFormModalProps {
  visible: boolean;
  editSong: ZoneSong | null;
  onClose: () => void;
  onSaved: () => void;
}
```

**Zone Song interface:**
```typescript
interface ZoneSong {
  id: string;
  title: string;
  writer?: string;
  key?: string;
  tempo?: string;
  category?: string;
  zoneId?: string;
  subGroupId?: string;
}
```

**API calls:**
- Fetch: `GET /songs/zone`
- Create: `POST /subgroups/songs` with `{ title, writer, key, tempo, category, zoneId: activeZone?.id }`
- Update: `PATCH /subgroups/songs/:id` with changed fields
- Delete: `DELETE /subgroups/songs/:id`

**FAB:** Only rendered when `activeTab === 'zone'`.

---

### Gap 5 — MediaScreen Upload

**Additions to `MediaScreen.tsx`:**

```typescript
const [uploading, setUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
```

**Upload flow:**
```typescript
async function handleUpload() {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return;
  const file = result.assets[0];
  
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream',
  } as any);

  setUploading(true);
  try {
    const token = await SecureStore.getItemAsync('jwt');
    const uploadRes = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed');

    await apiClient.post('/media', {
      name: file.name,
      url: uploadData.url ?? uploadData.data?.url,
      type: inferMediaType(file.mimeType ?? ''),
      zoneId: activeZone?.id,
    });
    fetchMedia();
  } catch (e: any) {
    Alert.alert('Upload Failed', e.message);
  } finally {
    setUploading(false);
  }
}

function inferMediaType(mimeType: string): 'audio' | 'document' | 'video' | 'image' {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}
```

**Note:** The upload uses raw `fetch` (not `apiClient`) because `apiClient` does not support `FormData`. The JWT token is read directly from `SecureStore`.

**New dependency:** `expo-document-picker@13.0.3` (pinned exact version compatible with Expo SDK 54).

---

### Gap 6 — API: Attendance Code Routes

**File:** `rehearsalhub-api/src/routes/attendance.routes.ts`

**New routes added after existing routes:**

```typescript
/** POST /attendance/code — Create or deactivate an attendance code */
router.post('/code', requireAuth, requireTenantAdmin, async (req: any, res) => {
  // zod validation: { code?: string, validMinutes?: number, zoneId?: string, active?: boolean }
  // key: `attendance_code_${effectiveZoneId}`
  // store in Setting model via prisma.setting.upsert
  // if active=false, store { active: false, code: '', expiresAt: null }
  // validate code against existing on check-in (done in check-in handler)
});

/** GET /attendance/code — Retrieve active code for zone */
router.get('/code', requireAuth, async (req: any, res) => {
  // key: `attendance_code_${effectiveZoneId}`
  // fetch from prisma.setting.findUnique
  // if not found or expired: return { success: true, data: { active: false } }
  // if found and active and not expired: return full record
});
```

**Storage schema in `Setting.value`:**
```typescript
interface AttendanceCodeSetting {
  code: string;
  active: boolean;
  validMinutes: number;
  zoneId: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO = createdAt + validMinutes * 60 * 1000
}
```

**Setting key pattern:** `attendance_code_<zoneId>` (e.g., `attendance_code_zone-001`)

**Validation integration:** The existing `POST /attendance/check-in` handler will be updated to optionally validate the submitted `code` field against the active `Setting` record for the zone.

**Client wiring (`AttendanceScreen.tsx`):**
- `handleCreateCode`: call `POST /attendance/code` with `{ code, validMinutes: 60, zoneId: activeZone?.id }`
- `handleEndCode`: call `POST /attendance/code` with `{ active: false, zoneId: activeZone?.id }`
- On mount: call `GET /attendance/code` to restore `activeCode` state

---

### Gap 7 — QR Code Display

**Additions to `AttendanceScreen.tsx`:**

```typescript
const [qrModalVisible, setQrModalVisible] = useState(false);
```

**"Show QR" button:** Rendered inline on the active-code card when `activeCode !== null`.

**QR Modal:**
```tsx
<Modal visible={qrModalVisible} transparent animationType="fade">
  <View style={styles.qrOverlay}>
    <View style={styles.qrCard}>
      <Text style={styles.qrTitle}>Scan to Check In</Text>
      <QRCode value={activeCode ?? ''} size={260} backgroundColor="white" color="black" />
      <Text style={styles.qrCodeText}>{activeCode}</Text>
      <TouchableOpacity onPress={() => setQrModalVisible(false)} style={styles.qrCloseBtn}>
        <Text style={styles.qrCloseBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

**New dependency:** `react-native-qrcode-svg@6.3.2` (pinned, already requested in spec).
**Peer dependency:** `react-native-svg` — check if already present; if not, add `react-native-svg@15.8.0`.

---

### Gap 8 — Dashboard Stats Fix

**Change to `DashboardScreen.tsx` `fetchStats`:**

```typescript
// Before (wrong):
apiClient.get<any>(`/submitted-songs${zoneParam}`)  // for totalSongs

// After (correct):
apiClient.get<any>(`/songs/zone${zoneParam}`)  // zone song catalog count
```

**Stat card label rename:** `"Members"` → `"Zone Members"` (label string only, no logic change).

**Result shape change in `Stats` interface:**
```typescript
interface Stats {
  totalSongs: number;      // now from /songs/zone
  pendingSongs: number;    // unchanged from /submitted-songs
  totalMembers: number;    // unchanged from /profiles/directory
  activePrograms: number;  // unchanged from /programs filter status=ongoing
}
```

---

### Gap 9 — SongDetailScreen Save Endpoint Fix

**Logic change in `handleSave`:**

```typescript
async function handleSave() {
  if (!song?.id) return;
  const isZoneSong = Boolean(song.subGroupId || song.sub_group_id);
  if (!isZoneSong) return; // should not be reachable if Edit is hidden for master songs

  setSaving(true);
  try {
    await apiClient.patch(`/subgroups/songs/${song.id}`, editForm);
    setSong((prev: any) => ({ ...prev, ...editForm }));
    setIsEditing(false);
    Alert.alert('Saved', 'Song details updated.');
  } catch (e: any) {
    Alert.alert('Error', e.message || 'Failed to update song');
  } finally {
    setSaving(false);
  }
}
```

**Edit button visibility guard:**

```typescript
// In the header section, replace the Edit toggle button logic:
const isZoneSong = Boolean(song?.subGroupId || song?.sub_group_id);

// Only show edit button for zone songs:
{isZoneSong ? (
  <TouchableOpacity style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
    onPress={() => isEditing ? handleSave() : setIsEditing(true)} ...>
    ...
  </TouchableOpacity>
) : (
  <View style={styles.readOnlyBadge}>
    <Text style={styles.readOnlyBadgeText}>Master — Read Only</Text>
  </View>
)}
```

---

### Navigation Changes (`AppNavigator.tsx`)

Three new screens must be registered in the `Stack.Navigator`:

```typescript
import ProgramSongsScreen   from '../screens/ProgramSongsScreen';
import LiveConductorScreen  from '../screens/LiveConductorScreen';

// Inside Stack.Navigator:
<Stack.Screen name="ProgramSongs"    component={ProgramSongsScreen}   options={{ headerShown: false }} />
<Stack.Screen name="LiveConductor"   component={LiveConductorScreen}  options={{ headerShown: false }} />
```

Navigation calls:
- `PraiseNightScreen` card tap → `navigation.navigate('ProgramSongs', { program: item })`
- `ProgramSongsScreen` Go Live → `navigation.navigate('LiveConductor', { program })`

---

## Data Models

### AttendanceCodeSetting (stored in `Setting` model)

| Field | Type | Description |
|---|---|---|
| `code` | `string` | Alphanumeric 4-8 char passcode |
| `active` | `boolean` | Whether code is currently accepting check-ins |
| `validMinutes` | `number` | Duration in minutes from creation |
| `zoneId` | `string` | Zone this code is scoped to |
| `createdAt` | `string (ISO)` | Creation timestamp |
| `expiresAt` | `string (ISO)` | `createdAt + validMinutes * 60000` |

### Program (existing, no schema change)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `name` | `string` | |
| `date` | `string` | ISO `YYYY-MM-DD` |
| `location` | `string` | |
| `category` | `string` | `pre-rehearsal` \| `ongoing` \| `archive` |
| `status` | `string` | same values as category |
| `zoneId` | `string` | |
| `songIds` | `string[]` | Array of praise-night song IDs |

### ZoneSong (existing, no schema change)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `title` | `string` | |
| `writer` | `string?` | |
| `key` | `string?` | |
| `tempo` | `string?` | |
| `category` | `string?` | |
| `zoneId` | `string?` | |
| `subGroupId` | `string?` | Present if church-scoped |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Song array add invariant

*For any* program with an existing `songIds` array and any valid song ID not already in the array, after adding the song the resulting array should have exactly one more element than the original and must contain the new ID.

**Validates: Requirements 2.4**

### Property 2: Song array remove invariant

*For any* program with an existing `songIds` array and any song ID that is present in the array, after removing the song the resulting array should have exactly one fewer element than the original and must not contain the removed ID.

**Validates: Requirements 2.5**

### Property 3: At most one active song

*For any* set of songs in a program after a `setActive(songId)` operation, exactly one song should have `isActive === true` and all other songs should have `isActive === false`.

**Validates: Requirements 3.3, 3.4**

### Property 4: Media type inference completeness

*For any* MIME type string, `inferMediaType` should return one of the four valid values: `'audio'`, `'video'`, `'image'`, or `'document'`, and should never return `undefined` or throw.

**Validates: Requirements 5.4**

### Property 5: Save endpoint routing invariant

*For any* song object, if `song.subGroupId` is truthy then the save endpoint path should equal `/subgroups/songs/${song.id}`; if `song.subGroupId` is falsy the edit controls should be hidden (no save call possible).

**Validates: Requirements 9.1, 9.2**

---

## Error Handling

| Scenario | Strategy |
|---|---|
| Any `apiClient` call returns non-2xx | `Alert.alert('Error', parsedErrorMessage)` — never show raw stack traces |
| `POST /programs` 409 conflict | "A program with this name already exists" |
| Upload fails mid-stream | Restore FAB, show alert with retry option |
| WebSocket disconnect | `useWebSocket` handles auto-reconnect with exponential back-off (already implemented) |
| `GET /attendance/code` 404 / network error | Silently default to `activeCode = null`; do not crash |
| `PATCH /songs/praise-night/:id` fails in LiveConductorScreen | Revert `activeSongId` state to previous value; show brief Alert |
| `DELETE /programs/:id` fails | Show alert; do not remove item from list |
| QR lib not loaded | Wrap `<QRCode>` in error boundary; show code string fallback |

All server-side errors in `attendance.routes.ts` follow the existing pattern:
```typescript
res.status(500).json({ success: false, error: 'Descriptive message' });
```
Raw `err.message` from Prisma is never forwarded to clients.

---

## Testing Strategy

**Unit tests** (example-based):
- FAB tap opens modal
- Empty name prevents form submit
- Edit pre-populates form fields
- Delete prompts confirmation before API call
- `GET /attendance/code` failure sets `activeCode = null`
- QR modal renders when `activeCode` is set
- Dashboard "Total Songs" calls `/songs/zone` not `/submitted-songs`
- `handleSave` calls `/subgroups/songs/:id` when `song.subGroupId` is set
- `handleSave` does not fire when `song.subGroupId` is absent

**Property-based tests** — use `fast-check` library, minimum 100 iterations each:
- **Property 1** — `fc.array(fc.uuid())` × `fc.uuid()` — add produces `length + 1` and includes new id
- **Property 2** — `fc.array(fc.uuid(), { minLength: 1 })` × pick arbitrary element to remove — result has `length - 1` and excludes removed id
- **Property 3** — `fc.array(fc.record({ id: fc.uuid(), isActive: fc.boolean() }), { minLength: 1 })` — after setActive(randomId), exactly one element has `isActive = true`
- **Property 4** — `fc.constantFrom('audio/mpeg','video/mp4','image/png','application/pdf','application/zip','text/plain', '')` — `inferMediaType` always returns one of four values
- **Property 5** — `fc.record({ id: fc.uuid(), subGroupId: fc.option(fc.uuid()) })` — `resolveEndpoint(song)` returns `/subgroups/songs/${id}` iff `subGroupId` is defined

**Integration tests** (1-3 examples each):
- Full create-program flow against test API
- Attendance code POST/GET round-trip
- WebSocket `song` event triggers `activeSongId` state update in LiveConductorScreen

Property test tag format: `// Feature: admin-feature-parity, Property N: <property_text>`
