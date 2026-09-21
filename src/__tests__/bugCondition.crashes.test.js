/**
 * Bug Condition Exploration Tests — Crashes (C-1 through C-5)
 *
 * These tests confirm each crash bug EXISTS in unfixed code.
 * A test PASSES when the bug is present (unfixed code).
 *
 * Run: node src/__tests__/bugCondition.crashes.test.js
 *
 * Validates: Requirements 2.1.1, 2.2.1, 2.3.1, 2.4.1, 2.5.1
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Tiny assertion helpers ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, label, bugNote) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
    results.push({ label, status: 'PASS' });
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    if (bugNote) console.error(`         (Bug not present: ${bugNote})`);
    failed++;
    results.push({ label, status: 'FAIL', bugNote });
  }
}

function section(name) {
  console.log(`\n── ${name} ──`);
}

// ── Resolve source root ───────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..', '..');

function readSrc(relPath) {
  return fs.readFileSync(path.join(ROOT, 'src', relPath), 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// C-1: No ScreenErrorBoundary wrapping in AppNavigator
//
// Bug Condition: AppNavigator.tsx registers 25+ screen components; none is
// wrapped in withErrorBoundary HOC, leaving all screens unprotected.
//
// Test PASSES when the bug EXISTS (no withErrorBoundary wrapping found).
// ─────────────────────────────────────────────────────────────────────────────

section('C-1 — No ScreenErrorBoundary in AppNavigator');

const appNavigatorSrc = readSrc('navigation/AppNavigator.tsx');

// The fix would import withErrorBoundary from ScreenErrorBoundary
const hasWithErrorBoundaryImport = /withErrorBoundary/.test(appNavigatorSrc);
assert(
  !hasWithErrorBoundaryImport,
  'AppNavigator does NOT import withErrorBoundary (screens are unprotected)',
  'withErrorBoundary is now imported — fix may be applied'
);

// The fix would create Safe* wrapped variants
const hasSafeVariants = /const\s+Safe\w+\s*=\s*withErrorBoundary\s*\(/.test(appNavigatorSrc);
assert(
  !hasSafeVariants,
  'No Safe* = withErrorBoundary(...) wrapped screen variants exist',
  'Safe* wrapped variants found — fix may be applied'
);

// The fix would wrap at least the primary tab screens
const wrappedScreenCount = (appNavigatorSrc.match(/withErrorBoundary\s*\(/g) || []).length;
assert(
  wrappedScreenCount === 0,
  `withErrorBoundary() is called 0 times (found: ${wrappedScreenCount})`,
  `withErrorBoundary is used ${wrappedScreenCount} time(s) — screens are now protected`
);

// ─────────────────────────────────────────────────────────────────────────────
// C-2: toggleHideMasterSong never calls the API
//
// Bug Condition: useMasterLibrary.ts toggleHideMasterSong only calls
// setMasterSongs; there is no API call (no apiClient.patch, no api.songs, no
// HTTP verb) anywhere in the function body.
//
// Test PASSES when the bug EXISTS (no API call found).
// ─────────────────────────────────────────────────────────────────────────────

section('C-2 — toggleHideMasterSong missing API call');

const masterLibSrc = readSrc('hooks/useMasterLibrary.ts');

// Isolate the toggleHideMasterSong function body
// Match from the function declaration to the closing });  of useCallback
const toggleFnMatch = masterLibSrc.match(
  /const\s+toggleHideMasterSong\s*=\s*useCallback\s*\(([\s\S]*?)\},\s*\[[\s\S]*?\]\s*\)/
);

if (!toggleFnMatch) {
  assert(false, 'Could not locate toggleHideMasterSong in useMasterLibrary.ts — manual inspection needed');
} else {
  const toggleBody = toggleFnMatch[0];

  const hasApiClientPatch = /apiClient\s*\.\s*patch/.test(toggleBody);
  assert(
    !hasApiClientPatch,
    'toggleHideMasterSong body does NOT contain apiClient.patch',
    'apiClient.patch found — API call is now present'
  );

  const hasApiSongsCall = /api\s*\.\s*songs/.test(toggleBody);
  assert(
    !hasApiSongsCall,
    'toggleHideMasterSong body does NOT contain api.songs',
    'api.songs found — API call is now present'
  );

  // Broader check: no HTTP verb anywhere in the function body
  const hasAnyHttpCall = /\b(get|post|put|patch|delete)\s*\(/.test(toggleBody);
  assert(
    !hasAnyHttpCall,
    'toggleHideMasterSong body contains NO HTTP method call (get/post/put/patch/delete)',
    'HTTP call detected — API integration is now present'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// C-3: Non-null assertion on activeProgram in ScheduleScreen
//
// Bug Condition: ScheduleScreen contains `activeProgram!` (non-null assertion),
// which will throw TypeError: Cannot spread undefined if activeProgram is null.
//
// Test PASSES when the bug EXISTS (non-null assertion is present).
// ─────────────────────────────────────────────────────────────────────────────

section('C-3 — activeProgram! non-null assertion in ScheduleScreen');

const scheduleSrc = readSrc('screens/ScheduleScreen.tsx');

const hasNonNullAssertion = /activeProgram!/.test(scheduleSrc);
assert(
  hasNonNullAssertion,
  'activeProgram! non-null assertion IS present in ScheduleScreen (crash risk confirmed)',
  'activeProgram! not found — assertion may have been removed (fix applied)'
);

// Confirm it appears in a spread context (the specific crash scenario)
const hasSpreadAssertion = /\{\s*\.\.\.\s*activeProgram!/.test(scheduleSrc);
assert(
  hasSpreadAssertion,
  '...activeProgram! spread IS present (TypeError on null confirmed)',
  '...activeProgram! spread not found — guard may be in place'
);

// ─────────────────────────────────────────────────────────────────────────────
// C-4: setPlayingSongId set before createAudioPlayer in SubmittedSongsScreen
//
// Bug Condition: handleToggleQuickAudio calls setPlayingSongId(song.id) BEFORE
// calling createAudioPlayer. If createAudioPlayer throws, the UI is stuck in
// "playing" state with no player.
//
// Test PASSES when the bug EXISTS (setPlayingSongId precedes createAudioPlayer).
// ─────────────────────────────────────────────────────────────────────────────

section('C-4 — setPlayingSongId before createAudioPlayer in SubmittedSongsScreen');

const submittedSrc = readSrc('screens/SubmittedSongsScreen.tsx');

// Locate the start of handleToggleQuickAudio in the full file
const fnStartIdx = submittedSrc.indexOf('async function handleToggleQuickAudio(');

if (fnStartIdx === -1) {
  assert(false, 'Could not locate handleToggleQuickAudio in SubmittedSongsScreen.tsx — manual inspection needed');
} else {
  // Slice from the function start; we only need the first ~50 lines which
  // contains the complete relevant body (function is ~30 lines total)
  const fnSlice = submittedSrc.slice(fnStartIdx, fnStartIdx + 2000);

  // Find the position of setPlayingSongId(song.id) — this is the "set before create" ordering bug
  // Note: there are also setPlayingSongId(null) calls; we want the one that sets song.id
  const setIdPos = fnSlice.indexOf('setPlayingSongId(song.id)');

  // Find the position of the createAudioPlayer call
  const createPlayerPos = fnSlice.indexOf('createAudioPlayer(');

  assert(
    setIdPos !== -1,
    'setPlayingSongId(song.id) IS present in handleToggleQuickAudio',
    'setPlayingSongId(song.id) not found in function'
  );

  assert(
    createPlayerPos !== -1,
    'createAudioPlayer IS present in handleToggleQuickAudio',
    'createAudioPlayer not found in function'
  );

  if (setIdPos !== -1 && createPlayerPos !== -1) {
    // Bug: setPlayingSongId(song.id) appears BEFORE createAudioPlayer in the source.
    // The fix would move setPlayingSongId to AFTER player.play() succeeds.
    const setBeforeCreate = setIdPos < createPlayerPos;
    assert(
      setBeforeCreate,
      `setPlayingSongId(song.id) at offset ${setIdPos} precedes createAudioPlayer at offset ${createPlayerPos} — state is set before player exists (bug confirmed)`,
      `setPlayingSongId(song.id) at offset ${setIdPos} is NOT before createAudioPlayer at offset ${createPlayerPos} — ordering may be fixed`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// C-5: Bootstrap mutex missing in adminStore.ts
//
// Bug Condition: adminStore.ts bootstrap() has no guard variable. Concurrent
// calls both execute, racing to write session state.
//
// Test PASSES when the bug EXISTS (_bootstrapPromise is NOT present).
// ─────────────────────────────────────────────────────────────────────────────

section('C-5 — Bootstrap mutex missing in adminStore');

const adminStoreSrc = readSrc('stores/adminStore.ts');

const hasBootstrapPromise = /_bootstrapPromise/.test(adminStoreSrc);
assert(
  !hasBootstrapPromise,
  '_bootstrapPromise is NOT present in adminStore.ts (no mutex guard — bug confirmed)',
  '_bootstrapPromise found — mutex guard is now in place'
);

const hasIsBootstrapping = /isBootstrapping/.test(adminStoreSrc);
assert(
  !hasIsBootstrapping,
  'isBootstrapping flag is NOT present in adminStore.ts (no boolean mutex either)',
  'isBootstrapping found — mutex guard is now in place'
);

// Also confirm bootstrap() exists and contains the bare set({ loading: true }) call
// without any guard preceding it
const bootstrapFnMatch = adminStoreSrc.match(/bootstrap\s*:\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*?)^\s*\},/m);
if (bootstrapFnMatch) {
  const bootstrapBody = bootstrapFnMatch[1];
  const firstStatementIsSet = /^\s*set\(\s*\{/.test(bootstrapBody.trimStart());
  assert(
    firstStatementIsSet,
    'bootstrap() first statement is set({ loading: true }) with no preceding mutex check (unguarded entry confirmed)',
    'bootstrap() first statement is not a bare set() — a guard may now precede it'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(60));

if (failed > 0) {
  console.log('\nFAILED ASSERTIONS (bug no longer present or not detectable):');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  • ${r.label}`);
    if (r.bugNote) console.log(`    → ${r.bugNote}`);
  });
  console.log('\nA FAIL means the bug was NOT detected (possibly already fixed).');
  console.log('An ALL-PASS run confirms all 5 crash bugs exist in unfixed code.');
  process.exit(1);
} else {
  console.log('\n✓ ALL PASS — all 5 crash bug conditions confirmed on unfixed code.');
  console.log('  Counterexamples:');
  console.log('  C-1: AppNavigator has no withErrorBoundary import or Safe* wrappers');
  console.log('  C-2: toggleHideMasterSong body contains no HTTP call (only setMasterSongs)');
  console.log('  C-3: ScheduleScreen contains ...activeProgram! spread (TypeError on null)');
  console.log('  C-4: setPlayingSongId(song.id) precedes createAudioPlayer() in source');
  console.log('  C-5: adminStore bootstrap() has no _bootstrapPromise or isBootstrapping guard');
  process.exit(0);
}
