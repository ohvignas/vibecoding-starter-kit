import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectChecks, runChecks, resolveCheckCommand, CHECKS } from '../../templates/hooks/framework/checks.mjs';

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
  // `security` (npx @doyensec/electronegativity) a été retiré au Lot F : paquet npm figé au
  // 09/03/2023. `audit` (npm audit) le remplace au pre-push desktop.
  for (const id of ['typecheck', 'lint', 'lint-expo', 'deps-check', 'doctor', 'audit']) {
    assert.ok(CHECKS[id], `check ${id} défini`);
  }
  assert.equal(CHECKS.security, undefined, 'le check qui appelait un paquet abandonné ne doit pas revenir');
});

// E7 — Windows. Tous les checks passent par `npx`, qui n'est pas un exécutable mais un script
// `npx.cmd`. Depuis Node 20.12 (correctif CVE-2024-27980), le lancer sans `shell: true` échoue
// (ENOENT/EINVAL) : le hook affichait « problème détecté » alors que RIEN n'avait tourné.
// Le kit sait déjà le faire côté installeur (`buildRunCommand`, external.mjs) — le hook copié
// dans le projet, lui, ne le savait pas.
test('E7 — sur Windows, npx passe par npx.cmd + shell: true', () => {
  assert.deepEqual(resolveCheckCommand(['npx', 'tsc', '--noEmit'], 'win32'), { file: 'npx.cmd', args: ['tsc', '--noEmit'], options: { shell: true } });
  assert.deepEqual(resolveCheckCommand(['npx', 'tsc', '--noEmit'], 'darwin'), { file: 'npx', args: ['tsc', '--noEmit'], options: {} });
  assert.deepEqual(resolveCheckCommand(['npx', 'biome', 'check', '.'], 'linux'), { file: 'npx', args: ['biome', 'check', '.'], options: {} });
});

// « L'outil n'a pas pu démarrer » et « l'outil a trouvé un problème » sont deux choses
// différentes. spawnSync met `status: null` + `error` quand le processus n'a jamais démarré :
// `r.status !== 0` était donc vrai, et le hook accusait le code de l'utilisateur.
test('E7 — outil impossible à lancer : le hook dit qu\'il n\'a pas tourné, pas qu\'il a trouvé un bug', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  const lignes = [];
  const spawn = () => ({ status: null, error: Object.assign(new Error('spawn npx ENOENT'), { code: 'ENOENT' }) });
  const code = runChecks(['typecheck'], { cwd: d, spawn, log: (l) => lignes.push(l) });
  assert.equal(code, 0, 'le runner reste non bloquant');
  const txt = lignes.join('\n');
  assert.doesNotMatch(txt, /problème détecté/, 'ne pas accuser le code quand rien n\'a tourné');
  assert.match(txt, /n'a pas pu être lanc/i);
  assert.match(txt, /ENOENT|npx/, 'et dire pourquoi');
});

// 127 = « command not found », rendu par le shell et propagé par `npm run`. Mesuré : un script
// `"lint": "biome check ."` dans un projet sans biome sort 127. Le hook l'a longtemps compté comme
// « problème détecté » — il accusait le code de l'élève d'un défaut d'installation.
test('E7 — 127 (binaire absent) : le hook dit qu\'il n\'a pas pu lancer, pas qu\'il a trouvé un bug', () => {
  const lignes = [];
  const d = tmp();
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  runChecks(['typecheck'], { cwd: d, log: (m) => lignes.push(m), spawn: () => ({ status: 127 }) });
  const l = lignes.join('\n');
  assert.match(l, /n'a pas pu être lancé/, '127 = la commande n\'existe pas : rien n\'a été vérifié');
  assert.match(l, /introuvable|pas installé/, 'et il faut DIRE que c\'est une install manquante');
  assert.doesNotMatch(l, /problème détecté/, 'un binaire absent n\'est pas un défaut du code');
});

// `needs` est le prérequis du REPLI. Un script déclaré le remplace, donc s'en passe : gater le
// check sur le fichier de config d'un outil que le projet n'utilise pas saute un contrôle qui
// existe (mesuré sur un scaffold vitrine : les deux templates posent `lint`, eslint installé).
test('E7 — `needs` ne gate que le repli : un script déclaré fait tourner le check sans lui', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { lint: 'eslint .' } }));
  const [avec] = selectChecks(['lint'], { cwd: d });
  assert.equal(avec.willRun, true, 'le projet déclare `lint` : il n\'a pas besoin du biome.json du repli');
  assert.equal(avec.via, 'script');
  // …et sans script NI fichier `needs`, on saute — sinon on aurait remplacé un gate trop strict
  // par aucun gate du tout, et le repli partirait sur un outil absent.
  const nu = tmp();
  fs.writeFileSync(path.join(nu, 'package.json'), JSON.stringify({ scripts: {} }));
  const [sans] = selectChecks(['lint'], { cwd: nu });
  assert.equal(sans.willRun, false);
  assert.match(sans.reason, /biome\.json/);
});

test('E7 — outil lancé qui sort en erreur : là, oui, « problème détecté »', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  const lignes = [];
  runChecks(['typecheck'], { cwd: d, spawn: () => ({ status: 1 }), log: (l) => lignes.push(l) });
  assert.match(lignes.join('\n'), /problème détecté/);
});
