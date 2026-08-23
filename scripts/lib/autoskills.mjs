// scripts/lib/autoskills.mjs — UN OUTIL TIERS, PROPOSÉ SANS ÊTRE EMBARQUÉ NI SE FAIRE ÉCRASER.
//
// `--adopt` installe la méthode du kit dans un projet qui existe déjà, et ne revendique AUCUNE
// techno (`stack: aucune`). `autoskills`, lui, en connaît : `npx autoskills` lit les fichiers de
// config (`package.json`, Gradle…), devine la stack et installe des skills curés depuis SON
// registre. C'est exactement le trou que le parcours adopté laisse ouvert — donc on le PROPOSE.
//
// ⛔ ON NE L'EMBARQUE JAMAIS. Sa licence est **CC BY-NC 4.0** (vérifié dans son `LICENSE`), le kit
// est **MIT** : l'embarquer redistribuerait du non-commercial sous MIT. Le faire lancer PAR
// l'utilisateur, chez lui, ne redistribue rien — c'est déjà le traitement de superpowers
// (`/plugin install`) et de `npx skills add`. Ce module ne copie donc pas une ligne de son code :
// il compose une commande `npx`, et il NOMME l'outil, son auteur et sa licence avant de demander.
import fs from 'node:fs';
import path from 'node:path';
import { DESIGN_SKILL_NAMES } from './matrix.mjs';
import { defaultRun } from './external.mjs';
import { hint } from './ui.mjs';

// ⛔ CYCLE D'IMPORT ASSUMÉ, ET LA RÈGLE QUI LE REND SÛR. `matrix.mjs` importe `adoption.mjs`, qui
// importe ce fichier : selon le module chargé en premier, `DESIGN_SKILL_NAMES` peut être encore en
// zone morte quand CE corps s'évalue. Il n'est donc lu QUE dans un corps de fonction ou un
// paramètre par défaut (évalué à l'appel), jamais dans un `const` de haut niveau. Une constante
// `const NOMS = [...DESIGN_SKILL_NAMES]` ici sortirait en `ReferenceError` — mesuré ailleurs.

// L'IDENTITÉ DE L'OUTIL, source unique. Elle est affichée à l'utilisateur AVANT la question et
// re-citée dans le rapport : ces skills ne viennent pas du kit et n'ont pas été relus par lui.
export const AUTOSKILLS = {
  commande: 'autoskills',
  auteur: 'midudev',
  licence: 'CC BY-NC 4.0',
  depot: 'https://github.com/midudev/autoskills',
};

// ── QUI EST SUPPORTÉ, ET POURQUOI DEUX ASSISTANTS SUR TROIS NE LE SONT PAS ────────────────────
//
// `skills-map.ts:1390` — `AGENT_FOLDER_MAP` liste `.claude`, `.cline`, `.junie`, `.codebuddy`,
// `.continue`, `.kiro`. Ni `.cursor`, ni `.codex`. Sous Cursor, `agentFolderFor()` rend `null` :
// AUCUN lien n'est créé, les skills atterrissent dans `.agents/skills/` et Cursor ne les voit
// jamais. Poser la question là-bas, ce serait proposer un scan qui ne peut rien brancher —
// et facturer 1-2 minutes de téléchargement pour un dossier que l'assistant ne lit pas.
export const AGENTS_AUTOSKILLS = ['claude', 'cline', 'junie', 'codebuddy', 'continue', 'kiro'];

// Comment CHAQUE assistant du kit s'appelle chez autoskills. La question se dérive de la table
// ci-dessus, elle n'est pas une liste blanche recopiée à la main : le jour où autoskills ajoute
// `cursor` à son `AGENT_FOLDER_MAP`, une seule ligne bouge ici.
const NOM_CHEZ_AUTOSKILLS = { cursor: 'cursor', 'claude-code': 'claude', codex: 'codex' };

export const supporteAutoskills = (assistant) => AGENTS_AUTOSKILLS.includes(NOM_CHEZ_AUTOSKILLS[assistant]);

