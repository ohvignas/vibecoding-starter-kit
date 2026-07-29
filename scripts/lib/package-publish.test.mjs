import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('package.json est publiable en scaffolder npm', () => {
  assert.equal(pkg.name, 'create-vibecoding-kit');       // `npm create vibecoding-kit`
  assert.equal(pkg.private, undefined, 'pas de private:true (sinon npm publish refuse)');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.bin['create-vibecoding-kit'], 'scripts/setup.mjs');
  assert.ok(pkg.engines && pkg.engines.node, 'engines.node présent');
  // La whitelist embarque ce que setup lit au runtime, et RIEN de superflu.
  for (const d of ['scripts', 'templates', 'stacks', 'ai-context']) assert.ok(pkg.files.includes(d), `files doit inclure ${d}`);
  for (const d of ['docs', 'formateur', '.superpowers']) assert.ok(!pkg.files.includes(d), `files ne doit PAS inclure ${d}`);
});

test('version bumpée pour la release vitrine (≥ 0.4.0)', () => {
  const [maj, min] = pkg.version.split('.').map(Number);
  assert.ok(maj > 0 || min >= 4, `version ${pkg.version} attendue ≥ 0.4.0`);
});

test('le bin pointe un fichier réel avec shebang node', () => {
  const bin = fs.readFileSync(new URL('../../scripts/setup.mjs', import.meta.url), 'utf8');
  assert.match(bin.split('\n')[0], /^#!.*node/);
});

// E11 — LE test qui aurait attrapé la 0.6.0 publiée cassée. Tous les autres tests scaffoldent
// depuis le DÉPÔT, où tout existe : ils ne voient jamais qu'un fichier lu au runtime a été oublié
// dans `files[]`. Ici on reconstitue le paquet — uniquement ce que `files[]` embarque, rien
// d'autre — et on scaffolde depuis là, exactement comme `npm create vibecoding-kit` chez un
// utilisateur. Un fichier manquant sort en exit 1, avec son nom.
test('E11 — le paquet publié (files[] seul) scaffolde en exit 0 pour les 3 assistants', () => {
  const pkgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-pkg-'));
  // La reconstitution : rien que `files[]`. `package.json` est toujours embarqué par npm.
  for (const f of [...pkg.files, 'package.json']) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) { assert.fail(`files[] déclare « ${f} », absent du dépôt`); }
    fs.cpSync(src, path.join(pkgDir, f), { recursive: true });
  }
  // Preuve que la simulation est bien une AMPUTATION : ce qui n'est pas publié n'est pas là.
  for (const absent of ['docs', 'formateur', 'playbook', 'cursor-plugin']) {
    assert.equal(fs.existsSync(path.join(pkgDir, absent)), false, `${absent} n'est pas publié, il ne doit pas être dans la simulation`);
  }

  const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@t.local', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@t.local' };
  for (const [stack, assistant] of [['saas', 'cursor'], ['mobile', 'claude-code'], ['vitrine', 'codex']]) {
    const proj = fs.mkdtempSync(path.join(os.tmpdir(), `vs-inst-${assistant}-`));
    let code = 0, out = '';
    try {
      // `--source` non passé : le kit doit trouver sa racine tout seul, depuis le paquet.
      out = execFileSync(process.execPath, [path.join(pkgDir, 'scripts/setup.mjs'), '--stack', stack, '--assistant', assistant, '--project', proj, '--no-skills', '--yes'], { encoding: 'utf8', stdio: 'pipe', env });
    } catch (e) { code = e.status ?? 1; out = `${e.stdout ?? ''}${e.stderr ?? ''}`; }
    const echecs = out.split('\n').filter((l) => /^\s*(❌|Échec)/.test(l)).join(' | ');
    assert.equal(code, 0, `${stack}/${assistant} : exit ${code} depuis le paquet publié — ${echecs || out.slice(-500)}`);
    // Et le projet est réellement utilisable : les 3 fichiers dont tout le reste dépend.
    for (const f of ['AGENTS.md', 'docs/A-FAIRE.md', '.vibecoding.json']) {
      assert.ok(fs.existsSync(path.join(proj, f)), `${stack}/${assistant} : ${f} manquant`);
    }
    fs.rmSync(proj, { recursive: true, force: true });
  }
  fs.rmSync(pkgDir, { recursive: true, force: true });
});

// Régression du 27/07/2026 : ajouter `.claude` (au lieu de `.claude/skills`) à `files[]` a embarqué
// 226 fichiers de worktree — un paquet de 449 fichiers / 11 Mo au lieu de 223 / 5,4 Mo.
test('le paquet publié embarque les skills de stack, JAMAIS les worktrees', () => {
  // `--json` écrit la liste des fichiers sur stdout (le format lisible part sur stderr).
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const files = JSON.parse(out)[0].files.map((f) => f.path);
  assert.ok(files.some((f) => /^\.claude\/skills\/stack-saas\/SKILL\.md$/.test(f)), 'le skill de stack doit être publié (sinon exit 1 côté Claude Code)');
  assert.equal(files.some((f) => f.includes('worktrees')), false, 'aucun worktree dans le paquet');
  assert.ok(files.length < 300, `paquet anormalement gros : ${files.length} fichiers`);
});
