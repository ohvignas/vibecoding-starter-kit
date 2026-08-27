#!/usr/bin/env node
// LE LANCEUR DE LA SUITE, ET LE COMPTEUR DE ROUGES **PAR NOM**.
//
// Pourquoi il existe. Ce dépôt se pilote au nombre : « base 580 », « 588 », « 594 · 590 · 4 ».
// Tant que la suite était verte, un nombre suffisait. Dès qu'un rouge est DÉLIBÉRÉ — un garde
// écrit à l'avance pour une tâche qui n'a pas encore eu lieu — le nombre ment : une vraie
// régression arrive comme un rouge de plus, indiscernable d'un recomptage. Et pire, un rouge
// permanent NORMALISE le rouge : au bout de trois tâches, plus personne ne relit la liste.
//
// On épingle donc les rouges par leur NOM. La liste ci-dessous doit RÉTRÉCIR, jamais grandir :
//   · un rouge INATTENDU apparaît            → verdict ✗, il est nommé
//   · un rouge attendu DISPARAÎT (corrigé)   → verdict ✗ aussi : retire-le de la liste
// Le second sens compte autant que le premier — sans lui, la liste deviendrait un cimetière
// d'exceptions périmées que plus rien ne contredit.
//
// Ce n'est PAS un test (il lancerait la suite depuis la suite) : c'est le lanceur. `npm test`,
// `node --run test` et la CI passent par ici, donc le verdict ne peut pas être contourné en
// lançant `node --test` « juste pour voir » — enfin, il peut, et c'est le but : le raccourci
// reste disponible, il ne dit simplement rien sur les rouges attendus.
import { spawn } from 'node:child_process';

// nom = le titre EXACT du test, tel que le rapporteur TAP l'imprime.
export const ROUGES_ATTENDUS = [
  // V2bis (tâche 3) est parti d'ici le jour où la puce `- **vitrine**` a été écrite : le garde est
  // vert, et il est passé de lexical à EXÉCUTABLE au passage (il construit la racine que la puce
  // décrit et lance les checks dessus). La liste RÉTRÉCIT — c'est le seul sens autorisé.
  // D6 (tâche 9) est parti d'ici le jour où le segment « vitrine : » de l'item 10 a gagné `convex`
  // et `better-auth` — la liste que D6 confronte est LUE dans `matrix.mjs`, elle n'est pas recopiée
  // dans le test : le rouge s'est éteint tout seul dès que /doctor a dit la vérité du manifeste.
  // La liste RÉTRÉCIT — c'est le seul sens autorisé.
  {
    nom: 'H2 — le README annonce les amplitudes RÉELLES (plugins et MCP recomptés sur les 12 combos)',
    tache: 'tâche 10',
    quoi: 'README.md : « 2 à 4 serveurs MCP » → « 2 à 5 serveurs MCP »',
  },
  {
    nom: 'H2bis — la table « Geste 2 » liste EXACTEMENT les stacks qui ont un plugin',
    tache: 'tâche 10',
    quoi: 'README.md : ajouter la ligne « Vitrine | Convex | Cursor, Claude Code » et corriger la phrase « qui n\'a aucun plugin dédié »',
  },
];

// Les `not ok` de PREMIER NIVEAU (colonne 0). Les sous-tests sont indentés : les compter
// doublerait chaque échec.
export function rougesDuTap(tap) {
  return tap.split('\n').flatMap((l) => l.match(/^not ok \d+ - (.+)$/)?.[1] ?? []);
}

