import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARK_START, MARK_END, wrapManaged, extractManaged, mergeManagedSection } from './managed-section.mjs';

test('wrapManaged entoure des marqueurs', () => {
  const w = wrapManaged('CORPS');
  assert.ok(w.startsWith(MARK_START));
  assert.ok(w.trimEnd().endsWith(MARK_END));
  assert.match(w, /CORPS/);
});

test('extractManaged récupère le bloc, null si absent', () => {
  assert.equal(extractManaged('rien'), null);
  const block = wrapManaged('X');
  assert.equal(extractManaged(`avant\n${block}\naprès`), block);
});

test('merge : marqueurs présents → remplace en place, zone utilisateur préservée', () => {
  const existing = `${wrapManaged('VIEUX')}\n\n## Mes règles\nGARDE-MOI`;
  const fresh = wrapManaged('NEUF');
  const out = mergeManagedSection(existing, fresh);
  assert.match(out, /NEUF/);
  assert.doesNotMatch(out, /VIEUX/);
  assert.match(out, /GARDE-MOI/);
});

test('merge : marqueurs absents → préfixe le bloc, ancien contenu conservé dessous', () => {
  const out = mergeManagedSection('ANCIEN SANS MARQUEURS', wrapManaged('NEUF'));
  assert.ok(out.indexOf('NEUF') < out.indexOf('ANCIEN SANS MARQUEURS'));
  assert.match(out, /ANCIEN SANS MARQUEURS/);
});

test('merge est idempotent (rejouer ne change rien)', () => {
  const fresh = wrapManaged('NEUF');
  const once = mergeManagedSection(`${fresh}\n\nUSER`, fresh);
  const twice = mergeManagedSection(once, fresh);
  assert.equal(once, twice);
});

test('merge jette si le frais n\'a pas de marqueurs', () => {
  assert.throws(() => mergeManagedSection('x', 'pas de marqueurs'), /marqueurs/);
});

// ── LES MARQUEURS DÉPAREILLÉS — la perte de texte mesurée ─────────────────────────────────────
//
// `indexOf` (managed-section.mjs) ne cherche pas une PAIRE : il cherche deux chaînes indépendantes
// et garde la PREMIÈRE de chacune. Un fichier perso qui contient une occurrence LITTÉRALE de
// « <!-- vibecoding:start » — le cas réel : l'utilisateur a recopié des morceaux d'un
// `AGENTS.md.new` — fait mordre `s` dans SON texte pendant que `e` trouve le `end` du vrai bloc,
// plus bas. Le `slice` efface tout l'intervalle.
//
// ⛔ CE MONTAGE A UN start ET UN end, DANS LE BON ORDRE. C'est ce qui le rend dangereux, et c'est
// ce qui a fait corriger le garde : écrit comme « start SANS end → jeter » (la formulation du
// brief), il restait vert ici — mesuré, ce test-ci l'a rendu rouge. Le garde compte les marqueurs.
const AVEC_PERSO_ORPHELIN = [
  '# Mes règles',
  'pnpm, pas npm.',
  'Extrait recopié du .new : <!-- vibecoding:start — bloc généré -->',
  'CE PARAGRAPHE EST À MOI',
  wrapManaged('LE VRAI BLOC DU KIT'),
  'Et ça aussi.',
].join('\n');

test('merge : un second marqueur de DÉBUT fait REFUSER la fusion, en nommant le fichier et la ligne', () => {
  // La preuve que le refus SERT à quelque chose, MESURÉE en jouant la fusion sans le garde
  // (mutation jouée puis restaurée, hors suite) : « CE PARAGRAPHE EST À MOI » disparaît, et
  // « pnpm, pas npm. » survit — la perte est PARTIELLE, donc invisible à un contrôle qui se
  // contenterait de « le fichier n'est pas vide ». Le fichier ressort en plus abîmé : le marqueur
  // du kit finit collé au milieu de la phrase de l'utilisateur (ligne 3).
  assert.throws(
    () => mergeManagedSection(AVEC_PERSO_ORPHELIN, wrapManaged('FRAIS'), 'AGENTS.md'),
    (e) => {
      assert.match(e.message, /AGENTS\.md/, 'le refus doit NOMMER le fichier : l\'utilisateur en a deux');
      assert.match(e.message, /:3\b/, 'et la LIGNE fautive, sinon il la cherche dans 200 lignes');
      assert.match(e.message, /D[ÉE]PAREILL/i);
      // Et il doit dire CE QUI SERAIT PERDU : « lignes 3 à 7 » est l'intervalle réellement effacé.
      assert.match(e.message, /lignes 3 à 7/, 'le message doit chiffrer la perte évitée');
      return true;
    },
  );
});

test('merge : un marqueur de FIN orphelin est refusé lui aussi', () => {
  // L'inverse : un `end` sans `start`. La fusion actuelle PRÉFIXE le bloc frais et laisse le `end`
  // perso en place — le fichier porte alors deux `end` pour un seul `start`, et la fusion SUIVANTE
  // coupe sur le mauvais. On refuse au premier passage, pas au second.
  const perso = '# Mes règles\npnpm, pas npm.\nJ\'ai collé <!-- vibecoding:end --> ici par erreur.\nGARDE-MOI';
  assert.throws(
    () => mergeManagedSection(perso, wrapManaged('FRAIS'), 'CLAUDE.md'),
    (e) => {
      assert.match(e.message, /CLAUDE\.md/);
      assert.match(e.message, /:3\b/);
      return true;
    },
  );
});

test('merge : une fin AVANT son début est refusée (paire dans le désordre)', () => {
  const desordre = `<!-- vibecoding:end -->\nGARDE-MOI\n${wrapManaged('BLOC')}`;
  assert.throws(() => mergeManagedSection(desordre, wrapManaged('FRAIS'), 'AGENTS.md'), /AGENTS\.md/);
});

test('merge : deux blocs du kit complets sont refusés, pas fusionnés au petit bonheur', () => {
  // Deux paires : la fusion actuelle remplace la PREMIÈRE et laisse la seconde — le projet se
  // retrouve avec deux blocs de règles, dont un périmé, relus tous les deux à chaque message.
  const deux = `${wrapManaged('A')}\n\nPERSO\n\n${wrapManaged('B')}`;
  assert.throws(() => mergeManagedSection(deux, wrapManaged('FRAIS'), 'AGENTS.md'), /D[ÉE]PAREILL/i);
});

test('merge : le garde ne mord PAS sur les deux cas légitimes', () => {
  // Contrôle symétrique — un garde qui refuserait tout serait vert aux tests précédents et
  // casserait `--refresh` sur tous les projets. Les deux formes normales doivent continuer à passer.
  assert.match(mergeManagedSection(`${wrapManaged('VIEUX')}\n\nPERSO`, wrapManaged('NEUF'), 'AGENTS.md'), /NEUF/);
  assert.match(mergeManagedSection('AUCUN MARQUEUR', wrapManaged('NEUF'), 'AGENTS.md'), /AUCUN MARQUEUR/);
});
