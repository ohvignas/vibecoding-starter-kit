import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
