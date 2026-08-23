// scripts/lib/gitignore-adoption.mjs — LE `.gitignore` D'UN PROJET ADOPTÉ.
//
// ⛔ LA RÉGRESSION QUE CE MODULE FERME, MESURÉE. Sur les 4 stacks offertes, le kit pose un
// `.gitignore` complet (`templates/gitignore/<stack>.gitignore`, qui contient `.env`). Sur un
// projet ADOPTÉ, il n'en posait AUCUN : `copyIfAbsent` ne récrit pas un fichier existant — et le
// cas normal d'un projet existant, c'est justement d'avoir déjà son `.gitignore` (souvent le
// `node_modules/` de son générateur, rien de plus).
// Résultat mesuré sur un projet ayant `.gitignore = node_modules/` : après installation,
// `git check-ignore .env` sortait en 1. Le kit installe un scan de secrets, écrit partout que les
// clés vont dans `.env`… et `.env` partait au premier `git add -A`. Le seul fichier qui devait
// être protégé était le seul que personne ne protégeait.
//
// CE QU'ON AJOUTE, ET POURQUOI EN FIN DE FICHIER. Git tranche par la DERNIÈRE règle qui matche :
// un ajout en fin de fichier gagne donc toujours, même contre un `!.env` écrit plus haut (vérifié
// sur 4 cas de vrai git). C'est ce qui rend la protection fiable — et c'est exactement pour ça
// qu'elle ne peut pas être silencieuse : battre une règle que quelqu'un a tapée exprès, ça se dit
// AVANT, dans l'écran d'accord (`renderAccordGitignore`), pas après, dans son historique.
import fs from 'node:fs';
import path from 'node:path';

// L'ORDRE EST CELUI DU BLOC ÉCRIT, et il n'est pas décoratif : `!.env.example` doit venir APRÈS
// `.env.*`, sinon `.env.*` le ré-ignore deux lignes plus bas.
//   · `.env`, `.env.*`     → les secrets, la raison d'être de ce module ;
//   · `!.env.example`      → le modèle SANS secret, lui, se commite (c'est ce que l'équipe lit) ;
//   · `.agents/`, `skills-lock.json` → artefacts que `npx skills add` dépose dans le projet à
//     chaque run du kit : non versionnés, ils repoussent tout seuls ;
//   · `docs/memory/.edit-queue.log` → SOUS CURSOR SEULEMENT : c'est le hook Cursor
//     `templates/cursor/hooks/log-edit.mjs` qui l'écrit, et lui seul. Sous Claude Code ou Codex,
//     le fichier n'existe jamais — l'ignorer serait une ligne qui ne parle de rien.
export const REGLES_SECRETS = ['.env', '.env.*', '!.env.example'];
export const REGLES_ARTEFACTS = ['.agents/', 'skills-lock.json'];
export const REGLE_CURSOR = 'docs/memory/.edit-queue.log';

// Chaque règle porte le CHEMIN qu'elle décide et l'effet attendu. C'est ce couple — pas le texte
// de la règle — qui permet de répondre à « est-ce déjà couvert ? » sans ajouter de doublon : un
// projet qui a déjà `.env*` protège déjà `.env`, et on n'a rien à écrire chez lui.
const REGLE_CHEMIN = {
  '.env': '.env',
  '.env.*': '.env.local',            // un représentant de la famille suffit à juger la couverture
  '!.env.example': '.env.example',
  '.agents/': '.agents',
  'skills-lock.json': 'skills-lock.json',
  [REGLE_CURSOR]: REGLE_CURSOR,
};

export function reglesAdoption(assistant) {
  return [...REGLES_SECRETS, ...REGLES_ARTEFACTS, ...(assistant === 'cursor' ? [REGLE_CURSOR] : [])];
}

export const estNegation = (regle) => regle.startsWith('!');

