// Le compteur de rouges est du code du kit : il est gardé comme le reste. Sans ces tests, la
// liste `ROUGES_ATTENDUS` serait une décoration — et c'est précisément ce qu'on lui reproche
// quand elle grandit au lieu de rétrécir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROUGES_ATTENDUS, relire, rougesDuTap, verdict } from './rouges-attendus.mjs';

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

// ── L'INSTRUMENT SAIT-IL DIRE QU'IL EST EN PANNE ? ────────────────────────────────────────────
// C'est LA question, parce que ce lanceur pilote neuf tâches encore. La version naïve ne
// distinguait pas « rien n'a échoué » de « je n'ai rien lu » : sous un rapporteur non-TAP elle
// trouvait zéro `not ok` et annonçait que les 4 rouges attendus avaient DISPARU — quatre
// corrections imaginaires, nommées, avec les tâches à aller retirer de la liste.
const TAP_NOMINAL = ['ok 1 - vert', 'not ok 2 - A', '1..2', '# tests 2', '# pass 1', '# fail 1'].join('\n');

test('ROUGES — sortie non-TAP : le lanceur dit qu\'il n\'a pas su lire, il n\'invente pas de disparitions', () => {
  // Ce que `--test-reporter=spec` produit : des ▶/✔/✖, aucune ligne `ok`/`not ok`.
  const spec = ['▶ cablage', '  ✔ un test (2ms)', '  ✖ un autre (1ms)', '▶ fin'].join('\n');
  const { illisible, rouges } = relire(spec);
  assert.equal(rouges.length, 0, 'montage : le parseur TAP ne trouve effectivement rien');
  assert.match(illisible, /aucune ligne de résultat TAP/);
  const v = verdict(rouges, ROUGES_ATTENDUS, { illisible });
  assert.deepEqual(v.disparus, [], 'AUCUNE disparition annoncée : c\'est la lecture qui a échoué, pas les tests qui ont été corrigés');
  assert.deepEqual(v.inattendus, []);
  assert.equal(v.ok, false, 'un verdict qu\'on ne peut pas rendre est un échec, pas un succès');
});

test('ROUGES — sortie tronquée ou résumé incohérent : refus de conclure aussi', () => {
  // Des `ok` mais pas de résumé : flux coupé.
  assert.match(relire('ok 1 - vert\nok 2 - vert').illisible, /aucun résumé/);
  // Le résumé annonce des échecs, aucun nom lu : notre lecture est fausse — la seule sous-lecture
  // qui fabrique de fausses bonnes nouvelles.
  assert.match(relire('ok 1 - vert\n# fail 3').illisible, /annonce 3 échec/);
  // Le sens inverse (plus de noms que d'échecs annoncés) ne bloque pas : il ne peut produire qu'un
  // « rouge inattendu » de trop, qui se relit — alors qu'un refus de conclure arrête tout.
  assert.equal(relire(TAP_NOMINAL).illisible, null);
});

// Un drapeau qui ne restreint rien ne doit pas désarmer le contrôle ; un drapeau qui FILTRE, si.
test('ROUGES — le lanceur distingue un drapeau inoffensif d\'un filtre de périmètre', () => {
  const src = fs.readFileSync(path.join(RACINE, 'scripts/rouges-attendus.mjs'), 'utf8');
  assert.match(src, /--test-name-pattern/, 'un filtre de tests restreint le périmètre : il rend le run partiel');
  assert.doesNotMatch(src, /const partiel = args\.length > 0/, '« un argument quelconque » désarmait le contrôle dès qu\'on passait une option');
});

test('ROUGES — TAP nominal : rien ne change, le verdict est rendu', () => {
  const { rouges, verts, echecsAnnonces, illisible } = relire(TAP_NOMINAL);
  assert.deepEqual(rouges, ['A']);
  assert.equal(verts, 1);
  assert.equal(echecsAnnonces, 1);
  assert.equal(illisible, null);
  assert.equal(verdict(rouges, [{ nom: 'A', tache: 'tâche 3', quoi: '…' }], { illisible }).ok, true);
});

test('ROUGES — exactement les rouges attendus : verdict vert', () => {
  const attendus = [{ nom: 'A', tache: 't', quoi: '…' }, { nom: 'B', tache: 't', quoi: '…' }];
  assert.equal(verdict(['B', 'A'], attendus).ok, true, 'l\'ordre ne compte pas');
});

// Une entrée sans adresse est une exception qu'on ne saura pas refermer.
// ⚠️ CE TEST A EXIGÉ `ROUGES_ATTENDUS.length` — « liste vide = retire le garde ». C'était faux, et
// ça rendait INATTEIGNABLE le seul état que ce fichier dit vouloir : la liste doit RÉTRÉCIR,
// donc finir vide, et fermer le dernier rouge attendu faisait alors rougir le lanceur lui-même.
// Un lanceur à liste vide n'est pas muet, il est au plus strict : tout rouge devient une
// régression nommée, et le refus de conclure sur une sortie illisible ne dépend d'aucune liste.
// On garde donc la propriété qui compte (une entrée dit QUI la referme et QUOI corriger) et on
// exige, à sa place, que le verdict MORDE encore avec zéro entrée.
test('ROUGES — chaque rouge attendu porte sa tâche et le fichier à corriger', () => {
  assert.equal(verdict([], []).ok, true, 'liste vide + suite verte = le verdict passe');
  assert.equal(verdict(['un test quelconque'], []).ok, false, 'liste vide : tout rouge est une régression, et le lanceur doit le dire');
  assert.deepEqual(verdict(['un test quelconque'], []).inattendus, ['un test quelconque'], 'et il doit le NOMMER');
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
