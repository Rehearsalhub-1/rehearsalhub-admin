/**
 * Bug Condition Exploration Tests — Security (S-1 & S-2)
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * IMPORTANT: These are SOURCE CODE inspection tests.
 * They are EXPECTED TO PASS — a passing test here means the bug EXISTS
 * in the unfixed source code. The tests confirm the bug conditions
 * identified in the bugfix spec before any fix is applied.
 *
 * S-1  isBugCondition_APIKey(X):
 *      X.source contains EXPO_PUBLIC_INTERNAL_API_KEY
 *      (Metro will inline the value into the production bundle)
 *
 * S-2  isBugCondition_WSToken(X):
 *      X.source contains "?token="
 *      (JWT is sent in the WebSocket URL, visible in server logs)
 *
 * These tests MUST PASS on unfixed code (confirming bugs exist).
 * After the fix is applied (tasks 3 & 4), these same tests must FAIL
 * to confirm the bug conditions are no longer present.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function readSource(relativePath: string): string {
  const absolute = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(absolute, 'utf8');
}

// ── S-1: isBugCondition_APIKey ────────────────────────────────────────────────
//
// Checks that EXPO_PUBLIC_INTERNAL_API_KEY is present in source files.
// Metro inlines every process.env.EXPO_PUBLIC_* variable at build time, so
// ANY occurrence of this identifier guarantees the literal key value will be
// compiled verbatim into the production JS bundle.
//
// BUG CONDITION (per spec):
//   X.bundle contains regex /EXPO_PUBLIC_INTERNAL_API_KEY.*=.*\S+/
//
// We inspect source directly because building the full bundle is slow; the
// source usage IS the root cause that creates the bundle exposure.

describe('S-1 — isBugCondition_APIKey: EXPO_PUBLIC_INTERNAL_API_KEY appears in source', () => {
  const BUG_PATTERN = /EXPO_PUBLIC_INTERNAL_API_KEY/;

  test('apiClient.ts reads EXPO_PUBLIC_INTERNAL_API_KEY (Metro will inline this into the bundle)', () => {
    const source = readSource('src/lib/apiClient.ts');
    const found = BUG_PATTERN.test(source);

    // Counterexample: the EXPO_PUBLIC_ prefixed variable appears on line:
    //   const API_KEY = process.env.EXPO_PUBLIC_INTERNAL_API_KEY ?? '';
    // Metro replaces this entire expression with the raw key string at build time.
    assert.strictEqual(
      found,
      true,
      [
        'COUNTEREXAMPLE (S-1 confirmed):',
        '  File: src/lib/apiClient.ts',
        '  Pattern: process.env.EXPO_PUBLIC_INTERNAL_API_KEY',
        '  Bug: Metro inlines the literal key value into the JS bundle at build time.',
        '  The key is trivially extractable from a released APK/IPA.',
        '  Fix: rename to process.env.INTERNAL_API_KEY (no EXPO_PUBLIC_ prefix).',
      ].join('\n'),
    );
  });

  test('services/api.ts reads EXPO_PUBLIC_INTERNAL_API_KEY in media upload headers (Metro will inline this too)', () => {
    const source = readSource('src/services/api.ts');
    const found = BUG_PATTERN.test(source);

    // Counterexample: the variable appears in the media.upload() function:
    //   ...(process.env.EXPO_PUBLIC_INTERNAL_API_KEY
    //     ? { 'x-api-key': process.env.EXPO_PUBLIC_INTERNAL_API_KEY }
    //     : {}),
    // Both references will be replaced with the raw key string by Metro.
    assert.strictEqual(
      found,
      true,
      [
        'COUNTEREXAMPLE (S-1 confirmed, second occurrence):',
        '  File: src/services/api.ts',
        '  Pattern: process.env.EXPO_PUBLIC_INTERNAL_API_KEY (in media.upload headers)',
        '  Bug: Same Metro inlining applies here.',
        '  Fix: rename to process.env.INTERNAL_API_KEY.',
      ].join('\n'),
    );
  });
});

// ── S-2: isBugCondition_WSToken ───────────────────────────────────────────────
//
// Checks that the WebSocket connect() function builds a URL containing ?token=
//
// BUG CONDITION (per spec):
//   X.url contains "?token="
//
// The JWT access token appears in plain text in:
//   - Server-side access logs
//   - Load-balancer / reverse-proxy logs
//   - HTTP/2 CONNECT proxy logs
//   - Any network capture or MITM proxy

describe('S-2 — isBugCondition_WSToken: ?token= appears in WebSocket URL construction', () => {
  const BUG_PATTERN = /\?token=/;

  test('useWebSocket.ts connect() builds WebSocket URL with ?token= query parameter (JWT exposed in URL)', () => {
    const source = readSource('src/hooks/useWebSocket.ts');
    const found = BUG_PATTERN.test(source);

    // Counterexample: connect() contains:
    //   socket = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);
    // The full JWT string becomes part of the WebSocket handshake GET request URL,
    // which is recorded verbatim in every server-side log.
    assert.strictEqual(
      found,
      true,
      [
        'COUNTEREXAMPLE (S-2 confirmed):',
        '  File: src/hooks/useWebSocket.ts',
        '  Pattern: `${WS_URL}/ws?token=${encodeURIComponent(token)}`',
        '  Bug: JWT appears verbatim in WebSocket upgrade URL.',
        '  The token is visible in server access logs, load-balancer logs,',
        '  and any network proxy capturing the CONNECT request.',
        '  Fix: use `${WS_URL}/ws` and send { type: "auth", token } as the',
        '  first WebSocket frame inside socket.onopen.',
      ].join('\n'),
    );
  });
});
