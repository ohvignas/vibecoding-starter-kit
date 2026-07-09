import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NODE = process.execPath;
// fileURLToPath (pas new URL(...).pathname) : sur Windows .pathname renvoie /D:/… → cwd cassé.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};

test('COLLE-MOI-DANS-L-IA.md est écrit à la racine du projet généré', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-colle-'));
  const proj = path.join(dir, 'app');
  execFileSync(NODE, ['scripts/setup.mjs', '--stack', 'saas', '--assistant', 'cursor', '--project', proj, '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
  const f = path.join(proj, 'COLLE-MOI-DANS-L-IA.md');
  assert.ok(fs.existsSync(f), 'fichier présent');
  assert.match(fs.readFileSync(f, 'utf8'), /\/new-project/);
  fs.rmSync(dir, { recursive: true, force: true });
});
