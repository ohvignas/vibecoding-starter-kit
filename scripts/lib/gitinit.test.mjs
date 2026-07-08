import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initProjectGit } from './gitinit.mjs';

test('initProjectGit : séquence complète quand pas de dépôt', () => {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, ...args]);
    if (args.includes('rev-parse')) throw new Error('pas un dépôt');
  };
  const res = initProjectGit({ projectDir: '/p', run });
  assert.deepEqual(calls, [
    ['git', '-C', '/p', 'rev-parse', '--is-inside-work-tree'],
    ['git', '-C', '/p', 'init', '-b', 'main'],
    ['git', '-C', '/p', 'config', 'core.hooksPath', '.githooks'],
    ['git', '-C', '/p', 'add', '-A'],
    ['git', '-C', '/p', 'commit', '--no-verify', '-m', 'chore: environnement vibecoding initial'],
  ]);
  assert.equal(res.done.length, 1);
  assert.deepEqual(res.failed, []);
});

test('initProjectGit : dépôt déjà présent → ne touche à rien', () => {
  const calls = [];
  const run = (cmd, args) => { calls.push([cmd, ...args]); }; // rev-parse réussit
  const res = initProjectGit({ projectDir: '/p', run });
  assert.equal(calls.length, 1);
  assert.deepEqual(res.done, []);
  assert.deepEqual(res.failed, []);
});

test('initProjectGit : échec git → failed[] en français, pas de throw', () => {
  const run = (cmd, args) => {
    if (args.includes('rev-parse')) throw new Error('pas un dépôt');
    if (args.includes('commit')) throw new Error('empty ident name');
  };
  const res = initProjectGit({ projectDir: '/p', run });
  assert.deepEqual(res.done, []);
  assert.equal(res.failed.length, 1);
  assert.match(res.failed[0], /git config --global user\.name/);
});

test('initProjectGit : vrai git dans un tmpdir (intégration)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-gitinit-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'contenu de test');
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
  };
  const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe', env });
  const res = initProjectGit({ projectDir: dir, run });
  assert.deepEqual(res.failed, []);
  assert.ok(fs.existsSync(path.join(dir, '.git')), '.git créé');
  assert.equal(execFileSync('git', ['-C', dir, 'config', 'core.hooksPath'], { encoding: 'utf8' }).trim(), '.githooks');
  assert.match(execFileSync('git', ['-C', dir, 'log', '--oneline'], { encoding: 'utf8', env }), /environnement vibecoding initial/);
});
