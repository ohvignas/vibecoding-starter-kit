import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectChecks, CHECKS } from '../../templates/hooks/framework/checks.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'checks-')); }

test('id inconnu → willRun false, raison inconnu', () => {
  const [r] = selectChecks(['nope'], { cwd: tmp() });
  assert.equal(r.willRun, false);
  assert.equal(r.reason, 'inconnu');
});

test('typecheck sauté si pas de tsconfig.json', () => {
  const [r] = selectChecks(['typecheck'], { cwd: tmp() });
  assert.equal(r.willRun, false);
  assert.match(r.reason, /tsconfig\.json/);
});

test('typecheck sélectionné si tsconfig.json présent', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  const [r] = selectChecks(['typecheck'], { cwd: d });
  assert.equal(r.willRun, true);
  assert.deepEqual(r.cmd, ['npx', 'tsc', '--noEmit']);
});

test('le registre couvre les ids connus', () => {
  for (const id of ['typecheck', 'lint', 'lint-expo', 'deps-check', 'doctor', 'security']) {
    assert.ok(CHECKS[id], `check ${id} défini`);
  }
});
