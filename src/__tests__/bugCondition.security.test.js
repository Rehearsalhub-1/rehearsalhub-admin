/**
 * Bug Condition Exploration Tests — Security (S-1 & S-2)
 *
 * Validates: Requirements 1.1, 1.2
 *
 * IMPORTANT: These are SOURCE CODE inspection tests.
 * A PASSING test here means the bug EXISTS in unfixed source code.
 * The tests confirm the bug conditions before any fix is applied.
 *
 * S-1  isBugCondition_APIKey(X):
 *      X.source contains EXPO_PUBLIC_INTERNAL_API_KEY
 *      Metro inlines every process.env.EXPO_PUBLIC_* value at build time,
 *      so any occurrence guarantees the key value is compiled into the bundle.
 *
 * S-2  isBugCondition_WSToken(X):
 *      X.source contains "?token="
 *      JWT is sent as a WebSocket URL query parameter, visible in server logs.
 *
 * Run: node src/__tests__/bugCondition.security.test.js
 *
 * Expected outcome on UNFIXED code: all assertions pass = bugs confirmed.
 * After fix (tasks 3 & 4): these assertions will FAIL = bugs resolved.
 */

'use strict';

const fs = require('fs');
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

// ── S-1: isBugCondition_APIKey ────────────────────────────────────────────────
//
// Checks EXPO_PUBLIC_INTERNAL_API_KEY is present in source files.
// Metro replaces these references with the literal env var value at build time.
//
// Bug condition (spec):
//   X.bundle contains regex /EXPO_PUBLIC_INTERNAL_API_KEY.*=.*\S+/

describe('S-1 — isBugCondition_APIKey: EXPO_PUBLIC_INTERNAL_API_KEY appears in source', () => {
  const BUG_PATTERN = /EXPO_PUBLIC_INTERNAL_API_KEY/;

  test('apiClient.ts reads EXPO_PUBLIC_INTERNAL_API_KEY (Metro will inline this into the bundle)', () => {
    const source = readSource('src/lib/apiClient.ts');
    const found = BUG_PATTERN.test(source);

    // Counterexample:
    //   const API_KEY = process.env.EXPO_PUBLIC_INTERNAL_API_KEY ?? '';
    // Metro replaces this with the raw key string in the production JS bundle.
    assert.equal(
      found,
      true,
      [
        'COUNTEREXAMPLE (S-1 NOT confirmed in apiClient.ts):',
        '  Expected EXPO_PUBLIC_INTERNAL_API_KEY to appear in src/lib/apiClient.ts',
        '  but it was not found — the bug may already be fixed or the file was moved.',
      ].join('\n'),
    );

    // Log the counterexample when the bug IS present
    if (found) {
      const lines = source.split('\n');
      lines.forEach((line, i) => {
        if (BUG_PATTERN.test(line)) {
          console.log(`    COUNTEREXAMPLE: src/lib/apiClient.ts line ${i + 1}: ${line.trim()}`);
        }
      });
      console.log('    BUG: Metro will inline the literal key value into the JS bundle.');
      console.log('    FIX: rename to process.env.INTERNAL_API_KEY (no EXPO_PUBLIC_ prefix).');
    }
  });

  test('services/api.ts reads EXPO_PUBLIC_INTERNAL_API_KEY in media upload headers (Metro inlines this too)', () => {
    const source = readSource('src/services/api.ts');
    const found = BUG_PATTERN.test(source);

    // Counterexample:
    //   ...(process.env.EXPO_PUBLIC_INTERNAL_API_KEY
    //     ? { 'x-api-key': process.env.EXPO_PUBLIC_INTERNAL_API_KEY }
    //     : {}),
    assert.equal(
      found,
      true,
      [
        'COUNTEREXAMPLE (S-1 NOT confirmed in services/api.ts):',
        '  Expected EXPO_PUBLIC_INTERNAL_API_KEY to appear in src/services/api.ts',
        '  but it was not found — the bug may already be fixed.',
      ].join('\n'),
    );

    if (found) {
      const lines = source.split('\n');
      lines.forEach((line, i) => {
        if (BUG_PATTERN.test(line)) {
          console.log(`    COUNTEREXAMPLE: src/services/api.ts line ${i + 1}: ${line.trim()}`);
        }
      });
      console.log('    BUG: Second Metro inlining site in media upload headers.');
      console.log('    FIX: rename to process.env.INTERNAL_API_KEY.');
    }
  });
});

// ── S-2: isBugCondition_WSToken ───────────────────────────────────────────────
//
// Checks the WebSocket connect() function builds a URL with ?token=
//
// Bug condition (spec):
//   X.url contains "?token="
//
// The JWT appears verbatim in:
//   - Server-side access logs
//   - Load-balancer / reverse-proxy logs
//   - Network captures / MITM proxies

describe('S-2 — isBugCondition_WSToken: ?token= appears in WebSocket URL construction', () => {
  const BUG_PATTERN = /\?token=/;

  test('useWebSocket.ts connect() builds WebSocket URL with ?token= query parameter (JWT exposed in URL)', () => {
    const source = readSource('src/hooks/useWebSocket.ts');
    const found = BUG_PATTERN.test(source);

    // Counterexample:
    //   socket = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);
    // The JWT string becomes part of the HTTP GET used for the WS upgrade,
    // which is logged verbatim in every server-side access log.
    assert.equal(
      found,
      true,
      [
        'COUNTEREXAMPLE (S-2 NOT confirmed):',
        '  Expected ?token= to appear in src/hooks/useWebSocket.ts',
        '  but it was not found — the bug may already be fixed.',
      ].join('\n'),
    );

    if (found) {
      const lines = source.split('\n');
      lines.forEach((line, i) => {
        if (BUG_PATTERN.test(line)) {
          console.log(`    COUNTEREXAMPLE: src/hooks/useWebSocket.ts line ${i + 1}: ${line.trim()}`);
        }
      });
      console.log('    BUG: JWT appears verbatim in WebSocket upgrade URL.');
      console.log('    The token is visible in server access logs, load-balancer logs,');
      console.log('    and any network proxy capturing the CONNECT request.');
      console.log('    FIX: use `${WS_URL}/ws` and send { type: "auth", token } as the');
      console.log('    first WebSocket frame inside socket.onopen.');
    }
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
console.log('─'.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('');
  console.log('ALL TESTS PASSED — Both bug conditions are CONFIRMED in unfixed code.');
  console.log('');
  console.log('Counterexamples:');
  console.log('  S-1: EXPO_PUBLIC_INTERNAL_API_KEY found in apiClient.ts and api.ts');
  console.log('       Metro will inline the literal key value into the JS bundle.');
  console.log('  S-2: ?token= found in useWebSocket.ts connect() function');
  console.log('       JWT is transmitted in the WebSocket URL query string.');
  console.log('');
  console.log('Next steps: implement fixes in tasks 3 (S-1) and 4 (S-2),');
  console.log('then re-run this test — it should FAIL to confirm bugs are resolved.');
} else {
  console.log('');
  console.log('Some assertions failed — see details above.');
  console.log('This may mean a fix was already applied or a file was moved.');
}

console.log('─'.repeat(60));

if (failed > 0) {
  process.exit(1);
}
