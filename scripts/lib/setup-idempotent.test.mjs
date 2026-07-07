import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Régression : un 2e run de l'installeur (sans --force) ne doit PAS dupliquer
// la note « Backend en local » en tête de docs/RUN.md.
test('re-run sans --force : la note backend local reste unique', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-idem-'));
  const run = () => execFileSync(
    process.execPath,
    ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'claude-code', '--project', dir, '--backend', 'local'],
    { stdio: 'ignore' },
  );
  run();
  run();
  const content = fs.readFileSync(path.join(dir, 'docs/RUN.md'), 'utf8');
  const count = (content.match(/Backend en local/g) || []).length;
  assert.equal(count, 1, 'la note backend doit apparaître exactement une fois');
});
