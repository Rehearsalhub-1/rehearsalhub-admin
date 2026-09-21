/**
 * Preservation Tests — Silent Failures (P-SF1, P-SF2, P-SF3)
 *
 * These tests verify that core functionality is PRESERVED after applying fixes.
 * A PASS means the expected functions/patterns still exist → safe to ship.
 *
 * Run: node src/__tests__/preservation.silentFailures.test.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✅  PASS: ${name}`);
    if (detail) console.log(`       ${detail}`);
    passed++;
  } else {
    console.log(`  ❌  FAIL: ${name}`);
    if (detail) console.log(`       ${detail}`);
    failed++;
  }
}

function readFile(relPath) {
  const abs = path.resolve(__dirname, '..', '..', relPath);
  return fs.readFileSync(abs, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// P-SF1: useSubmissions.ts — approveSong, rejectSong, deleteSong still exist
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n━━━ P-SF1: useSubmissions.ts — mutator functions preserved ━━━\n');

const submissionsSource = readFile('src/hooks/useSubmissions.ts');

// Check functions are declared
assert(
  'P-SF1a: approveSong function is declared',
  /const approveSong\s*=\s*useCallback/.test(submissionsSource),
  'approveSong useCallback declaration found'
);

assert(
  'P-SF1b: rejectSong function is declared',
  /const rejectSong\s*=\s*useCallback/.test(submissionsSource),
  'rejectSong useCallback declaration found'
);

assert(
  'P-SF1c: deleteSong function is declared',
  /const deleteSong\s*=\s*useCallback/.test(submissionsSource),
  'deleteSong useCallback declaration found'
);

// Check functions are exported in the return object
assert(
  'P-SF1d: approveSong is in the return object (exported)',
  /return\s*\{[\s\S]*\bapproveSong\b[\s\S]*\}/.test(submissionsSource),
  'approveSong found in return object'
);

assert(
  'P-SF1e: rejectSong is in the return object (exported)',
  /return\s*\{[\s\S]*\brejectSong\b[\s\S]*\}/.test(submissionsSource),
  'rejectSong found in return object'
);

assert(
  'P-SF1f: deleteSong is in the return object (exported)',
  /return\s*\{[\s\S]*\bdeleteSong\b[\s\S]*\}/.test(submissionsSource),
  'deleteSong found in return object'
);

// Check approveSong still calls the API
assert(
  'P-SF1g: approveSong still calls api.submittedSongs.approve',
  /api\.submittedSongs\.approve\(id\)/.test(submissionsSource),
  'API call preserved in approveSong'
);

// Check rejectSong still calls the API
assert(
  'P-SF1h: rejectSong still calls api.submittedSongs.reject',
  /api\.submittedSongs\.reject\(id/.test(submissionsSource),
  'API call preserved in rejectSong'
);

// Check deleteSong still calls the API
assert(
  'P-SF1i: deleteSong still calls api.submittedSongs.delete',
  /api\.submittedSongs\.delete\(id\)/.test(submissionsSource),
  'API call preserved in deleteSong'
);

// ─────────────────────────────────────────────────────────────────────────────
// P-SF2: useMasterLibrary.ts — removeMasterSong calls setMasterSongs (preserved)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n━━━ P-SF2: useMasterLibrary.ts — removeMasterSong preserved ━━━\n');

const masterLibSource = readFile('src/hooks/useMasterLibrary.ts');

assert(
  'P-SF2a: removeMasterSong function is declared',
  /const removeMasterSong\s*=\s*useCallback/.test(masterLibSource),
  'removeMasterSong useCallback declaration found'
);

assert(
  'P-SF2b: removeMasterSong calls setMasterSongs (optimistic update preserved)',
  (() => {
    // Count occurrences — should have at least 2 (optimistic remove + rollback)
    const matches = masterLibSource.match(/setMasterSongs/g);
    return matches && matches.length >= 2;
  })(),
  'setMasterSongs called (optimistic + rollback)'
);

assert(
  'P-SF2c: removeMasterSong is exported in return object',
  /return\s*\{[\s\S]*\bremoveMasterSong\b[\s\S]*\}/.test(masterLibSource),
  'removeMasterSong in return object'
);

// Check underlying delete API call is preserved
assert(
  'P-SF2d: removeMasterSong still calls the delete API',
  /apiClient\.delete\(`\/master-songs\/\$\{id\}`\)/.test(masterLibSource),
  'apiClient.delete call preserved'
);

// ─────────────────────────────────────────────────────────────────────────────
// P-SF3: ActivityLogsScreen — fetch logic preserved after adding error state
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n━━━ P-SF3: Screen fetch logic preserved ━━━\n');

const activitySource = readFile('src/screens/ActivityLogsScreen.tsx');

assert(
  'P-SF3a: ActivityLogsScreen has fetchLogs function',
  /async function fetchLogs/.test(activitySource),
  'fetchLogs function found'
);

assert(
  'P-SF3b: ActivityLogsScreen fetchLogs calls the API',
  /api\.activityLogs\.getAll/.test(activitySource),
  'api.activityLogs.getAll() call found'
);

assert(
  'P-SF3c: ActivityLogsScreen sets logs state from API response',
  /setLogs/.test(activitySource),
  'setLogs call found'
);

assert(
  'P-SF3d: ActivityLogsScreen useEffect triggers fetchLogs',
  /useEffect\(.*fetchLogs/.test(activitySource),
  'useEffect calling fetchLogs found'
);

// SupportChatScreen
const supportSource = readFile('src/screens/SupportChatScreen.tsx');

assert(
  'P-SF3e: SupportChatScreen has fetchThreads function',
  /const fetchThreads\s*=\s*useCallback/.test(supportSource),
  'fetchThreads useCallback found'
);

assert(
  'P-SF3f: SupportChatScreen fetchThreads calls the API',
  /api\.support\.getThreads/.test(supportSource),
  'api.support.getThreads call found'
);

assert(
  'P-SF3g: SupportChatScreen sets threads state from API response',
  /setThreads\(/.test(supportSource),
  'setThreads call found'
);

// CalendarScreen
const calendarSource = readFile('src/screens/CalendarScreen.tsx');

assert(
  'P-SF3h: CalendarScreen has fetchEvents function',
  /const fetchEvents\s*=\s*useCallback/.test(calendarSource),
  'fetchEvents useCallback found'
);

assert(
  'P-SF3i: CalendarScreen fetchEvents calls the API',
  /api\.calendar\.getEvents/.test(calendarSource),
  'api.calendar.getEvents call found'
);

assert(
  'P-SF3j: CalendarScreen sets events state from API response',
  /setEvents\(Array\.isArray/.test(calendarSource),
  'setEvents with Array.isArray check found'
);

// useSchedule (ScheduleScreen's data hook)
const scheduleSource = readFile('src/hooks/useSchedule.ts');

assert(
  'P-SF3k: useSchedule has a fetch function that calls the schedule API',
  /api\.schedule\.getAll/.test(scheduleSource),
  'api.schedule.getAll call found'
);

assert(
  'P-SF3l: useSchedule sets programs state from API response',
  /setPrograms\(/.test(scheduleSource),
  'setPrograms call found'
);

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n━━━ Summary ━━━\n');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log();

if (failed > 0) {
  console.log('Some preservation checks failed. Core functionality may have been broken.\n');
  process.exit(1);
} else {
  console.log('All preservation checks passed. Core functionality is intact.\n');
  process.exit(0);
}