// ── L'INSTRUMENT DOIT SAVOIR RAPPORTER SA PROPRE PANNE ────────────────────────────────────────
// Ce lanceur lit du TAP. Sous un autre rapporteur (`--test-reporter=spec`…), il ne trouve AUCUN
// `not ok` — et la version naïve n'en concluait pas « je n'ai rien lu » mais « les 4 rouges
// attendus ont disparu » : quatre corrections imaginaires, nommées, avec les tâches à aller
// retirer de la liste. Elle envoyait quelqu'un chasser des fantômes.
//
// Le discriminant : du TAP contient forcément des lignes de résultat, et un résumé qui les
// recompte. Trois façons de ne pas savoir lire, trois refus de conclure :
//   1. aucune ligne de résultat de premier niveau      → ce n'est pas du TAP
//   2. pas de résumé `# fail N`                        → sortie tronquée ou étrangère
//   3. le résumé annonce des échecs, on n'en a nommé aucun → notre lecture est fausse
// Le sens inverse (plus de `not ok` que `# fail`) n'est pas dangereux : il ne peut produire qu'un
// « rouge inattendu » de trop, qui se relit. Ce qu'on ferme, c'est la sous-lecture — la seule qui
// fabrique de fausses bonnes nouvelles.
export function relire(tap) {
  const lignes = tap.split('\n');
  const rouges = rougesDuTap(tap);
  const verts = lignes.filter((l) => /^ok \d+ - /.test(l)).length;
  const resume = lignes.map((l) => l.match(/^# fail (\d+)$/)?.[1]).find((v) => v !== undefined);
  const echecsAnnonces = resume === undefined ? null : Number(resume);
  let illisible = null;
  if (!rouges.length && !verts) illisible = 'aucune ligne de résultat TAP (`ok` / `not ok`) dans la sortie';
  else if (echecsAnnonces === null) illisible = 'aucun résumé `# fail N` : sortie tronquée, ou rapporteur étranger';
  else if (echecsAnnonces > 0 && !rouges.length) illisible = `le résumé annonce ${echecsAnnonces} échec(s), et aucun nom n'a pu être lu`;
  return { rouges, verts, echecsAnnonces, illisible };
}

// `partiel` : la suite n'a pas tourné en entier (on a passé des fichiers en argument). Un rouge
// attendu qui manque n'est alors PAS une bonne nouvelle, juste un fichier non lancé — on ne peut
// rien en conclure. Les rouges INATTENDUS, eux, restent des rouges inattendus dans les deux cas.
// `illisible` : on n'a pas su lire la sortie. On ne conclut alors RIEN — ni « tout va bien », ni
// « ces rouges ont disparu ». Un verdict qu'on ne peut pas rendre est un échec, pas un succès.
export function verdict(rouges, attendus = ROUGES_ATTENDUS, { partiel = false, illisible = null } = {}) {
  const noms = new Set(attendus.map((r) => r.nom));
  const inattendus = illisible ? [] : rouges.filter((n) => !noms.has(n));
  const disparus = (illisible || partiel) ? [] : attendus.filter((r) => !rouges.includes(r.nom));
  return { inattendus, disparus, partiel, illisible, ok: !illisible && !inattendus.length && !disparus.length };
}

function rendre({ inattendus, disparus, ok, partiel, illisible }, attendus) {
  const L = ['', '─'.repeat(78), 'ROUGES ATTENDUS — comptés par leur nom, pas par leur nombre'];
  if (illisible) {
    L.push(`✗ SORTIE ILLISIBLE : ${illisible}.`);
    L.push('    → AUCUN verdict rendu — ni « tout va bien », ni « des rouges ont disparu ».');
    L.push('    → Cause probable : un rapporteur autre que celui par défaut (`--test-reporter=…`).');
    L.push('      Ce lanceur lit le TAP. Relance sans forcer le rapporteur.');
    L.push('─'.repeat(78));
    return L.join('\n');
  }
  for (const r of attendus) L.push(`  · ${r.tache} — ${r.nom.split(' — ')[0]}`);
  if (partiel) L.push('  (run PARTIEL : périmètre restreint — fichiers ou filtre de tests → on ne conclut rien sur les rouges absents)');
  if (ok) {
    L.push(partiel ? '✓ aucun rouge inattendu dans ce sous-ensemble.' : `✓ ${attendus.length} rouge(s), tous attendus. Aucune régression.`);
  } else {
    for (const n of inattendus) L.push(`✗ ROUGE INATTENDU : ${n}\n    → une régression, ou un garde à ajouter à ROUGES_ATTENDUS avec sa tâche.`);
    for (const r of disparus) L.push(`✗ ROUGE ATTENDU DISPARU : ${r.nom}\n    → ${r.tache} est faite ? RETIRE-LE de ROUGES_ATTENDUS (scripts/rouges-attendus.mjs).`);
  }
  L.push('─'.repeat(78));
  return L.join('\n');
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  let tap = '';
  // stdout en `pipe` (pour lire le TAP) mais réécrit tel quel : la sortie reste celle de
  // `node --test`, à l'octet près, avec le verdict ajouté en dessous.
  const args = process.argv.slice(2);
  // « partiel » = le périmètre a été RESTREINT, donc un rouge attendu absent ne prouve rien.
  // Deux façons de restreindre : une liste de fichiers, ou un drapeau qui filtre les tests. Les
  // autres drapeaux (`--test-reporter=…`, `--test-concurrency=…`) ne restreignent rien et ne
  // doivent PAS désarmer le contrôle des rouges disparus — c'est tout l'intérêt de le savoir.
  const FILTRES = ['--test-name-pattern', '--test-skip-pattern', '--test-only'];
  const partiel = args.some((a) => !a.startsWith('-') || FILTRES.some((f) => a.startsWith(f)));
  const enfant = spawn(process.execPath, ['--test', ...args], { stdio: ['inherit', 'pipe', 'inherit'] });
  enfant.stdout.on('data', (d) => { tap += d; process.stdout.write(d); });
  enfant.on('close', (code) => {
    const { rouges, illisible } = relire(tap);
    const v = verdict(rouges, ROUGES_ATTENDUS, { partiel, illisible });
    process.stdout.write(`${rendre(v, ROUGES_ATTENDUS)}\n`);
    // On ne masque JAMAIS l'échec de la suite : le code de l'enfant l'emporte s'il est non nul.
    process.exit(code || (v.ok ? 0 : 1));
  });
}