// ── LES DEUX ÉTAPES, ET POURQUOI LE DRY-RUN N'EST PAS UNE OPTION ──────────────────────────────
//
// `--dry-run` D'ABORD, TOUJOURS : il annonce ce qu'il installerait sans rien écrire. S'il échoue
// (réseau, registre, drapeau disparu), la vraie passe n'a pas lieu — `lancerAutoskills` s'arrête
// à la première étape qui jette. Aucun drapeau inventé au-delà : `-y` est celui de `npx` (le même
// que `buildSkillAddArgs`), et le vrai run est lancé nu, dans un terminal où l'utilisateur est
// présent — c'est la seule porte par laquelle ce module peut être atteint.
export const ETAPES_AUTOSKILLS = [
  { nom: 'dry-run', args: ['-y', AUTOSKILLS.commande, '--dry-run'] },
  { nom: 'installation', args: ['-y', AUTOSKILLS.commande] },
];

// ── LA COLLISION, ET POURQUOI « PROPOSER APRÈS » LA GARANTIT AU LIEU DE L'ÉVITER ──────────────
//
// `frontend-design` est dans le registre autoskills **et** dans `DESIGN_SKILL_NAMES`
// (`matrix.mjs`). Son `installer.ts` fait `rmSync(.claude/skills/<nom>, {recursive:true,
// force:true})` AVANT de lier. Donc : le skill du kit est sur disque en premier, c'est lui que le
// `rmSync` emporte, et `/doctor` item 11 continue de dire ✅ (il vérifie la présence, pas le
// contenu). Lancer autoskills « après » l'installation du kit ne réduit pas ce risque : c'est ce
// qui le RÉALISE.
//
// ⛔ ON EMPÊCHE, ON NE RACONTE PAS. Un `--dry-run` et un écran qui « nomme les skills remplacés »
// sont de la divulgation après coup. La seule prévention qui soit ENTIÈREMENT dans nos mains — on
// ne contrôle pas la surface de drapeaux d'un CLI tiers, et inventer un `--exclude` qui n'existe
// pas ne protégerait rien en silence — c'est d'ÉCARTER les 4 skills du kit du disque le temps du
// run, puis de les remettre. autoskills ne voit alors rien à supprimer, installe sa propre
// version, et la restauration la remplace par celle que le kit a relue. Net : le kit gagne, à
// l'octet près.
//
// LES DEUX CHEMINS, pas un seul. `npx skills add` dépose le contenu dans `.agents/skills/<nom>` et
// pose un lien dans le dossier natif de l'assistant. autoskills écrit dans les deux : ne protéger
// que `.claude/skills/<nom>` laisserait le magasin se faire réécrire sous le lien.
export function cheminsSkill(projectDir, nom) {
  return [
    path.join(projectDir, '.claude', 'skills', nom),
    path.join(projectDir, '.agents', 'skills', nom),
  ];
}

// `existsSync` rend `false` sur un lien symbolique CASSÉ — et un skill lié est le cas ordinaire
// ici. On regarde donc le lien lui-même (`lstat`), sinon on laisserait autoskills écraser
// exactement ce qu'on croyait absent.
const existe = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };

// L'abri est DANS le projet : `rename` ne franchit pas un système de fichiers, et `os.tmpdir()`
// est sur un autre volume sur les machines où `/tmp` est monté à part (mesuré sur macOS avec un
// disque externe). Le nom porte le mot « vibecoding » pour qu'un reste après crash se reconnaisse.
export const DOSSIER_ABRI = '.vibecoding-autoskills-abri';

export function ecarterSkillsDesign(projectDir, noms = DESIGN_SKILL_NAMES) {
  const abri = path.join(projectDir, DOSSIER_ABRI);
  fs.rmSync(abri, { recursive: true, force: true }); // reste d'un run interrompu : jamais réutilisé
  const ecartes = [];
  let i = 0;
  for (const nom of noms) {
    for (const origine of cheminsSkill(projectDir, nom)) {
      if (!existe(origine)) continue; // rien à protéger : le kit ne l'a pas (ou pas encore) posé
      const range = path.join(abri, String(i));
      i += 1;
      fs.mkdirSync(range, { recursive: true });
      // `rename` déplace le LIEN, pas sa cible : un skill lié revient lié, vers la même cible.
      fs.renameSync(origine, path.join(range, nom));
      ecartes.push({ nom, origine, abri: path.join(range, nom) });
    }
  }
  return { abri, ecartes, noms: [...new Set(ecartes.map((e) => e.nom))] };
}

