// scripts/lib/adoption.mjs — TOUT CE QUI EST PROPRE AU PARCOURS « PROJET EXISTANT ».
//
// Le kit crée des projets neufs sur 4 stacks connues. Sur un projet qui existe déjà, il ne peut
// prouver AUCUNE de ces 4 — et une règle Convex dans un projet Prisma est pire que pas de règle.
// `aucune` est donc la stack « je n'en revendique pas ».

import fs from 'node:fs';
// La liste des assistants et le rendu d'une question à choix numérotés viennent du wizard du
// parcours NEUF : les recopier ici en ferait une 3ᵉ copie, qui divergerait au premier assistant
// ajouté (E8 — duplications.test.mjs).
import { ASSISTANTS, pickOne } from './wizard.mjs';
import { heading, hint } from './ui.mjs';

// POURQUOI ELLE N'EST NI DANS `STACKS` NI DANS `AI_CONTEXT` : trois tests encodent l'invariant
// « toute clé de STACKS est une stack OFFERTE au débutant » (bannière README, guide 01, question
// de /init-vibecoding). `aucune` n'est pas une offre. L'y mettre rendait 5 tests rouges, dont 3
// pour la mauvaise raison — mesuré. Elle est donc un cas explicite, jamais une entrée de table.
export const STACK_AUCUNE = 'aucune';

export const estAdopte = (stack) => stack === STACK_AUCUNE;

// ── LE POINT D'ENTRÉE : `npx create-vibecoding-kit@latest --adopt`, lancé DEPUIS le projet ─────

// Ce que le kit IGNORE pour décider « ce dossier contient-il un projet ? ». Aucune des quatre ne
// prouve quoi que ce soit : `.git/` peut être vide (dépôt tout juste initialisé), `node_modules/`
// se régénère, `.DS_Store` est du Finder, et `.vibecoding.json` vient du kit lui-même.
const IGNORES = new Set(['.git', '.DS_Store', 'node_modules', '.vibecoding.json']);

// CE QU'ON A TROUVÉ. Une seule lecture sert au critère ET à l'affichage : deux lectures
// divergeraient, et le kit finirait par montrer autre chose que ce sur quoi il a décidé.
export function entreesDuProjet(dir) {
  try { return fs.readdirSync(dir).filter((n) => !IGNORES.has(n)).sort(); }
  catch { return []; } // dossier inexistant ou illisible : rien à adopter — et on le dira
}

// Est-ce qu'on atterrit sur un projet, ou sur un dossier vide ? Le kit ne DEVINE jamais : il
// montre ce qu'il a trouvé et demande. Ce critère ne sert qu'à savoir quoi PROPOSER.
// Deux cas limites assumés, que seule la question tranche :
//   · un dossier vide SOUS GIT est classé « neuf » — il n'y a rien à adopter ;
//   · un dossier qui ne contient que le `README.md` posé par GitHub est classé « existant » alors
//     que l'utilisateur voulait du neuf. Il le voit écrit, et répond non.
export const estProjetExistant = (dir) => entreesDuProjet(dir).length > 0;

// Au-delà, la liste devient un mur : on dit combien il en reste, ce qui suffit à reconnaître son
// propre projet — le but est qu'il vérifie l'ADRESSE, pas qu'il relise son arborescence.
const MAX_MONTRE = 8;

// Ce qu'on montre AVANT de demander quoi que ce soit — dans les deux modes, questions ou drapeaux.
export function renderInventaire(projectDir, entrees, on) {
  const lignes = [`  Dossier : ${projectDir}`];
  if (!entrees.length) {
    lignes.push(hint(`  Rien à adopter ici : ce dossier est vide (hors ${[...IGNORES].join(', ')}).`, on));
    lignes.push(hint('  Un projet NEUF, avec sa stack, c\'est : npx create-vibecoding-kit@latest', on));
    return lignes.join('\n');
  }
  const montres = entrees.slice(0, MAX_MONTRE);
  const reste = entrees.length - montres.length;
  lignes.push(`  J'y vois : ${montres.join(', ')}${reste > 0 ? ` (+ ${reste} autre${reste > 1 ? 's' : ''})` : ''}`);
  return lignes.join('\n');
}

