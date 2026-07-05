// scripts/lib/prereqs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNodeVersion, meetsNode, ensureGit } from './prereqs.mjs';

test('parseNodeVersion', () => {
  assert.deepEqual(parseNodeVersion('v20.12.1'), { major: 20, minor: 12 });
});
test('meetsNode applique le plancher 20.12', () => {
  assert.equal(meetsNode('v18.19.0'), false);
  assert.equal(meetsNode('v20.11.0'), false);
  assert.equal(meetsNode('v20.12.0'), true);
  assert.equal(meetsNode('v22.3.0'), true);
});
test('ensureGit renvoie false si git absent', () => {
  assert.equal(ensureGit(() => { throw new Error('no git'); }), false);
  assert.equal(ensureGit(() => 'git version 2.4'), true);
});
