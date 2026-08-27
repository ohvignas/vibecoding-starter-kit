// Le compteur de rouges est du code du kit : il est gardé comme le reste. Sans ces tests, la
// liste `ROUGES_ATTENDUS` serait une décoration — et c'est précisément ce qu'on lui reproche
// quand elle grandit au lieu de rétrécir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROUGES_ATTENDUS, rougesDuTap, verdict } from './rouges-attendus.mjs';

const RACINE = path.resolve(import.meta.dirname, '..');
const TAP = [
  'ok 1 - un test vert',
  'not ok 2 - PREMIER ROUGE',
  '    not ok 1 - un sous-test, qui ne doit PAS être compté deux fois',
  'not ok 3 - SECOND ROUGE',
].join('\n');

test('ROUGES — seuls les `not ok` de premier niveau comptent (un sous-test doublerait l\'échec)', () => {
  assert.deepEqual(rougesDuTap(TAP), ['PREMIER ROUGE', 'SECOND ROUGE']);
});

test('ROUGES — un rouge INATTENDU est nommé', () => {
  const attendus = [{ nom: 'PREMIER ROUGE', tache: 'tâche X', quoi: '…' }];
  const v = verdict(['PREMIER ROUGE', 'RÉGRESSION SURPRISE'], attendus);
  assert.equal(v.ok, false);
  assert.deepEqual(v.inattendus, ['RÉGRESSION SURPRISE'], 'le 5ᵉ rouge doit sortir par son nom, pas par un décompte');
  assert.deepEqual(v.disparus, []);
});

test('ROUGES — un rouge attendu qui DISPARAÎT est signalé aussi : la liste doit rétrécir', () => {
  const attendus = [{ nom: 'PREMIER ROUGE', tache: 'tâche X', quoi: '…' }, { nom: 'SECOND ROUGE', tache: 'tâche Y', quoi: '…' }];
  const v = verdict(['PREMIER ROUGE'], attendus);
  assert.equal(v.ok, false);
  assert.deepEqual(v.disparus.map((r) => r.nom), ['SECOND ROUGE'], 'sans ce sens, la liste deviendrait un cimetière d\'exceptions périmées');
});

// Lancer un SOUS-ENSEMBLE de fichiers ne prouve rien sur les rouges des autres : sans cette
// distinction, tout run ciblé pendant le développement crierait « rouge attendu disparu » et on
// apprendrait à ignorer le verdict — la façon la plus sûre de le rendre inutile.
test('ROUGES — un run PARTIEL ne conclut rien sur les rouges absents, mais voit les inattendus', () => {
  const attendus = [{ nom: 'A', tache: 'tâche 3', quoi: '…' }, { nom: 'B', tache: 'tâche 9', quoi: '…' }];
  const partiel = verdict(['A'], attendus, { partiel: true });
  assert.deepEqual(partiel.disparus, [], 'B n\'a simplement pas été lancé');
  assert.equal(partiel.ok, true);
  assert.deepEqual(verdict(['A', 'SURPRISE'], attendus, { partiel: true }).inattendus, ['SURPRISE'], 'un rouge inattendu reste inattendu, même en partiel');
  // …et en run COMPLET, le même relevé accuse bien B.
  assert.deepEqual(verdict(['A'], attendus).disparus.map((r) => r.nom), ['B']);
});

test('ROUGES — exactement les rouges attendus : verdict vert', () => {
  const attendus = [{ nom: 'A', tache: 't', quoi: '…' }, { nom: 'B', tache: 't', quoi: '…' }];
  assert.equal(verdict(['B', 'A'], attendus).ok, true, 'l\'ordre ne compte pas');
});

// Une entrée sans adresse est une exception qu'on ne saura pas refermer.
test('ROUGES — chaque rouge attendu porte sa tâche et le fichier à corriger', () => {
  assert.ok(ROUGES_ATTENDUS.length, 'liste vide = plus rien à épingler : retire le garde, ne le laisse pas mentir');
  for (const r of ROUGES_ATTENDUS) {
    assert.match(r.tache, /tâche \d+/, `${r.nom} : sans tâche, personne ne sait qui doit le refermer`);
    assert.ok(r.quoi && r.quoi.length > 20, `${r.nom} : dire QUOI corriger, pas seulement que c'est rouge`);
  }
});

// Le lanceur doit être CELUI QUE TOUT LE MONDE UTILISE : si la CI appelle `node --test` en direct,
// le verdict n'est jamais rendu et la liste ne sert à rien.
test('ROUGES — `npm test` et la CI passent par le lanceur, pas par `node --test` nu', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(RACINE, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.test, /rouges-attendus\.mjs/, 'le script `test` doit rendre le verdict');
  const ci = fs.readFileSync(path.join(RACINE, '.github/workflows/ci.yml'), 'utf8');
  assert.doesNotMatch(ci, /^\s*- run: node --test\s*$/m, 'la CI contournerait le verdict');
  assert.match(ci, /- run: node --run test/, 'la CI doit passer par le script `test`');
});
