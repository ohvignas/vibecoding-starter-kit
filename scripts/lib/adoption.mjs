// scripts/lib/adoption.mjs — TOUT CE QUI EST PROPRE AU PARCOURS « PROJET EXISTANT ».
//
// Le kit crée des projets neufs sur 4 stacks connues. Sur un projet qui existe déjà, il ne peut
// prouver AUCUNE de ces 4 — et une règle Convex dans un projet Prisma est pire que pas de règle.
// `aucune` est donc la stack « je n'en revendique pas ».

import fs from 'node:fs';
// Le menu (libellés) et le rendu d'une question à choix numérotés viennent du wizard du parcours
// NEUF ; les CLÉS et la VALIDATION viennent d'args.mjs, comme pour toutes les autres branches du
// CLI. Juger l'assistant contre une liste et le reste du CLI contre une autre, c'était déjà deux
// vérités pour la même chose (E8 — duplications.test.mjs).
import { ASSISTANT_KEYS, validateArgs } from './args.mjs';
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
  // CE QU'ON VA ÉCRIRE DANS SES FICHIERS, dit AVANT la question — c'est la moitié « montre » du
  // « montre, puis demande ». Depuis la tâche 6, `--adopt` ne dépose plus la méthode dans un
  // `AGENTS.md.new` que personne n'ouvre : il FUSIONNE dans `AGENTS.md`/`CLAUDE.md`. Consentir à
  // « installer la méthode » sans savoir que deux fichiers existants vont être réécrits, ce n'est
  // pas consentir à ce qui se passe.
  //
  // ON NOMME LE BLOC, ON NE LE DÉVERSE PAS : le rendu fait ~1 860 mots. Le dérouler dans un
  // terminal, c'est un mur que personne ne lit — et un mur non lu n'est pas un consentement mieux
  // éclairé qu'une phrase exacte. Ce qui rend la phrase vérifiable, c'est la FRONTIÈRE : les
  // marqueurs sont dans le fichier, et tout ce qui est en dehors n'est jamais touché.
  lignes.push('');
  lignes.push('  Ce que j\'écris : la méthode du kit dans `AGENTS.md` et `CLAUDE.md`, entre deux');
  lignes.push('  marqueurs `vibecoding`. Ces fichiers sont créés s\'ils manquent, complétés s\'ils');
  lignes.push('  existent — et tout ce qui est HORS des marqueurs reste tel quel, à la ligne près.');
  lignes.push('  Le reste (commandes, agents, mémoire) part dans des fichiers neufs, jamais par-dessus les tiens.');
  return lignes.join('\n');
}

// Une question fermée dont le DÉFAUT est écrit dans le libellé ([O/n] ou [o/N]).
// ⛔ Une réponse non comprise REBOUCLE, elle ne vaut aucun des deux — même patron que `pickOne`.
// Mesuré sur la version d'avant, qui retombait sur le défaut : « nan », « nope », « non merci »,
// « bof », « plutôt pas » valaient tous OUI sur la porte [O/n], soit 6 refus plausibles sur 7 qui
// entraient. Une porte qui s'ouvre sur « nan » n'est pas une porte, et c'est la question dont
// l'enjeu est d'écrire dans le projet réel de l'utilisateur.
// La chaîne vide, elle, garde le défaut : taper Entrée devant « [O/n] » est un consentement, il
// est écrit dans la question.
const OUI = ['o', 'oui', 'y', 'yes'];
const NON = ['n', 'non', 'no'];
async function demanderOuiNon(ask, on, out, question, defaut) {
  for (;;) {
    const r = (await ask(question)).trim().toLowerCase();
    if (r === '') return defaut;
    if (OUI.includes(r)) return true;
    if (NON.includes(r)) return false;
    out.write(hint('  Réponds par o (oui) ou n (non) — ou tape Entrée pour le choix par défaut.', on) + '\n');
  }
}

// Le parcours adopté demande dès qu'il PEUT : terminal interactif, et pas de `--yes`.
// ⛔ Il regardait aussi `args.assistant` — ce qui confondait « la question de l'assistant a déjà
// sa réponse » et « pas besoin de demander avant d'écrire ». Mesuré sur pty :
// `--adopt --assistant cursor` montrait le dossier puis écrivait tout, sans une seule question,
// dans un terminal où demander était possible. Un drapeau répond à UNE question ; il ne consent
// pas à la place de l'utilisateur. La question de l'assistant, elle, est sautée dans le parcours.
export function peutDemanderAdoption(isTTY, argv = []) {
  return isTTY === true && !argv.includes('--yes');
}

