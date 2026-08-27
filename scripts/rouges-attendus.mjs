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
  {
    nom: 'V2bis — le runbook de scaffold POSE les fichiers racine sans lesquels les checks se sautent',
    tache: 'tâche 3',
    quoi: 'la puce `- **vitrine**` de templates/commands/new-project/07-scaffold.md doit POSER package.json (workspaces), tsconfig.json, biome.json, site/, dashboard/',
  },
  {
    nom: 'D6 — /doctor vérifie les 10 commandes, la mémoire du crew, le MCP shadcn de desktop et les outils de preuve',
    tache: 'tâche 9',
    quoi: 'templates/commands/doctor.md item 10 (+ copie plugin) : le segment « vitrine : » doit gagner convex et better-auth',
  },
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

// `partiel` : la suite n'a pas tourné en entier (on a passé des fichiers en argument). Un rouge
// attendu qui manque n'est alors PAS une bonne nouvelle, juste un fichier non lancé — on ne peut
// rien en conclure. Les rouges INATTENDUS, eux, restent des rouges inattendus dans les deux cas.
export function verdict(rouges, attendus = ROUGES_ATTENDUS, { partiel = false } = {}) {
  const noms = new Set(attendus.map((r) => r.nom));
  const inattendus = rouges.filter((n) => !noms.has(n));
  const disparus = partiel ? [] : attendus.filter((r) => !rouges.includes(r.nom));
  return { inattendus, disparus, partiel, ok: !inattendus.length && !disparus.length };
}

function rendre({ inattendus, disparus, ok, partiel }, attendus) {
  const L = ['', '─'.repeat(78), 'ROUGES ATTENDUS — comptés par leur nom, pas par leur nombre'];
  for (const r of attendus) L.push(`  · ${r.tache} — ${r.nom.split(' — ')[0]}`);
  if (partiel) L.push('  (run PARTIEL : des fichiers ont été passés en argument → on ne conclut rien sur les rouges absents)');
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
  const enfant = spawn(process.execPath, ['--test', ...args], { stdio: ['inherit', 'pipe', 'inherit'] });
  enfant.stdout.on('data', (d) => { tap += d; process.stdout.write(d); });
  enfant.on('close', (code) => {
    const v = verdict(rougesDuTap(tap), ROUGES_ATTENDUS, { partiel: args.length > 0 });
    process.stdout.write(`${rendre(v, ROUGES_ATTENDUS)}\n`);
    // On ne masque JAMAIS l'échec de la suite : le code de l'enfant l'emporte s'il est non nul.
    process.exit(code || (v.ok ? 0 : 1));
  });
}
