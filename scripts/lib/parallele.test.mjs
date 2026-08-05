// scripts/lib/parallele.test.mjs
// DEUX CHANTIERS EN MÊME TEMPS NE DOIVENT PAS SE MARCHER DESSUS.
//
// Défaut vécu, rapporté le 2026-08-05 : l'utilisateur ouvre un chat par feature et récolte des
// conflits git à répétition plus des collisions de serveur (`npx convex dev` lancé deux fois sur
// le même port). Il a dû écrire à la main le « prompt type » que le kit aurait dû porter.
//
// La cause n'était PAS où on la cherchait. `/new-feature` avait déjà worktree + branche `feat/` +
// PR + squash. C'est `/build` — le parcours que le README pousse en principal — qui faisait
// `git push -u origin main --follow-tags` : push direct, branche en dur, aucune synchronisation.
// Deux chats en `/build` = deux pushes concurrents sur la même branche.
//
// Trois propriétés, une par famille de faute :
//   1. on regarde avant de pousser, et on pousse là où on est ;
//   2. la base d'une feature et la cible de sa PR sont la MÊME branche, dérivée ;
//   3. un seul serveur de dev, quel que soit le nombre de chantiers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. `/build` — LE COUPABLE MESURÉ.
test('/build — le push regarde avant de sauter, et ne vise aucune branche écrite d\'avance', () => {
  const t = read('templates/commands/build.md');
  const push = t.split('\n').find((l) => /git push -u origin/.test(l));
  assert.ok(push, 'montage : /build ne pousse plus du tout, ce contrôle ne juge plus rien');

  // La branche en dur : un projet qui travaille ailleurs verrait son jalon poussé sur `main`.
  assert.doesNotMatch(push, /push -u origin (main|master)\b/,
    'branche écrite en dur : le kit décide à la place de l\'utilisateur où atterrit son travail');

  // L'ORDRE compte : un fetch après le push ne sert à rien. Sans fetch, `git status` affiche
  // « ## main...origin/main » et l'agent SE CROIT à jour — mesuré.
  const iFetch = t.search(/git fetch/);
  const iPush = t.search(/git push/);
  assert.ok(iFetch !== -1, 'rien ne synchronise avant le push : deux chantiers poussent en concurrence');
  assert.ok(iFetch < iPush, 'la synchro doit précéder le push, sinon elle ne sert à rien');

  // Et quand la course est perdue quand même : la fenêtre entre `fetch` et `push` reste ouverte.
  // Un débutant doit lire le message que git lui rendra, pas le découvrir.
  assert.match(t, /Updates were rejected/, 'le message de push refusé n\'est pas annoncé (même exigence que D7bis)');
  assert.match(t, /pull --rebase/, 'on dit d\'intégrer sans dire avec quelle commande');
});

// 2. LA BASE ET LA CIBLE — dérivées ensemble ou pas du tout.
// C'est l'erreur qui a tué la v1 du plan : dériver la base en gardant `--base main` en dur revient
// à brancher depuis sa base pour ouvrir la PR ailleurs. Pire que de ne rien dériver.
test('/new-feature — la base est synchronisée AVANT le worktree', () => {
  const t = read('templates/commands/new-feature/00-preflight.md');
  const iSync = t.search(/git fetch/);
  const iWorktree = t.search(/worktree/);
  assert.ok(iSync !== -1, 'le préflight ne synchronise pas : deux features partent de deux bases différentes');
  assert.ok(iWorktree !== -1, 'montage : le préflight ne parle plus de worktree');
  assert.ok(iSync < iWorktree, 'la synchro doit précéder la création du worktree');
});

test('/new-feature — la base et la cible de la PR sont la même branche, dérivée', () => {
  const pre = read('templates/commands/new-feature/00-preflight.md');
  const liv = read('templates/commands/new-feature/04-livraison.md');
  // `rev-parse --abbrev-ref HEAD` et pas `symbolic-ref refs/remotes/origin/HEAD` : mesuré, le
  // second rend exit 128 sur un projet né du scaffold tant qu'aucun `fetch` n'a eu lieu, et il
  // rendrait de toute façon la branche PAR DÉFAUT, pas celle où l'utilisateur travaille.
  assert.match(pre, /rev-parse --abbrev-ref HEAD/, 'la base doit se lire dans le dépôt, pas être nommée');
  assert.doesNotMatch(liv, /--base (main|master)\b/, 'cible en dur : on branche depuis une base et on ouvre la PR ailleurs');
  assert.match(liv, /--base/, 'montage : la PR ne cible plus rien du tout');
});

// 3. UN SEUL SERVEUR. `3210`, « port occupé », « déjà en cours » : 0 occurrence dans tout le dépôt
// avant ce chantier. La consigne vit dans `docs/RUN.md` — dont c'est la raison d'être — et pas dans
// `AGENTS.md`, qui n'a que 7 mots de marge sous son plafond de 2200.
const STACKS = ['saas', 'mobile', 'desktop', 'vitrine'];
const SECTION = /## Un seul serveur[\s\S]*/;

test('un seul serveur — les 4 RUN.md portent la règle, et elle n\'a pas divergé', () => {
  // On lit les fichiers AU DISQUE. `renderRunDoc` exige un `template` et rend `undefined` sans lui :
  // un test qui l'appelle mal rougirait en accusant un fichier pourtant correct.
  const sections = STACKS.map((s) => {
    const m = read(`templates/run/${s}.md`).match(SECTION);
    assert.ok(m, `${s} : rien ne dit quoi faire si un serveur tourne déjà`);
    return m[0];
  });
  // `run-doc.mjs` n'a pas de tronc commun (16 lignes, il préfixe deux notes au template reçu) :
  // ce sont 4 copies. On ne peut pas les fusionner, on peut exiger qu'elles ne DÉRIVENT pas.
  // La partie propre à la stack (où regarder) tient sur SA PROPRE LIGNE, la 3ᵉ du bloc — c'est ce
  // qui rend la comparaison possible. Une version antérieure la collait à la fin du paragraphe
  // générique : les 4 sections étaient alors 4 variantes, et le test accusait une divergence qui
  // n'existait pas. Le découpage en lignes n'est pas cosmétique, il est ce qui rend ce test vrai.
  const generique = (x) => x.split('\n').filter((_, i) => i !== 4).join('\n');
  const distincts = new Set(sections.map(generique));
  assert.equal(distincts.size, 1, `les 4 copies de la règle ont divergé (${distincts.size} variantes)`);
});

test('un seul serveur — la règle dit de PARTAGER, pas seulement de ne pas relancer', () => {
  for (const s of STACKS) {
    const section = read(`templates/run/${s}.md`).match(SECTION)[0];
    assert.match(section, /n'en lance pas un second/i, `${s} : rien n'interdit le second serveur`);
    assert.match(section, /partage|sers-toi de celui qui tourne/i, `${s} : on interdit sans dire quoi faire à la place`);
  }
});

// 4. LES DEUX BOUCLES. Une consigne posée dans `/new-feature` seul ne serait jamais lue par le
// second chat, qui fait `/build`. C'est précisément le chat qui casse.
test('deux chantiers de front — /build ET /new-feature portent la consigne', () => {
  for (const f of ['templates/commands/build.md', 'templates/commands/new-feature.md']) {
    const t = read(f);
    assert.match(t, /un seul serveur/i, `${f} : rien sur le serveur partagé`);
    assert.match(t, /sch[ée]ma/i, `${f} : rien sur le changement de schéma, la faute la plus coûteuse à deux`);
    assert.match(t, /RUN\.md/, `${f} : ne renvoie pas au fichier qui porte la règle`);
  }
});
