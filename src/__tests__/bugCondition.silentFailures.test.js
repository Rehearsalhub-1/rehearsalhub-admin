/**
 * Bug Condition Exploration Tests — Silent Failures (SF-1, SF-2, SF-3)
 *
 * These tests confirm bugs EXIST in the source code (before fixes are applied).
 * A PASS means the bug pattern was found → bug is confirmed.
 * A FAIL means the pattern wasn't found → either already fixed or test logic issue.
 *
 * Run: node src/__tests__/bugCondition.silentFailures.test.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✅  PASS: ${name}`);
    if (detail) console.log(`       ${detail}`);
    passed++;
    results.push({ name, status: 'PASS', detail });
  } else {
    console.log(`  ❌  FAIL: ${name}`);
    if (detail) console.log(`       ${detail}`);
    failed++;
    results.push({ name, status: 'FAIL', detail });
  }
}

function readFile(relPath) {
  const abs = path.resolve(__dirname, '..', '..', relPath);
  return fs.readFileSync(abs, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// SF-1: useSubmissions.ts — approveSong / rejectSong / deleteSong swallow errors
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n━━━ SF-1: useSubmissions.ts — Silent swallowing in mutators ━━━\n');

const submissionsSource = readFile('src/hooks/useSubmissions.ts');

// Extract approveSong function body
const approveMatch = submissionsSource.match(
  /const approveSong\s*=\s*useCallback\(\s*\(.*?\)\s*=>\s*\{([\s\S]*?)\},\s*\[\]/
);
const approveBody = approveMatch ? approveMatch[1] : '';

// Check for .catch(() => {}) or .catch(err => console.warn pattern (silent swallow)
const approveSilent =
  /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(approveBody) ||
  /\.catch\(\s*err\s*=>\s*console\.warn/.test(approveBody);

assert(
  'SF-1a: approveSong has silent .catch(() => {}) — bug confirmed',
  approveSilent,
  `approveSong body snippet: "${approveBody.replace(/\s+/g, ' ').trim().slice(0, 120)}"`
);

// Extract rejectSong function body
const rejectMatch = submissionsSource.match(
  /const rejectSong\s*=\s*useCallback\(\s*\(.*?\)\s*=>\s*\{([\s\S]*?)\},\s*\[\]/
);
const rejectBody = rejectMatch ? rejectMatch[1] : '';

const rejectSilent =
  /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(rejectBody) ||
  /\.catch\(\s*err\s*=>\s*console\.warn/.test(rejectBody);

assert(
  'SF-1b: rejectSong has silent .catch(() => {}) — bug confirmed',
  rejectSilent,
  `rejectSong body snippet: "${rejectBody.replace(/\s+/g, ' ').trim().slice(0, 120)}"`
);

// Extract deleteSong function body
const deleteMatch = submissionsSource.match(
  /const deleteSong\s*=\s*useCallback\(\s*\(.*?\)\s*=>\s*\{([\s\S]*?)\},\s*\[\]/
);
const deleteBody = deleteMatch ? deleteMatch[1] : '';

const deleteSilent =
  /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(deleteBody) ||
  /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(deleteBody) ||
  /\.catch\(\s*err\s*=>\s*\{[\s\S]*?console\.warn/.test(deleteBody) ||
  /\.catch\(\s*err\s*=>\s*console\.warn/.test(deleteBody);

assert(
  'SF-1c: deleteSong has silent .catch(err => console.warn) — bug confirmed',
  deleteSilent,
  `deleteSong body snippet: "${deleteBody.replace(/\s+/g, ' ').trim().slice(0, 120)}"`
);

// ─────────────────────────────────────────────────────────────────────────────
// SF-2: useMasterLibrary.ts — removeMasterSong error handling check
//
// NOTE: removeMasterSong was FIXED in task 9.1 to include Alert.alert + rollback.
// So we assert the FIXED state: Alert.alert IS present → fix confirmed still in place.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n━━━ SF-2: useMasterLibrary.ts — removeMasterSong error handling ━━━\n');

const masterLibSource = readFile('src/hooks/useMasterLibrary.ts');

// Extract removeMasterSong body (up to the closing of the useCallback)
const removeMasterMatch = masterLibSource.match(
  /const removeMasterSong\s*=\s*useCallback\(\s*async\s*\(.*?\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[masterSongs\]\s*\)/
);
const removeMasterBody = removeMasterMatch ? removeMasterMatch[1] : masterLibSource;

const hasAlertInRemove = /Alert\.alert/.test(removeMasterBody);

// SF-2 was already fixed — we verify it stays fixed (Alert.alert IS present)
assert(
  'SF-2: removeMasterSong already has Alert.alert (fix from task 9.1 confirmed)',
  hasAlertInRemove,
  `Alert.alert found in removeMasterSong: ${hasAlertInRemove}`
);

// Also confirm the rollback pattern exists (setMasterSongs re-insert)
const hasRollback = /next\.splice\(previousIndex/.test(removeMasterBody) ||
  /splice\(previousIndex,\s*0,\s*previous\)/.test(removeMasterBody);

assert(
  'SF-2: removeMasterSong has rollback (re-insert at originalIndex) — confirmed',
  hasRollback,
  `Rollback splice found: ${hasRollback}`
);

// ─────────────────────────────────────────────────────────────────────────────
// SF-3: ActivityLogsScreen, SupportChatScreen, CalendarScreen — no fetchError state
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n━━━ SF-3: Screens — missing fetchError state in catch blocks ━━━\n');

function checkNoFetchErrorState(relPath, screenName) {
  const source = readFile(relPath);

  // Look for fetchError state setter calls inside catch blocks
  const hasFetchErrorSetter = /setFetchError\s*\(/.test(source);

  assert(
    `SF-3 ${screenName}: does NOT have setFetchError in catch — bug confirmed`,
    !hasFetchErrorSetter,
    `setFetchError found: ${hasFetchErrorSetter} (false = bug still present)`
  );
}

checkNoFetchErrorState('src/screens/ActivityLogsScreen.tsx', 'ActivityLogsScreen');
checkNoFetchErrorState('src/screens/SupportChatScreen.tsx', 'SupportChatScreen');
checkNoFetchErrorState('src/screens/CalendarScreen.tsx', 'CalendarScreen');

// Also check useSchedule (used by ScheduleScreen)
const scheduleHookSource = readFile('src/hooks/useSchedule.ts');
const scheduleHasFetchError = /setFetchError\s*\(/.test(scheduleHookSource);
assert(
  'SF-3 useSchedule: does NOT have setFetchError in catch — bug confirmed',
  !scheduleHasFetchError,
  `setFetchError found in useSchedule: ${scheduleHasFetchError} (false = bug still present)`
);

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n━━━ Summary ━━━\n');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log();

if (failed > 0) {
  console.log('Some assertions failed. Check output above.\n');
  process.exit(1);
} else {
  console.log('All bug condition checks passed.\n');
  process.exit(0);
}
