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

// E3 — un dépôt déjà là (l'utilisateur a fait `git init` avant, ou scaffolde dans un dépôt
// existant) : le kit copiait `.githooks/pre-commit` et l'affichait ✅ dans son rapport, mais ne
// posait JAMAIS `core.hooksPath`. Git ne regarde pas `.githooks/` tout seul : le scan de secrets
// ne tournait donc jamais, et rien ne le disait. Ou on le pose, ou on dit la vérité.
const fakeGit = ({ toplevel = '/p', hooksPath = null, projectDir = '/p' } = {}) => {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, ...args]);
    if (args.includes('--show-toplevel')) return Buffer.from(`${toplevel}\n`);
    if (args.includes('core.hooksPath') && args.includes('--get')) {
      if (hooksPath === null) throw new Error('exit 1'); // git config --get : code 1 quand la clé est absente
      return Buffer.from(`${hooksPath}\n`);
    }
    return Buffer.from('');
  };
  return { calls, res: initProjectGit({ projectDir, run }) };
};

test('E3 — dépôt existant sans core.hooksPath : le kit le pose (les hooks tournent vraiment)', () => {
  const { calls, res } = fakeGit();
  assert.ok(
    calls.some((c) => c.join(' ') === 'git -C /p config core.hooksPath .githooks'),
    `core.hooksPath jamais posé — appels : ${JSON.stringify(calls)}`,
  );
  assert.deepEqual(res.failed, []);
  assert.equal(res.done.length, 1);
  assert.match(res.done[0], /hooks/i);
});

test('E3 — core.hooksPath déjà réglé ailleurs : on n\'écrase pas, on le dit', () => {
  const { calls, res } = fakeGit({ hooksPath: '.husky' });
  assert.equal(calls.some((c) => c.includes('core.hooksPath') && c.includes('.githooks')), false, 'la config de l\'utilisateur est à lui');
  assert.deepEqual(res.done, []);
  assert.deepEqual(res.failed, [], 'ce n\'est pas un échec du scaffold → jamais exit 1');
  assert.equal(res.skipped.length, 1);
  assert.match(res.skipped[0].reason, /\.husky/);
  assert.match(res.skipped[0].reason, /git -C \/p config core\.hooksPath \.githooks/, 'la commande exacte pour rattraper');
});

test('E3 — projet DANS un dépôt parent : on ne touche pas au dépôt du parent, on le dit', () => {
  const { calls, res } = fakeGit({ projectDir: '/p/apps/mon-app', toplevel: '/p' });
  assert.equal(calls.some((c) => c.includes('core.hooksPath') && c.includes('.githooks')), false);
  assert.deepEqual(res.done, []);
  assert.deepEqual(res.failed, []);
  assert.equal(res.skipped.length, 1);
  assert.match(res.skipped[0].reason, /\/p\b/, 'le dépôt parent est nommé');
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

test('E3 — vrai git : dépôt créé À LA MAIN avant le scaffold → hooksPath posé (intégration)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-gitexist-'));
  const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe' });
  run('git', ['-C', dir, 'init', '-b', 'main']);
  assert.throws(() => run('git', ['-C', dir, 'config', '--get', 'core.hooksPath']), 'postulat : hooksPath absent');
  const res = initProjectGit({ projectDir: dir, run });
  assert.deepEqual(res.failed, []);
  assert.equal(execFileSync('git', ['-C', dir, 'config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).trim(), '.githooks');
  fs.rmSync(dir, { recursive: true, force: true });
});