// La remise en place. Ce qu'autoskills a posé à cet endroit est SUPPRIMÉ : c'est le sens du
// « on empêche ». Le dossier d'abri disparaît ensuite — un abri oublié à la racine d'un projet
// adopté serait un fichier du kit laissé dans le dépôt de quelqu'un d'autre.
//
// ⛔ SAUF S'IL RESTE QUELQUE CHOSE DEDANS. Un chemin qu'on n'a pas pu remettre n'existe plus qu'à
// l'abri : le supprimer par principe détruirait le skill qu'on protégeait. Dans ce cas l'abri
// reste, `perdus` le nomme, et le rapport le dit — jamais une perte silencieuse.
export function restaurerSkillsDesign({ abri, ecartes } = {}) {
  const remis = [], perdus = [];
  for (const e of ecartes ?? []) {
    try {
      fs.rmSync(e.origine, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(e.origine), { recursive: true });
      fs.renameSync(e.abri, e.origine);
      remis.push(e.nom);
    } catch { perdus.push(e.origine); }
  }
  if (abri && !perdus.length) fs.rmSync(abri, { recursive: true, force: true });
  return { remis, perdus };
}

// L'écran qui précède la question. Il NOMME l'outil, son auteur et sa licence — sans ça,
// « je scanne ta stack ? » fait installer du code tiers sous le nom du kit.
export function renderProposeAutoskills(on) {
  return [
    `  Un outil TIERS peut deviner tes technos et ajouter les skills qui vont avec : \`npx ${AUTOSKILLS.commande}\``,
    `  (de ${AUTOSKILLS.auteur}, licence ${AUTOSKILLS.licence} — le kit est MIT et ne l'embarque pas).`,
    '  Il lit tes fichiers de config, installe des skills depuis SON registre, et écrit un',
    '  `skills-lock.json` — le même fichier que le kit : ce lock devient à provenance mixte.',
    '  ⚠️ Ces skills NE VIENNENT PAS du kit et n\'ont pas été relus par lui.',
    `  Le kit lance d'abord un \`--dry-run\` (il annonce, il n'installe rien), puis le vrai scan.`,
    '  Tes skills design du kit sont ÉCARTÉS le temps du scan et remis après — autoskills en a',
    '  d\'autres versions et remplacerait les tiennes sans le dire :',
    `    ${DESIGN_SKILL_NAMES.join(', ')}`,
    hint('  (non = rien n\'est lancé, rien n\'est téléchargé)', on),
  ].join('\n');
}

// ── LE RUN ────────────────────────────────────────────────────────────────────────────────────
//
// La protection encadre TOUT le run : les skills du kit sont écartés avant la première passe et
// remis après la dernière, qu'elle ait abouti ou jeté.
export function lancerAutoskills({ projectDir, assistant, run = defaultRun, noms }) {
  if (!supporteAutoskills(assistant)) {
    // Rien n'est écarté non plus : on sort AVANT `ecarterSkillsDesign`, donc pas un fichier ne bouge.
    return { lance: false, etapes: [], proteges: [], perdus: [], echec: `${assistant} n'est pas dans l'AGENT_FOLDER_MAP d'${AUTOSKILLS.commande}` };
  }
  const abri = ecarterSkillsDesign(projectDir, noms ?? DESIGN_SKILL_NAMES);
  const etapes = [];
  let echec = null;
  // ⛔ LE `catch` NE LAISSE PAS PASSER : une passe qui jette au milieu a DÉJÀ pu supprimer des
  // skills du kit, et c'est exactement le cas où il faut les remettre. La restauration est donc
  // APRÈS le catch et avant le `return` — pas dans un `finally`, qui s'exécuterait après que
  // l'objet de retour a été construit et rendrait `perdus` faux d'un run.
  try {
    for (const etape of ETAPES_AUTOSKILLS) {
      run('npx', etape.args, { cwd: projectDir });
      etapes.push(etape.nom);
    }
  } catch (e) { echec = e?.message ?? String(e); }
  const { perdus } = restaurerSkillsDesign(abri);
  return { lance: !echec, etapes, proteges: abri.noms, perdus, ...(echec ? { echec } : {}) };
}
