import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cursorDeeplink } from './deeplink.mjs';

test('cursorDeeplink : base64 décodable et fidèle à la config', () => {
  const url = cursorDeeplink('convex', { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] });
  assert.match(url, /^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=convex&config=/);
  const b64 = url.split('config=')[1];
  const decoded = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  assert.deepEqual(decoded, { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] });
});

test('cursorDeeplink : ne fuite jamais les métas internes (needsAuth, apiKey)', () => {
  const url = cursorDeeplink('x', { type: 'http', url: 'https://x/mcp', needsAuth: true, apiKey: { env: 'K' } });
  const decoded = JSON.parse(Buffer.from(url.split('config=')[1], 'base64').toString('utf8'));
  assert.deepEqual(decoded, { type: 'http', url: 'https://x/mcp' });
});