// Les lignes qui COMPTENT pour git : ni vides, ni commentaires. (Les commentaires n'ont aucun
// effet, mais les compter les ferait passer pour des règles battues dans l'écran d'accord.)
export function lignesUtiles(contenu) {
  return String(contenu ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

// ⛔ LE JETON `**`, ET POURQUOI IL LUI FAUT UN CARACTÈRE QUI NE PEUT PAS ÊTRE TAPÉ. `**` doit
// devenir `.*` (il franchit les `/`) alors que `*` devient `[^/]*` (il ne les franchit pas) : on
// remplace donc `**` par un JETON avant de traiter les `*` seuls, puis le jeton à la fin. Ce jeton
// n'était DÉCLARÉ nulle part : `motifMatch('**/x', …)` sortait en `ReferenceError: MARQUE is not
// defined` — mesuré, c'est le seul vrai défaut trouvé dans ce module. Sa reprise, elle, était
// écrite en dur avec un octet NUL LITTÉRAL dans le source (`/<NUL>/g`), invisible à la relecture :
// il est ici écrit `'\u0000'`, qui se voit. NUL reste le bon jeton — c'est le seul caractère qu'un
// `.gitignore` ne peut pas contenir, donc le seul qui ne peut jamais heurter un motif réel.
const MARQUE = '\u0000';

// Un matcheur de motif gitignore volontairement PARTIEL — et la liste de ce qu'il ne fait pas est
// dans ce commentaire, pas dans une surprise. Il couvre ce qu'on trouve réellement en tête des
// `.gitignore` du monde réel (`node_modules/`, `.env`, `.env*`, `dist/`, `*.log`, `/build`) :
//   · `/` en tête = ancré à la racine ; ici tous les chemins jugés SONT à la racine (ou donnés
//     complets), donc on le retire ;
//   · `/` en fin = dossier seulement ; on le retire et on compare le nom ;
//   · un motif SANS `/` matche le nom de base à n'importe quelle profondeur (règle de git) ;
//   · `*` et `?` ne franchissent pas un `/`, `**` franchit tout.
// Ce qu'il ne fait PAS : les classes `[a-z]`, et la règle « on ne ré-inclut pas un fichier sous un
// dossier exclu ». Les deux mèneraient à ÉCRIRE une règle de trop, jamais à en oublier une : le
// pire cas est une ligne redondante dans le bloc ajouté, pas un `.env` qui reste suivi.
export function motifMatch(motif, chemin) {
  let m = motif.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!m) return false;
  const cible = m.includes('/') ? chemin : chemin.split('/').pop();
  const rx = new RegExp(`^${m
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, MARQUE)
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replaceAll(MARQUE, '.*')}$`);
  return rx.test(cible);
}

// L'ÉTAT EFFECTIF d'un chemin : `true` ignoré, `false` ré-inclus, `null` aucune règle n'en parle.
// La DERNIÈRE règle qui matche décide — c'est la règle de git, et c'est toute la raison pour
// laquelle un ajout en fin de fichier tient. Un dossier parent ignoré ignore ce qu'il contient :
// on juge donc aussi les ancêtres du chemin.
export function etatEffectif(contenu, chemin) {
  const candidats = [];
  const parts = chemin.split('/');
  for (let i = 1; i <= parts.length; i += 1) candidats.push(parts.slice(0, i).join('/'));
  let etat = null;
  for (const ligne of lignesUtiles(contenu)) {
    const neg = estNegation(ligne);
    const motif = neg ? ligne.slice(1) : ligne;
    if (candidats.some((c) => motifMatch(motif, c))) etat = !neg;
  }
  return etat;
}

// La ligne qui décide aujourd'hui d'un chemin — celle qu'on NOMMERA dans l'écran d'accord si le
// bloc ajouté la bat. Sans elle, l'écran dirait « je change ton .gitignore » sans dire quoi.
export function ligneDecisive(contenu, chemin) {
  const candidats = [];
  const parts = chemin.split('/');
  for (let i = 1; i <= parts.length; i += 1) candidats.push(parts.slice(0, i).join('/'));
  let decisive = null;
  for (const ligne of lignesUtiles(contenu)) {
    const motif = estNegation(ligne) ? ligne.slice(1) : ligne;
    if (candidats.some((c) => motifMatch(motif, c))) decisive = ligne;
  }
  return decisive;
}

// CE QU'IL Y A À FAIRE, et rien de plus :
//   · `aAjouter` : les règles dont l'effet n'est PAS déjà obtenu (donc rien à écrire sur un projet
//     déjà propre — et rejouer `--adopt` n'ajoute jamais un doublon) ;
//   · `battues`  : celles qui renversent une règle EXISTANTE. C'est la liste que l'écran d'accord
//     doit citer telle quelle : une intention qu'on renverse se dit avant, pas jamais.
export function analyserGitignore(contenu, regles) {
  const aAjouter = [], battues = [];
  for (const regle of regles) {
    const chemin = REGLE_CHEMIN[regle];
    const voulu = !estNegation(regle);
    const etat = etatEffectif(contenu, chemin);
    if (etat === voulu) continue;               // déjà obtenu : on n'écrit rien
    aAjouter.push(regle);
    if (etat !== null) battues.push({ ligne: ligneDecisive(contenu, chemin), regle, chemin });
  }
  return { aAjouter, battues };
}

export const ENTETE_BLOC = '# vibecoding — secrets et artefacts du kit (ajouté par create-vibecoding-kit)';

// L'ÉCRITURE. Deux détails qui ne sont pas des détails :
//   · le contenu d'origine ressort À L'OCTET, en tête — on AJOUTE, on ne réécrit pas ;
//   · un fichier sans saut de ligne final en reçoit un AVANT le bloc. Sans ça, la première règle
//     ajoutée se colle à la dernière ligne de l'utilisateur (`node_modules/.env`) : deux règles
//     détruites d'un coup, la sienne et la nôtre.
export function completerGitignore(contenu, aAjouter) {
  if (!aAjouter.length) return contenu ?? '';
  const bloc = ['', ENTETE_BLOC, ...aAjouter, ''].join('\n');
  if (!contenu) return bloc.replace(/^\n/, '');
  return `${contenu}${contenu.endsWith('\n') ? '' : '\n'}${bloc}`;
}

// La phrase de l'écran d'accord. Elle NOMME les règles ajoutées, et — s'il y en a — les lignes
// existantes que le bloc renverse. `on` porte la couleur, comme partout ailleurs dans le CLI.
export function renderAccordGitignore({ existe, aAjouter, battues }, hint, on) {
  const L = [];
  L.push(existe
    ? '  Ton `.gitignore` existe, mais il ne protège pas tout ce que le kit dépose.'
    : '  Ce projet n\'a pas de `.gitignore` : rien n\'y protège un `.env`.');
  L.push(`  J'ajoute ${existe ? 'à la FIN' : 'dans un fichier neuf'} : ${aAjouter.join(', ')}`);
  if (battues.length) {
    // ⛔ Le seul cas où l'ajout n'est pas neutre : la dernière règle gagne, donc celle-ci PERD.
    // La taire, c'est renverser une intention en silence dans le fichier de quelqu'un d'autre.
    L.push('');
    L.push('  ⚠️ Attention, ça renverse une règle que tu as déjà :');
    for (const b of battues) L.push(`     « ${b.ligne} » décide aujourd'hui de ${b.chemin} — « ${b.regle} », ajouté en fin de fichier, gagnera.`);
  }
  L.push(hint('  (l\'ajout est en fin de fichier : le reste de ton .gitignore n\'est pas touché)', on));
  return L.join('\n');
}

// ── LE DISQUE : UNE SEULE LECTURE, QUI SERT À L'ÉCRAN *ET* À L'ÉCRITURE ───────────────────────
//
// Le plan est relevé UNE fois (avant la question) et c'est LUI qu'on écrit ensuite. Deux lectures
// — une pour montrer, une pour écrire — pourraient diverger, et le kit finirait par écrire autre
// chose que ce à quoi l'utilisateur a dit oui. Même discipline que `entreesDuProjet` (adoption.mjs).
export function planGitignore(projectDir, assistant) {
  const chemin = path.join(projectDir, '.gitignore');
  let contenu = null;
  try { contenu = fs.readFileSync(chemin, 'utf8'); } catch { contenu = null; } // absent = un cas, pas une panne
  const { aAjouter, battues } = analyserGitignore(contenu ?? '', reglesAdoption(assistant));
  return { chemin, existe: contenu !== null, contenu, aAjouter, battues };
}

// L'ÉCRITURE, ET SES TROIS ÉTATS D'ACCORD — c'est ici que se joue tout le sens du module.
//
//   · `true`      — l'utilisateur a lu l'écran et a dit oui : on écrit TOUT, y compris ce qui
//                   renverse une de ses règles. Il l'a vue nommée.
//   · `false`     — il a lu l'écran et a dit non : on n'écrit RIEN. Un refus est un refus.
//   · `undefined` — PERSONNE N'A PU ÊTRE CONSULTÉ (hors terminal, ou `--yes`). On écrit alors les
//                   seules règles qui ne renversent RIEN, et on range les autres en « Sauté ».
//
// ⛔ POURQUOI LE TROISIÈME CAS N'EST NI « TOUT » NI « RIEN ». « Rien » laisserait `.env` suivi
// dans le cas ORDINAIRE (un `.gitignore` qui dit `node_modules/` et rien d'autre) — c'est la fuite
// que ce module existe pour fermer, et ne rien faire la laisse ouverte. « Tout » renverserait un
// `!.env` que quelqu'un a tapé exprès, sans que personne ne puisse répondre — exactement ce que
// l'en-tête de ce fichier interdit. Le partage passe donc par `battues` : ce qui n'écrase aucune
// intention protège, ce qui en écrase une attend un accord.
export function appliquerGitignore(plan, { accord } = {}) {
  if (accord === false) return { ecrites: [], refusees: plan.aAjouter, motif: 'refus' };
  const battues = new Set(plan.battues.map((b) => b.regle));
  const ecrites = accord === true ? plan.aAjouter : plan.aAjouter.filter((r) => !battues.has(r));
  const refusees = plan.aAjouter.filter((r) => !ecrites.includes(r));
  if (ecrites.length) fs.writeFileSync(plan.chemin, completerGitignore(plan.contenu ?? '', ecrites));
  return { ecrites, refusees, motif: refusees.length ? 'sans-accord' : null };
}
