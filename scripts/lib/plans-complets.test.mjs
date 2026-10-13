// scripts/lib/plans-complets.test.mjs
// TOUS LES PLANS D'UN COUP, PUIS /build JUSQU'AU BOUT — ET CHAQUE PLAN FAIT SA RECHERCHE.
//
// Décision d'Antoine (2026-10-13). Deux propriétés, et elles se tiennent l'une l'autre :
//   1. la fin de la roadmap GÉNÈRE tous les plans (un par jalon, toute l'application), pas
//      seulement le premier — sinon `/build` redécouvrirait le plan au fur et à mesure ;
//   2. `/build` exécute les jalons JUSQU'AU BOUT sans repasser la main à chaque tour, et chaque
//      plan suit un protocole de recherche explicite : skills officiels + docs à jour + maquette.
//
// Le test verrouille la PROPRIÉTÉ : « tous les plans » et « chaque » jalon, la présence des trois
// sources de recherche (skills, docs à jour, maquette), et l'enchaînement côté `/build`. Il ne
// fige aucune phrase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cheminRunbook, cheminEtape } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('roadmap : génère TOUS les plans, un par jalon, et non le premier seulement', () => {
  const t = read(cheminEtape('new-project', '06-roadmap.md'));
  // Le sujet : tous les plans, d'un coup, pour chaque jalon.
  assert.match(t, /tous les plans/i, '06 : « tous les plans » doit être explicite');
  assert.match(t, /un par jalon/i, '06 : un plan PAR jalon (l\'unité de découpage)');
  assert.match(t, /chaque\*\*\s*jalon|chaque jalon/i, '06 : la génération doit boucler sur CHAQUE jalon');
  assert.match(t, /docs\/superpowers\/plans\//, '06 : l\'emplacement des plans doit être nommé');
  assert.match(t, /writing-plans/, '06 : la génération passe par le skill `writing-plans`');
  // Ne plus « proposer » de le faire plus tard : le faire maintenant.
  assert.doesNotMatch(t, /Propose ensuite de \*\*générer tous les plans\*\*/,
    '06 : la génération des plans n\'est plus une proposition remise à plus tard');
});

test('chaque plan suit le même protocole de recherche : skills + docs à jour + maquette', () => {
  const t = read(cheminEtape('new-project', '06-roadmap.md'));
  // 1. Les skills officiels de la stack (donc pas de code « de mémoire »).
  assert.match(t, /skills officiels de la stack/i, '06 : les skills officiels font partie du protocole');
  assert.ok(t.includes('convex-design') && t.includes('better-auth-best-practices'),
    '06 : les skills Convex ET Better Auth doivent être nommés dans le protocole');
  // 2. Les docs à jour.
  assert.match(t, /ai-context\//, '06 : `ai-context/` (docs officielles) fait partie du protocole');
  assert.match(t, /llms\.txt/i, '06 : les `llms.txt` doivent être lus');
  assert.match(t, /MCP/, '06 : le MCP de la stack doit être interrogé');
  assert.match(t, /aucune API inventée|jamais de mémoire|zéro API inventée/i,
    '06 : dire explicitement qu\'aucune API n\'est inventée');
  // 3. La maquette : le plan s'y réfère SI elle existe, sinon s'appuie sur `docs/design.md` seul.
  assert.match(t, /selon la maquette/i, '06 : la dépendance à la maquette doit être nommée');
  assert.match(t, /maquette\//, '06 : le dossier `maquette/` doit être cité');
  assert.match(t, /s'il n'y en a pas|sinon/i, '06 : prévoir le cas « pas de maquette »');
  assert.match(t, /docs\/design\.md/, '06 : le repli sans maquette passe par `docs/design.md`');
  // 4. Le plan est complet : TDD, données réelles, états, critère de fin.
  for (const [motif, quoi] of [
    [/TDD/i, 'les tâches sont TDD'],
    [/données réelles/i, 'les données sont réelles (Règle Réalité)'],
    [/chargement/i, 'les états (chargement/vide/erreur) sont prévus'],
    [/Ce que tu vois/, 'le `✅ Ce que tu vois` du jalon est le critère de fin'],
  ]) assert.match(t, motif, `06 : le plan complet doit dire — ${quoi}`);
});

test('build : enchaîne tous les jalons jusqu\'au bout, et le dit', () => {
  const t = read(cheminRunbook('build'));
  assert.match(t, /encha[în]/i, 'build : le verbe « enchaîner » doit être là');
  assert.match(t, /tous les jalons|jusqu'au bout/i, 'build : dire que TOUS les jalons sont enchaînés');
  assert.match(t, /--step/, 'build : `--step` documente l\'échappatoire (reprendre la main)');
  assert.match(t, /BLOQUÉ|blocage/i, 'build : dire sur quoi il s\'arrête (un vrai blocage)');
  // Le plan relu, pas refait : la génération vit dans `/new-project`, `/build` la consomme.
  assert.match(t, /06-roadmap\.md/, 'build : renvoyer à l\'étape qui génère les plans');
});

test('l\'entrée de /new-project annonce que l\'étape 06 livre les plans', () => {
  const entree = read(cheminRunbook('new-project'));
  const ligne = entree.split('\n').find((l) => l.includes('06-roadmap.md'));
  assert.ok(ligne, 'l\'entrée cite l\'étape 06');
  assert.match(ligne, /plans/i, 'l\'entrée doit annoncer que l\'étape 06 produit les plans');
});
