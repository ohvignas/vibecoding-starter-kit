import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir, copyIfAbsent, copyDirIfAbsent } from './fsops.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vs-fsops-')); }

test('copyIfAbsent copie puis saute si présent', () => {
  const d = tmp();
  const src = path.join(d, 'a.txt'); fs.writeFileSync(src, 'x');
  const dest = path.join(d, 'out', 'a.txt');
  assert.equal(copyIfAbsent(src, dest).status, 'copied');
  assert.equal(fs.readFileSync(dest, 'utf8'), 'x');
  assert.equal(copyIfAbsent(src, dest).status, 'skipped-exists');
  assert.equal(copyIfAbsent(src, dest, { force: true }).status, 'copied');
});

test('copyDirIfAbsent recopie récursivement', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, 'src', 'sub'), { recursive: true });
  fs.writeFileSync(path.join(d, 'src', 'a.txt'), '1');
  fs.writeFileSync(path.join(d, 'src', 'sub', 'b.txt'), '2');
  const res = copyDirIfAbsent(path.join(d, 'src'), path.join(d, 'dst'));
  assert.equal(res.length, 2);
  assert.ok(fs.existsSync(path.join(d, 'dst', 'sub', 'b.txt')));
});
