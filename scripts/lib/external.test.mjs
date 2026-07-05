// scripts/lib/external.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectByTags, pickFromClone, installCaveman } from './external.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vs-ext-')); }

test('selectByTags filtre par sous-chaîne', () => {
  const d = tmp();
  for (const f of ['typescript.mdc', 'react.mdc', 'python.mdc']) fs.writeFileSync(path.join(d, f), '');
  assert.deepEqual(selectByTags(d, ['typescript', 'react']).sort(), ['react.mdc', 'typescript.mdc']);
});

test('pickFromClone signale une source manquante', () => {
  const clone = tmp(), proj = tmp();
  fs.writeFileSync(path.join(clone, 'CLAUDE.md'), 'k');
  const res = pickFromClone(clone, [{ src: 'CLAUDE.md', to: 'AGENTS-karpathy.md' }, { src: 'NOPE', to: 'x' }], proj);
  assert.equal(res[0].status, 'copied');
  assert.equal(res[1].status, 'missing-src');
});

test('installCaveman lance le script d\'install officiel', () => {
  const calls = [];
  installCaveman((cmd, args) => calls.push([cmd, args]));
  assert.equal(calls[0][0], 'bash');
  assert.match(calls[0][1][1], /caveman\/main\/install\.sh/);
});
