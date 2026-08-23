import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initProjectGit, hooksMaison } from './gitinit.mjs';

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

// ── E4 — `core.hooksPath` NE S'AJOUTE PAS À `.git/hooks/` : IL LE REMPLACE ─────────────────────
//
// ⛔ La faute mesurée. `gitinit.mjs` posait la clé sur tout dépôt existant, sans rien demander.
// Sur un projet qui avait son propre `.git/hooks/pre-commit` (script maison, lefthook, un husky
// installé autrement), ce hook cessait de tourner — sans qu'un seul fichier bouge, donc sans que
// rien ne se voie. Mesuré de bout en bout : un `pre-commit` qui affichait « mon hook maison »
// n'apparaissait plus dans la sortie du commit d'après.
// Ce n'est pas « écraser un fichier » (le kit ne fait jamais ça) : c'est plus discret, et donc pire.
const depotAvecHooks = (hooks) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-hooks-'));
  execFileSync('git', ['-C', dir, 'init', '-q', '-b', 'main'], { stdio: 'pipe' });
  for (const [nom, corps] of Object.entries(hooks)) {
    const p = path.join(dir, '.git/hooks', nom);
    fs.writeFileSync(p, corps);
    fs.chmodSync(p, 0o755);
  }
  return dir;
};
const hooksPathDe = (dir) => {
  try { return execFileSync('git', ['-C', dir, 'config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).trim(); }
  catch { return null; }
};

test('E4 — un dépôt tout neuf n\'a que des *.sample : rien à protéger, la clé se pose (parcours neuf)', () => {
  const dir = depotAvecHooks({});
  assert.deepEqual(hooksMaison(dir), [], 'les *.sample ne s\'exécutent pas : ils ne comptent pas');
  const res = initProjectGit({ projectDir: dir, run: (c, a) => execFileSync(c, a, { stdio: 'pipe' }) });
  assert.equal(hooksPathDe(dir), '.githooks', 'sans rien à éteindre, le comportement d\'avant est intact');
  assert.deepEqual(res.skipped, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E4 — des hooks maison : la clé N\'EST PAS posée, et le « Sauté » les NOMME', () => {
  const dir = depotAvecHooks({ 'pre-commit': '#!/bin/sh\necho maison\n', 'pre-push': '#!/bin/sh\nexit 0\n' });
  assert.deepEqual(hooksMaison(dir), ['pre-commit', 'pre-push'], 'la sonde doit voir les deux');
  const res = initProjectGit({ projectDir: dir, run: (c, a) => execFileSync(c, a, { stdio: 'pipe' }) });
  assert.equal(hooksPathDe(dir), null, 'la config de l\'utilisateur est à lui : rien n\'est posé sans accord');
  assert.deepEqual(res.done, []);
  assert.deepEqual(res.failed, [], 'ce n\'est pas un échec du scaffold → jamais exit 1');
  assert.equal(res.skipped.length, 1);
  assert.match(res.skipped[0].reason, /pre-commit/, 'le hook qu\'on aurait éteint doit être nommé');
  assert.match(res.skipped[0].reason, /pre-push/);
  assert.match(res.skipped[0].reason, /git -C .* config core\.hooksPath \.githooks/, 'et la commande exacte pour rattraper');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E4 — accord donné : la clé se pose, même sur un dépôt qui avait ses hooks', () => {
  // Il a lu l'écran qui les nommait, et il a dit oui. Le kit ne repose pas la question à sa place.
  const dir = depotAvecHooks({ 'pre-commit': '#!/bin/sh\nexit 0\n' });
  const res = initProjectGit({ projectDir: dir, run: (c, a) => execFileSync(c, a, { stdio: 'pipe' }), accordHooks: true });
  assert.equal(hooksPathDe(dir), '.githooks', 'un oui explicite doit VRAIMENT poser la clé');
  assert.equal(res.done.length, 1);
  assert.deepEqual(res.skipped, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E4 — refus explicite : rien n\'est posé, une phrase le dit, l\'installation continue', () => {
  const dir = depotAvecHooks({});
  const res = initProjectGit({ projectDir: dir, run: (c, a) => execFileSync(c, a, { stdio: 'pipe' }), accordHooks: false });
  assert.equal(hooksPathDe(dir), null, 'un refus vaut même quand il n\'y avait rien à protéger');
  assert.deepEqual(res.failed, [], 'un refus n\'est pas un échec');
  assert.equal(res.skipped.length, 1);
  assert.match(res.skipped[0].reason, /scan de secrets/, 'ce qu\'on perd doit être dit');
  assert.match(res.skipped[0].reason, /core\.hooksPath \.githooks/, 'et comment changer d\'avis');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E4 — refus explicite sur un dossier SANS dépôt : le dépôt est créé, la clé non', () => {
  // L'autre branche. Refuser le scan puis se le voir poser par le chemin `git init` ferait de la
  // question un décor — le point de retour arrière, lui, reste dû.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-hooksinit-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'x');
  const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@t.fr', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@t.fr' };
  const res = initProjectGit({ projectDir: dir, run: (c, a) => execFileSync(c, a, { stdio: 'pipe', env }), accordHooks: false });
  assert.deepEqual(res.failed, []);
  assert.ok(fs.existsSync(path.join(dir, '.git')), 'le dépôt est créé : c\'est le point de retour arrière');
  assert.equal(hooksPathDe(dir), null, 'mais la clé refusée n\'est pas posée par la porte de derrière');
  assert.equal(res.skipped.length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E4 — bout en bout : le hook maison de l\'utilisateur TOURNE ENCORE après l\'installation', () => {
  // La preuve que rien d'autre ne donne : ce n'est pas « la clé est absente », c'est « son hook
  // s'exécute ». C'est exactement ce qui avait cessé d'être vrai, sans que rien ne le dise.
  const dir = depotAvecHooks({ 'pre-commit': '#!/bin/sh\necho "MON-HOOK-MAISON" >&2\nexit 0\n' });
  const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@t.fr', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@t.fr' };
  initProjectGit({ projectDir: dir, run: (c, a) => execFileSync(c, a, { stdio: 'pipe' }) });
  fs.writeFileSync(path.join(dir, 'a.txt'), 'x');
  execFileSync('git', ['-C', dir, 'add', '-A'], { stdio: 'pipe', env });
  let sortie = '';
  try { execFileSync('git', ['-C', dir, 'commit', '-m', 'test'], { stdio: 'pipe', env }); }
  catch (e) { sortie += String(e.stderr ?? ''); }
  const tout = sortie + String(execFileSync('git', ['-C', dir, 'log', '--format=%s'], { encoding: 'utf8', env }));
  assert.match(tout, /MON-HOOK-MAISON|test/, 'le commit doit avoir eu lieu');
  // Le vrai point : git a bien exécuté SON hook, pas celui du kit (absent, donc silencieux).
  const relance = execFileSync('sh', ['-c', `cd ${dir} && echo y > b.txt && git add -A && git commit -m deux 2>&1 || true`], { encoding: 'utf8', env });
  assert.match(relance, /MON-HOOK-MAISON/, 'son pre-commit doit toujours s\'exécuter — c\'est ce que core.hooksPath éteignait');
  fs.rmSync(dir, { recursive: true, force: true });
});
