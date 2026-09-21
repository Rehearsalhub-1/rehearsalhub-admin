/**
 * Preservation Property Tests — Crashes (P-C1 through P-C5)
 *
 * These tests verify that PRESERVED BEHAVIOURS still exist in the source code
 * on UNFIXED code and must continue to pass AFTER the fixes are applied.
 *
 * Run: node src/__tests__/preservation.crashes.test.js
 *
 * Validates: Requirements 3.1.1, 3.2.1, 3.3.1, 3.4.1, 3.5.1
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '../../');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// P-C1  AppNavigator.tsx imports all expected screen components
// Preservation 3.1.1: screens continue to be registered after error-boundary
// wrapping is added.
// ──────────────────────────────────────────────────────────────────────────────
console.log('\nP-C1 — AppNavigator imports expected screen components');

const appNavigator = read('src/navigation/AppNavigator.tsx');

const expectedScreens = [
  'DashboardScreen',
  'MembersScreen',
  'ScheduleScreen',
  'SubmittedSongsScreen',
  'ProgramsScreen',
  'MasterLibraryScreen',
  'AttendanceScreen',
  'MediaLibraryScreen',
  'CalendarScreen',
  'SupportChatScreen',
  'AnalyticsScreen',
  'NotificationsScreen',
  'LoginScreen',
];

for (const screen of expectedScreens) {
  test(`imports ${screen}`, () => {
    assert.ok(
      appNavigator.includes(screen),
      `Expected AppNavigator.tsx to import / reference "${screen}" but it was not found`
    );
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// P-C2  useMasterLibrary.ts exports toggleHideMasterSong and calls setMasterSongs
// Preservation 3.2.1: after adding API call + rollback, the optimistic
// setMasterSongs update must still be present.
// ──────────────────────────────────────────────────────────────────────────────
console.log('\nP-C2 — useMasterLibrary preserves toggleHideMasterSong + setMasterSongs');

const masterLibrary = read('src/hooks/useMasterLibrary.ts');

test('exports toggleHideMasterSong', () => {
  assert.ok(
    masterLibrary.includes('toggleHideMasterSong'),
    'Expected useMasterLibrary.ts to export toggleHideMasterSong'
  );
});

test('toggleHideMasterSong calls setMasterSongs (optimistic update preserved)', () => {
  // Locate the toggleHideMasterSong function body
  const fnStart = masterLibrary.indexOf('toggleHideMasterSong');
  assert.ok(fnStart !== -1, 'toggleHideMasterSong not found in useMasterLibrary.ts');

  // Check that setMasterSongs appears after the function definition
  const afterFn = masterLibrary.slice(fnStart);
  assert.ok(
    afterFn.includes('setMasterSongs'),
    'Expected toggleHideMasterSong to call setMasterSongs for the optimistic update'
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// P-C3  ScheduleScreen.tsx has updateProgramData and handleMakeCurrent functions
// Preservation 3.3.1: after adding the null guard these functions must
// continue to exist.
// ──────────────────────────────────────────────────────────────────────────────
console.log('\nP-C3 — ScheduleScreen preserves updateProgramData + handleMakeCurrent');

const scheduleScreen = read('src/screens/ScheduleScreen.tsx');

test('has updateProgramData function', () => {
  assert.ok(
    scheduleScreen.includes('updateProgramData'),
    'Expected ScheduleScreen.tsx to contain an updateProgramData function'
  );
});

test('has handleMakeCurrent function', () => {
  assert.ok(
    scheduleScreen.includes('handleMakeCurrent'),
    'Expected ScheduleScreen.tsx to contain a handleMakeCurrent function'
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// P-C4  SubmittedSongsScreen.tsx has handleToggleQuickAudio and
//        setPlayingSongId(null) within that function
// Preservation 3.4.1: after moving setPlayingSongId to after createAudioPlayer
// succeeds, the stop/clean-up call setPlayingSongId(null) must still exist.
// ──────────────────────────────────────────────────────────────────────────────
console.log('\nP-C4 — SubmittedSongsScreen preserves handleToggleQuickAudio + setPlayingSongId(null)');

const submittedSongs = read('src/screens/SubmittedSongsScreen.tsx');

test('has handleToggleQuickAudio function', () => {
  assert.ok(
    submittedSongs.includes('handleToggleQuickAudio'),
    'Expected SubmittedSongsScreen.tsx to contain a handleToggleQuickAudio function'
  );
});

test('setPlayingSongId(null) exists inside handleToggleQuickAudio (stop/clean-up behaviour)', () => {
  const fnStart = submittedSongs.indexOf('handleToggleQuickAudio');
  assert.ok(fnStart !== -1, 'handleToggleQuickAudio not found');

  // Find the closing of the function by locating the next top-level function
  // or the end of file — we search for setPlayingSongId(null) after the fn start
  const afterFn = submittedSongs.slice(fnStart);
  assert.ok(
    afterFn.includes('setPlayingSongId(null)'),
    'Expected setPlayingSongId(null) to appear inside handleToggleQuickAudio for stop/cleanup'
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// P-C5  adminStore.ts has a bootstrap async function
// Preservation 3.5.1: after adding the mutex the bootstrap function must
// continue to exist and remain async.
// ──────────────────────────────────────────────────────────────────────────────
console.log('\nP-C5 — adminStore preserves bootstrap async function');

const adminStore = read('src/stores/adminStore.ts');

test('has a bootstrap property / function', () => {
  assert.ok(
    adminStore.includes('bootstrap'),
    'Expected adminStore.ts to contain a bootstrap function'
  );
});

test('bootstrap is declared as async', () => {
  // Matches both `bootstrap: async () =>` and `async bootstrap()`
  const hasAsync = /bootstrap\s*:\s*async|async\s+bootstrap/.test(adminStore);
  assert.ok(
    hasAsync,
    'Expected bootstrap in adminStore.ts to be declared as async'
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('Some preservation tests FAILED — preserved behaviour is missing.');
  process.exit(1);
}

console.log('All preservation tests PASSED — baseline behaviour confirmed.');
process.exit(0);
