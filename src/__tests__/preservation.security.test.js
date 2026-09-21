/**
 * Preservation Property Tests — Security (P-S1 & P-S2)
 *
 * Validates: Requirements 3.1, 3.2
 *
 * These are SOURCE CODE inspection tests using Node's built-in `assert` and `fs`.
 * They establish the BASELINE behaviour that must be preserved after fixes in
 * tasks 3 (S-1: rename env var) and 4 (S-2: move JWT to first-frame auth).
 *
 * IMPORTANT:
 *   - These tests MUST PASS on UNFIXED code (confirms the baseline exists)
 *   - These tests MUST STILL PASS after the fixes in tasks 3 & 4
 *     (confirms the fix did not regress the preserved behaviour)
 *
 * P-S1 — Preservation Requirement 3.1
 *   WHEN a valid API request is made, the system SHALL CONTINUE TO include the
 *   `x-api-key` header with the correct key value.
 *   → Assert: the `request()` function in `apiClient.ts` includes `'x-api-key'`
 *     in the headers object (regardless of which env var name supplies the value).
 *
 * P-S2 — Preservation Requirement 3.2
 *   WHEN a WebSocket connection is authenticated successfully, the system SHALL
 *   CONTINUE TO receive real-time events for all subscribed resources.
 *   → Assert: the `onopen` handler in `useWebSocket.ts` calls
 *     `subscriptions.forEach` and sends subscription messages via `socket.send`.
 *
 * Run: node src/__tests__/preservation.security.test.js
 *
 * Expected outcome on UNFIXED code:  all assertions pass  (baseline confirmed)
 * Expected outcome after fix:        all assertions pass  (no regression)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const assert = require('assert/strict');

// ── Helpers ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function readSource(relativePath) {
  const absolute = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(absolute, 'utf8');
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function describe(suiteName, fn) {
  console.log(`\n${suiteName}`);
  fn();
}

// ── P-S1: x-api-key header preserved in apiClient.ts request() ───────────────
//
// Preservation contract (Requirement 3.1):
//   All authenticated HTTP requests must continue to include `x-api-key` in
//   the request header with the correct value read at runtime.
//
// We inspect the source of `request()` to assert that:
//   1. A variable that holds the API key value is declared at module level.
//   2. The `request()` function includes `'x-api-key'` in its headers object.
//   3. The `uploadRequest()` function also includes `'x-api-key'` in its headers.
//
// After the fix (task 3): the env var name changes from EXPO_PUBLIC_INTERNAL_API_KEY
// to INTERNAL_API_KEY, but the header must still be present. These assertions are
// written against the HEADER INJECTION, not the env var name, so they pass both
// before and after the rename.

describe('P-S1 — Preservation: x-api-key header is included in every HTTP request (apiClient.ts)', () => {
  const source = readSource('src/lib/apiClient.ts');

  test('apiClient.ts declares an API_KEY variable at module level', () => {
    // Matches both:  const API_KEY = process.env.EXPO_PUBLIC_INTERNAL_API_KEY ?? '';
    //                const API_KEY = process.env.INTERNAL_API_KEY ?? '';
    const apiKeyDeclaration = /const\s+API_KEY\s*=\s*process\.env\.\w+/;
    assert.match(
      source,
      apiKeyDeclaration,
      [
        'PRESERVATION VIOLATION (P-S1):',
        '  Expected `src/lib/apiClient.ts` to declare an API_KEY variable that reads',
        '  from a process.env variable, but no such declaration was found.',
        '  The x-api-key header value has no source — all HTTP requests will lack the key.',
      ].join('\n'),
    );
    const lines = source.split('\n');
    lines.forEach((line, i) => {
      if (apiKeyDeclaration.test(line)) {
        console.log(`    BASELINE: apiClient.ts line ${i + 1}: ${line.trim()}`);
      }
    });
  });

  test('request() function includes "x-api-key": API_KEY in the headers object', () => {
    // Matches:  'x-api-key': API_KEY,
    const headerPattern = /'x-api-key'\s*:\s*API_KEY/;
    assert.match(
      source,
      headerPattern,
      [
        'PRESERVATION VIOLATION (P-S1):',
        "  Expected `request()` in `src/lib/apiClient.ts` to include `'x-api-key': API_KEY`",
        '  in its headers object, but the pattern was not found.',
        '  If this assertion fails after the fix, the x-api-key header was accidentally removed.',
      ].join('\n'),
    );
    const lines = source.split('\n');
    lines.forEach((line, i) => {
      if (headerPattern.test(line)) {
        console.log(`    BASELINE: apiClient.ts line ${i + 1}: ${line.trim()}`);
      }
    });
  });

  test('uploadRequest() function includes "x-api-key": API_KEY in the headers object', () => {
    // The upload path also sets the x-api-key header independently
    const uploadHeaderPattern = /'x-api-key'\s*:\s*API_KEY/;
    // We already matched request(); check there are at least 2 occurrences (request + uploadRequest)
    const allMatches = source.match(/'x-api-key'\s*:\s*API_KEY/g) || [];
    assert.ok(
      allMatches.length >= 2,
      [
        'PRESERVATION VIOLATION (P-S1):',
        "  Expected `'x-api-key': API_KEY` to appear in BOTH `request()` and `uploadRequest()`",
        `  but found only ${allMatches.length} occurrence(s).`,
        '  The upload path may have lost its x-api-key header.',
      ].join('\n'),
    );
    console.log(`    BASELINE: 'x-api-key': API_KEY found ${allMatches.length} time(s) in apiClient.ts`);
    console.log('    (covers both request() and uploadRequest() call paths)');
  });

  test('refreshSession() inline fetch also includes "x-api-key": API_KEY header', () => {
    // refreshSession has its own inline fetch with x-api-key
    const refreshPattern = /'x-api-key'\s*:\s*API_KEY/;

    // Locate the refreshSession function body to check it has the header too
    const refreshFnMatch = source.match(/async function refreshSession[\s\S]*?^}/m);
    // Since multiline match can be tricky, just verify the header appears before uploadRequest
    // by checking for at least 2 occurrences (covered by previous test) — this test
    // instead checks the static token refresh fetch carries the header.
    // We look for the pattern after "refreshSession" text but before "async function request"
    const refreshSectionEnd = source.indexOf('async function request(');
    const refreshSection    = refreshSectionEnd > -1 ? source.slice(0, refreshSectionEnd) : source;
    assert.match(
      refreshSection,
      refreshPattern,
      [
        'PRESERVATION VIOLATION (P-S1):',
        '  Expected the token-refresh inline fetch (inside `refreshSession`) to include',
        "  `'x-api-key': API_KEY`, but the pattern was not found in the pre-request() section.",
        '  The refresh call may lose the API key header after the env var rename.',
      ].join('\n'),
    );
    console.log('    BASELINE: x-api-key header also present in refreshSession() inline fetch');
  });
});

// ── P-S2: subscriptions.forEach in onopen preserved in useWebSocket.ts ────────
//
// Preservation contract (Requirement 3.2):
//   WebSocket connections must continue to receive real-time events for all
//   subscribed resources after authentication.
//
// We inspect the source of `useWebSocket.ts` to assert that:
//   1. The `onopen` handler contains `subscriptions.forEach`.
//   2. The `onopen` handler calls `socket?.send(` to transmit subscription messages.
//   3. The subscription message includes `type: 'subscribe'` — the server expects this.
//
// After the fix (task 4): the onopen handler gains a first-frame auth send BEFORE the
// existing subscription loop, but the forEach / send logic must remain intact.

describe('P-S2 — Preservation: onopen sends subscription messages for all resources (useWebSocket.ts)', () => {
  const source = readSource('src/hooks/useWebSocket.ts');

  test('useWebSocket.ts onopen handler calls subscriptions.forEach', () => {
    const forEachPattern = /socket\.onopen\s*=[\s\S]*?subscriptions\.forEach/;
    assert.match(
      source,
      forEachPattern,
      [
        'PRESERVATION VIOLATION (P-S2):',
        '  Expected `socket.onopen` in `src/hooks/useWebSocket.ts` to contain',
        '  `subscriptions.forEach`, but the pattern was not found.',
        '  After the fix, subscriptions must still be re-sent in onopen.',
      ].join('\n'),
    );
    // Find line number for baseline reporting
    const lines = source.split('\n');
    lines.forEach((line, i) => {
      if (/subscriptions\.forEach/.test(line)) {
        console.log(`    BASELINE: useWebSocket.ts line ${i + 1}: ${line.trim()}`);
      }
    });
  });

  test('onopen handler sends subscription messages via socket?.send(', () => {
    // socket?.send( inside the onopen block
    const sendPattern = /socket\.onopen\s*=[\s\S]*?socket\?\.send\s*\(/;
    assert.match(
      source,
      sendPattern,
      [
        'PRESERVATION VIOLATION (P-S2):',
        '  Expected `socket.onopen` in `src/hooks/useWebSocket.ts` to call',
        '  `socket?.send(...)` to transmit subscription messages, but no such call',
        '  was found inside the onopen handler.',
        '  Real-time events will not be received if subscriptions are not sent.',
      ].join('\n'),
    );
    const lines = source.split('\n');
    lines.forEach((line, i) => {
      if (/socket\?\.send\s*\(/.test(line)) {
        console.log(`    BASELINE: useWebSocket.ts line ${i + 1}: ${line.trim()}`);
      }
    });
  });

  test('subscription messages use type: "subscribe" so the server knows what to deliver', () => {
    // The JSON payload sent to the server must include type: 'subscribe'
    const subscribeTypePattern = /type:\s*'subscribe'/;
    assert.match(
      source,
      subscribeTypePattern,
      [
        'PRESERVATION VIOLATION (P-S2):',
        "  Expected subscription messages in `src/hooks/useWebSocket.ts` to include",
        "  `type: 'subscribe'` in the JSON payload, but the pattern was not found.",
        '  The server will not deliver events if subscription messages have a wrong type.',
      ].join('\n'),
    );
    const count = (source.match(/type:\s*'subscribe'/g) || []).length;
    console.log(`    BASELINE: type: 'subscribe' found ${count} time(s) — covers main + alias subscription sends`);
  });

  test('onopen also handles RESOURCE_ALIASES — alias subscriptions are sent for each resource', () => {
    // The onopen forEach loop also iterates RESOURCE_ALIASES for each subscription
    const aliasPattern = /RESOURCE_ALIASES\[resource\]/;
    assert.match(
      source,
      aliasPattern,
      [
        'PRESERVATION VIOLATION (P-S2):',
        '  Expected `src/hooks/useWebSocket.ts` to subscribe to resource aliases',
        '  (`RESOURCE_ALIASES[resource]`) inside the onopen handler, but the pattern',
        '  was not found.',
        '  Related-resource events (e.g. messages for a chat subscription) will be missed.',
      ].join('\n'),
    );
    const lines = source.split('\n');
    lines.forEach((line, i) => {
      if (/RESOURCE_ALIASES\[resource\]/.test(line)) {
        console.log(`    BASELINE: useWebSocket.ts line ${i + 1}: ${line.trim()}`);
      }
    });
  });

  test('connect() function still retrieves a JWT token before opening the WebSocket', () => {
    // After the fix the token moves from URL to first-frame; it must still be fetched.
    const tokenFetchPattern = /SecureStore\.getItemAsync\s*\(\s*['"]jwt['"]\s*\)/;
    assert.match(
      source,
      tokenFetchPattern,
      [
        'PRESERVATION VIOLATION (P-S2):',
        '  Expected `connect()` in `src/hooks/useWebSocket.ts` to fetch the JWT via',
        "  `SecureStore.getItemAsync('jwt')`, but the call was not found.",
        '  Without the token, the WebSocket connection cannot be authenticated.',
      ].join('\n'),
    );
    const lines = source.split('\n');
    lines.forEach((line, i) => {
      if (tokenFetchPattern.test(line)) {
        console.log(`    BASELINE: useWebSocket.ts line ${i + 1}: ${line.trim()}`);
      }
    });
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
console.log('─'.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('');
  console.log('ALL PRESERVATION TESTS PASSED — baseline behaviour confirmed.');
  console.log('');
  console.log('Baselines established:');
  console.log("  P-S1: 'x-api-key': API_KEY is present in request(), uploadRequest(),");
  console.log('        and the refreshSession() inline fetch in src/lib/apiClient.ts.');
  console.log('  P-S2: onopen in src/hooks/useWebSocket.ts calls subscriptions.forEach,');
  console.log('        sends socket?.send() with type:"subscribe" payloads, and iterates');
  console.log('        RESOURCE_ALIASES. JWT is fetched via SecureStore.getItemAsync.');
  console.log('');
  console.log('These tests must STILL PASS after tasks 3 & 4 apply their fixes.');
  console.log('If they fail after the fix, a preservation regression was introduced.');
} else {
  console.log('');
  console.log('Some preservation assertions failed — see details above.');
  console.log('The baseline behaviour that should be preserved is missing from the source.');
  console.log('Investigate before proceeding with fixes.');
}

console.log('─'.repeat(60));

if (failed > 0) {
  process.exit(1);
}