// Une question fermée dont le DÉFAUT est écrit dans le libellé ([O/n] ou [o/N]). Une réponse non
// comprise retombe sur ce défaut ANNONCÉ — jamais sur « oui » par commodité : sur la question du
// dossier vide, ce raccourci ferait installer le kit là où l'utilisateur venait de dire non.
const OUI = ['o', 'oui', 'y', 'yes'];
const NON = ['n', 'non', 'no'];
async function demanderOuiNon(ask, question, defaut) {
  const r = (await ask(question)).trim().toLowerCase();
  if (OUI.includes(r)) return true;
  if (NON.includes(r)) return false;
  return defaut;
}

// Le parcours adopté pose ses questions quand il en a BESOIN et quand il PEUT : un `--assistant`
// déjà passé y répond, `--yes` et un terminal non interactif interdisent de les poser.
// (Le pendant de `needsWizard` pour ce parcours — qui, lui, ne serait jamais atteint : il exige
// --stack ET --assistant ET --project, que `--adopt` ne fournit pas.)
export function besoinDeQuestionsAdoption(args, isTTY, argv = []) {
  if (args.assistant) return false;
  if (argv.includes('--yes')) return false;
  return isTTY === true;
}

// Ce qui bloque un `--adopt` sans questions possibles. Hors terminal non plus, le kit ne devine
// pas : il refuse en nommant ce qui manque, avant d'avoir écrit le moindre octet.
export function erreursAdoptionNonInteractive(args, entrees, projectDir) {
  const errors = [];
  if (!ASSISTANTS.some((a) => a.key === args.assistant)) {
    errors.push(`--adopt : je ne peux pas deviner ton assistant. Relance avec --assistant ${ASSISTANTS.map((a) => a.key).join('|')}.`);
  }
  if (!entrees.length) {
    errors.push(`--adopt : rien à adopter dans ${projectDir}. Pour créer un projet NEUF : npx create-vibecoding-kit@latest`);
  }
  return errors;
}

// LES DEUX QUESTIONS du parcours adopté. La stack n'en fait PAS partie : elle vaut `aucune` par
// construction. Renvoie `null` si l'utilisateur refuse le dossier proposé — rien n'a été touché.
export async function runAdoptWizard(ask, on, out, { projectDir, entrees }) {
  out.write('\n' + heading('Vibecoding Starter Kit · projet existant', on) + '\n\n');
  out.write(renderInventaire(projectDir, entrees, on) + '\n\n');

  // On montre, on demande UNE fois, puis on écrit. Le défaut suit ce qu'on a trouvé — oui quand il
  // y a un projet, non quand il n'y a rien — mais dans les deux sens c'est la réponse qui tranche.
  const feuVert = entrees.length
    ? await demanderOuiNon(ask, '  Installer la méthode du kit dans CE projet ? (rien ne sera écrasé) [O/n] : ', true)
    : await demanderOuiNon(ask, '  Installer quand même la méthode ici ? [o/N] : ', false);
  if (!feuVert) { out.write(hint('  Rien n\'a été touché.', on) + '\n'); return null; }
  out.write('\n');

  // Question 1/2 — L'ASSISTANT. Indevinable depuis le disque, et obligatoire : c'est lui qui décide
  // dans quel dossier natif partent commandes, agents et hooks.
  const assistant = await pickOne(ask, on, out, 'Quel assistant IA utilises-tu ?', ASSISTANTS);

  // Question 2/2 — LE SCAN AUTOSKILLS. Sa place est ICI, après l'assistant dont elle dépend (elle
  // est masquée sous Cursor et Codex). Tâche 9 : la poser sans le run derrière serait une promesse
  // que rien ne tient, et l'ajouter ici ne coûtera aucune réécriture de ce qui précède.

  return { assistant };
}