// La validation du parcours adopté EST celle du parcours neuf — `validateArgs`, source unique —
// avec DEUX exemptions, chacune pour une raison nommée :
//   · `project` : ici le chemin n'est pas TAPÉ mais OBSERVÉ (le dossier de l'utilisateur), et
//     `isValidProjectName` refuse « ( ) ! $ * ? » — donc « ~/dev/Mon projet (v2) », un dossier
//     qu'il ne peut pas renommer ;
//   · `assistant` absent : c'est la question 1/2, elle a le droit de manquer ici. Une valeur
//     FAUSSE, elle, reste une faute — la sonde ne remplace que l'absence.
// ⛔ Sans cet appel, `--adopt --backend nawak` sortait en exit 0 et persistait « nawak » dans
// `.vibecoding.json`, que `--refresh` relit ; la même valeur sort en 1 sur le parcours neuf.
export const erreursAdoption = (args) => validateArgs({
  ...args,
  stack: STACK_AUCUNE,
  project: 'projet-adopte',
  assistant: args.assistant ?? ASSISTANT_KEYS[0],
});

// Ce qui bloque un `--adopt` sans questions possibles. Hors terminal non plus, le kit ne devine
// pas : il refuse en nommant ce qui manque, avant d'avoir écrit le moindre octet.
export function erreursAdoptionNonInteractive(args, entrees, projectDir) {
  const errors = [];
  if (!ASSISTANT_KEYS.includes(args.assistant)) {
    errors.push(`--adopt : je ne peux pas deviner ton assistant. Relance avec --assistant ${ASSISTANT_KEYS.join('|')}.`);
  }
  if (!entrees.length) {
    errors.push(`--adopt : rien à adopter dans ${projectDir}. Pour créer un projet NEUF : npx create-vibecoding-kit@latest`);
  }
  return errors;
}

// LES DEUX QUESTIONS du parcours adopté. La stack n'en fait PAS partie : elle vaut `aucune` par
// construction. Renvoie `null` si l'utilisateur refuse le dossier proposé — rien n'a été touché.
export async function runAdoptWizard(ask, on, out, { projectDir, entrees, assistant: fourni }) {
  out.write('\n' + heading('Vibecoding Starter Kit · projet existant', on) + '\n\n');
  out.write(renderInventaire(projectDir, entrees, on) + '\n\n');

  // On montre, on demande UNE fois, puis on écrit. Le défaut suit ce qu'on a trouvé — oui quand il
  // y a un projet, non quand il n'y a rien — mais dans les deux sens c'est la réponse qui tranche.
  const feuVert = entrees.length
    ? await demanderOuiNon(ask, on, out, '  Installer la méthode du kit dans CE projet ? (rien ne sera écrasé) [O/n] : ', true)
    : await demanderOuiNon(ask, on, out, '  Installer quand même la méthode ici ? [o/N] : ', false);
  if (!feuVert) { out.write(hint('  Rien n\'a été touché.', on) + '\n'); return null; }
  out.write('\n');

  // Question 1/2 — L'ASSISTANT. Indevinable depuis le disque, et obligatoire : c'est lui qui décide
  // dans quel dossier natif partent commandes, agents et hooks. SAUTÉE si `--assistant` l'a déjà
  // donnée (jugée en amont par `erreursAdoption`) : la reposer serait du bruit. Le CONSENTEMENT
  // ci-dessus, lui, n'est jamais sauté par un drapeau — c'est deux choses différentes.
  const assistant = fourni ?? await pickOne(ask, on, out, 'Quel assistant IA utilises-tu ?', ASSISTANTS);

  // Question 2/2 — LE SCAN AUTOSKILLS. Sa place est ICI, après l'assistant dont elle dépend (elle
  // est masquée sous Cursor et Codex). Tâche 9 : la poser sans le run derrière serait une promesse
  // que rien ne tient, et l'ajouter ici ne coûtera aucune réécriture de ce qui précède.

  return { assistant };
}
