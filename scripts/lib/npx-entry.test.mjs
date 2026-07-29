import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const setup = fileURLToPath(new URL('../setup.mjs', import.meta.url));
const update = fileURLToPath(new URL('../update.mjs', import.meta.url));
const buildPlugin = fileURLToPath(new URL('../build-cursor-plugin.mjs', import.meta.url));

// Chaque script exécutable du kit compare `import.meta.url` (le REALPATH du module) à
// `process.argv[1]` (ce que le shell a lancé). Quand les deux diffèrent — c'est le cas dès
// qu'un symlink est dans le chemin — le garde est faux et le `main()` du script ne tourne pas :
// exit 0, zéro sortie, zéro effet. Le seul recours de l'utilisateur est de deviner.
// `/tmp` est lui-même un symlink vers `/private/tmp` sur macOS, `npm link` en pose un, et
// `node_modules/.bin/` en pose un pour chaque bin : le cas n'a rien d'exotique.
const viaSymlink = (script, args, opts = {}) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-npx-'));
  try {
    const link = path.join(tmp, `lien-${path.basename(script)}`);
    fs.symlinkSync(script, link);
    let status = 0, stdout = '', stderr = '';
    try {
      stdout = execFileSync(process.execPath, [link, ...args], { encoding: 'utf8', stdio: 'pipe', ...opts });
    } catch (e) { status = e.status ?? 1; stdout = String(e.stdout ?? ''); stderr = String(e.stderr ?? ''); }
    return { status, stdout, stderr };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};
const SKIP_SYMLINK = process.platform === 'win32' && 'symlink privileges requis sur Windows';

// Régression : `npm create vibecoding-kit` / `npx` lancent le bin via un symlink
// node_modules/.bin/create-vibecoding-kit → process.argv[1] est le symlink, import.meta.url
// le realpath. Sans résolution de realpath, le garde d'entrée est faux → main() ne tourne
// jamais sous npx → scaffold no-op silencieux (exit 0, zéro fichier). Ce test le prouve.
// Windows : créer un symlink de fichier exige des droits admin/mode développeur → EPERM en CI.
// npm/npx utilise de toute façon un shim .cmd sur Windows, pas un symlink POSIX.
test('setup.mjs lancé via un symlink (comme npx) exécute bien main()', { skip: process.platform === 'win32' && 'symlink privileges requis sur Windows' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-npx-'));
  try {
    const link = path.join(tmp, 'create-vibecoding-kit');
    fs.symlinkSync(setup, link);
    // --dry-run : main() calcule et imprime le plan puis rend la main, sans rien écrire.
    const out = execFileSync(
      process.execPath,
      [link, 'demo', '--stack', 'saas', '--assistant', 'cursor', '--yes', '--dry-run'],
      { encoding: 'utf8' },
    );
    assert.match(out, /projectDir/, 'main() doit tourner via le symlink et émettre le plan --dry-run');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// E1 — le même garde, dans les deux autres scripts exécutables du kit. `setup.mjs` a été corrigé
// seul : `update.mjs` et `build-cursor-plugin.mjs` comparaient encore les chemins BRUTS.
test('update.mjs lancé via un symlink exécute bien son entrée CLI', { skip: SKIP_SYMLINK }, () => {
  const vide = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-noproj-'));
  try {
    // Dossier sans `.vibecoding.json` : l'entrée CLI doit ÉCHOUER en le disant (exit 1).
    // Garde faux → main jamais atteint → exit 0 muet, l'utilisateur croit sa mise à jour faite.
    const r = viaSymlink(update, ['--project', vide]);
    assert.equal(r.status, 1, `entrée CLI jamais atteinte (exit ${r.status}, stdout « ${r.stdout.trim()} »)`);
    assert.match(r.stderr, /vibecoding\.json/, 'et elle dit pourquoi elle échoue');
  } finally { fs.rmSync(vide, { recursive: true, force: true }); }
});

test('build-cursor-plugin.mjs lancé via un symlink assemble bien le plugin', { skip: SKIP_SYMLINK }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-plugin-out-'));
  try {
    const r = viaSymlink(buildPlugin, ['--out', out]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Plugin Cursor assemblé/, 'garde faux → aucune sortie, aucun fichier écrit');
    assert.ok(fs.existsSync(path.join(out, 'commands', 'build.md')), 'les commandes sont bien écrites');
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});
