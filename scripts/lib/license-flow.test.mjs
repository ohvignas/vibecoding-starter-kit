import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url'; // PAS new URL(...).pathname (cassé sous Windows)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};
const run = (license) => execFileSync(
  process.execPath,
  ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'cursor',
   '--project', path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vs-lic-')), 'app'),
   '--no-skills', '--yes', '--license', license],
  { cwd: ROOT, encoding: 'utf8', env: GIT_ENV },
);

test('code valide → « Licence validée », exit 0', () => {
  const out = run('vibe-7k4q-9f2p-xr31'); // minuscules + tirets → doit matcher
  assert.match(out, /Licence validée/);
});

test('code faux → mention « mode doux », exit 0 (jamais bloquant)', () => {
  const out = run('MAUVAIS-CODE'); // n'throw pas = exit 0
  assert.match(out, /mode doux/i);
});
