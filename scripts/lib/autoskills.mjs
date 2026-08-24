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

// ⛔ LE PLAN, ET POURQUOI IL EXISTE. Pendant les deux passes `npx` — que ce module chiffre lui-même
// à « 1-2 minutes de téléchargement » —, l'abri est le SEUL endroit où vivent les 4 skills design.
// Un Ctrl-C là-dedans est le cas ORDINAIRE (un débutant qui annule un téléchargement tiers lent),
// et `wireSigint` est déjà mort à cet instant (`rl.close()` en `finally`, setup.mjs) : personne ne
// nettoie. La version d'avant ouvrait son écart par un `rmSync(abri)` « reste d'un run interrompu :
// jamais réutilisé » — donc le run suivant DÉTRUISAIT les skills du run interrompu. Mesuré : après
// une interruption, `.claude/skills` et `.agents/skills` vides, 8 entrées à l'abri, second run →
// perte définitive. Pire encore quand la restauration avait échoué : le rapport disait « ils sont
// dans l'abri, déplace-les à la main », et le run suivant supprimait ce qu'il venait de désigner.
//
// L'abri porte donc un PLAN qui dit, pour chaque entrée, d'où elle vient. Un abri trouvé au
// démarrage est REPRIS (on remet ce qu'il contient) ; un abri qu'on ne sait pas lire FAIT REFUSER
// le run, en se nommant. Ce qu'on ne comprend pas, on n'y touche pas — on ne le supprime jamais.
export const FICHIER_PLAN = 'plan.json';

// Ce que l'abri contient ENCORE, hors le plan : `<i>/<nom>`. Sert deux fois — pour ne supprimer
// l'abri que s'il est vraiment vide, et pour nommer ce qui reste quand on refuse de partir.
export function contenuAbri(abri) {
  let ranges;
  try { ranges = fs.readdirSync(abri).filter((n) => n !== FICHIER_PLAN).sort(); } catch { return []; }
  const restant = [];
  for (const r of ranges) {
    let dedans = [];
    try { dedans = fs.readdirSync(path.join(abri, r)); } catch { continue; }
    for (const n of dedans) restant.push(path.join(abri, r, n));
  }
  return restant;
}

// LA REPRISE. Trois issues, et une seule supprime quelque chose :
//   · pas d'abri            → rien à faire, le run peut partir ;
//   · abri + plan lisible   → on REMET tout, l'abri disparaît, le run peut partir ;
//   · abri illisible, ou une remise qui échoue, ou un reste hors plan → REFUS, l'abri est INTACT.
export function reprendreAbri(projectDir) {
  const abri = path.join(projectDir, DOSSIER_ABRI);
  if (!existe(abri)) return { repris: [], refus: null };
  // ⛔ UN PLAN NE FAIT PAS SUPPRIMER HORS DU PROJET. La reprise OBÉIT à un fichier trouvé sur le
  // disque, et cette obéissance déclenche un `rmSync` RÉCURSIF sur chaque `origine`. Un plan qui
  // nomme des chemins d'ailleurs — projet copié avec son abri, plan édité, chemins absolus périmés —
  // ferait donc effacer ailleurs. Chaque entrée doit SORTIR DE CET ABRI et RENTRER DANS CE PROJET ;
  // une seule qui déborde et le plan entier est traité comme illisible : on refuse, on ne touche à rien.
  const sous = (racine, p) => { const r = path.relative(racine, p); return r !== '' && !r.startsWith('..') && !path.isAbsolute(r); };
  let ecartes = null;
  try {
    const plan = JSON.parse(fs.readFileSync(path.join(abri, FICHIER_PLAN), 'utf8'));
    if (Array.isArray(plan?.ecartes) && plan.ecartes.every((e) => e?.nom && sous(abri, e.abri) && sous(projectDir, e.origine) && !sous(abri, e.origine))) ecartes = plan.ecartes;
  } catch { /* plan absent, illisible ou débordant : traité comme un refus, jamais comme une permission */ }
  const nommer = (raison) => [
    `${DOSSIER_ABRI}/ : ${raison}.`,
    `Tes skills design du kit y sont peut-être encore — le kit n'y touche pas : ${contenuAbri(abri).join(', ') || '(vide)'}`,
  ].join(' ');
  if (!ecartes) return { repris: [], refus: nommer(`un run précédent a été interrompu et son \`${FICHIER_PLAN}\` est absent, illisible, ou nomme des chemins hors de ce projet`) };
  const { remis, perdus } = restaurerSkillsDesign({ abri, ecartes });
  // Des NOMS, uniques : chaque skill a deux chemins (le lien natif et le magasin `.agents/`), et le
  // rapport parle de skills. La même forme dans les trois issues — un appelant ne doit pas avoir à
  // deviner laquelle il tient pour savoir s'il faut dédoublonner.
  const repris = [...new Set(remis)];
  if (perdus.length) return { repris, refus: nommer('un run précédent a été interrompu et je n\'ai pas pu tout remettre en place') };
  const restant = contenuAbri(abri);
  if (restant.length) return { repris, refus: nommer('un run précédent a laissé un fichier que son plan ne mentionne pas') };
  return { repris, refus: null };
}

export function ecarterSkillsDesign(projectDir, noms = DESIGN_SKILL_NAMES) {
  const abri = path.join(projectDir, DOSSIER_ABRI);
  // ⛔ ON NE SUPPRIME PLUS UN ABRI TROUVÉ : on le REPREND, ou on refuse de partir. Voir ci-dessus.
  const reprise = reprendreAbri(projectDir);
  if (reprise.refus) return { abri, ecartes: [], noms: [], repris: reprise.repris, refus: reprise.refus };
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
      // Le plan est réécrit APRÈS chaque déplacement, jamais avant : une entrée annoncée mais non
      // déplacée ferait échouer la reprise sur un fichier qui n'a jamais bougé. Et une entrée
      // déplacée mais pas encore écrite est rattrapée par `contenuAbri` — qui fait refuser plutôt
      // que supprimer. Les deux moitiés de la fenêtre penchent donc du côté qui ne perd rien.
      fs.writeFileSync(path.join(abri, FICHIER_PLAN), `${JSON.stringify({ ecartes }, null, 2)}\n`);
    }
  }
  return { abri, ecartes, noms: [...new Set(ecartes.map((e) => e.nom))], repris: reprise.repris, refus: null };
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
    // ⛔ ON NE DÉTRUIT PAS `origine` AVANT D'AVOIR DE QUOI LE REMPLACER. Un plan de run interrompu
    // peut nommer une entrée DÉJÀ rentrée : la reprise en remet 4, bute sur un reste hors plan et
    // REFUSE — le plan cite toujours ces 4, dont les chemins d'abri n'existent plus. Au run suivant,
    // l'ordre « rmSync(origine) puis renameSync(abri) » supprimait les 4 skills REVENUS pour échouer
    // à la ligne d'après : la perte définitive que ce module ferme, rouverte par la porte de la
    // reprise. Mesuré sur deux runs consécutifs, sans une seule manipulation à la main.
    if (!existe(e.abri)) {
      if (existe(e.origine)) continue; // déjà à sa place : rien à remettre — et surtout rien à casser
      perdus.push(e); // ni à l'abri ni chez lui : une perte, et on la nomme plutôt que de la taire
      continue;
    }
    try {
      fs.rmSync(e.origine, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(e.origine), { recursive: true });
      fs.renameSync(e.abri, e.origine);
      remis.push(e.nom);
    } catch { perdus.push(e); } // l'ENTRÉE entière : sans `origine`, « déplace-le à la main » n'est pas actionnable
  }
  // ⛔ L'ABRI NE DISPARAÎT QUE S'IL EST VIDE, plan mis à part. Un `<i>/<nom>` que le plan ne
  // mentionne pas (interruption entre le déplacement et l'écriture du plan) serait sinon supprimé
  // sans que personne ne l'ait jamais nommé.
  if (abri && !perdus.length && !contenuAbri(abri).length) fs.rmSync(abri, { recursive: true, force: true });
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
    return { lance: false, etapes: [], proteges: [], remis: [], perdus: [], repris: [], echec: `${assistant} n'est pas dans l'AGENT_FOLDER_MAP d'${AUTOSKILLS.commande}` };
  }
  const abri = ecarterSkillsDesign(projectDir, noms ?? DESIGN_SKILL_NAMES);
  // Un abri qu'on n'a pas su reprendre : on ne lance RIEN. Relancer par-dessus écarterait une
  // seconde fois des skills déjà absents et empilerait deux restes l'un sur l'autre.
  if (abri.refus) return { lance: false, etapes: [], proteges: [], remis: [], perdus: [], repris: abri.repris, echec: abri.refus };
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
  const { remis, perdus } = restaurerSkillsDesign(abri);
  // ⛔ ON COMPTE CE QUI EST REVENU, PAS CE QUI EST SORTI. `proteges` (les skills ÉCARTÉS) servait
  // de compte au rapport : avec les 4 restaurations en échec, il imprimait « tes 4 skills design
  // ont été remis en place » ET « NON remis en place : … », sur un `.claude/skills` vide. La ligne
  // ✅ mentait exactement là où elle devait alerter. Un nom qui figure dans `perdus` — donc dont
  // l'un des deux chemins n'est pas rentré — n'est pas « remis », même si l'autre l'est.
  const perdusNoms = new Set(perdus.map((e) => e.nom));
  const remisNoms = [...new Set(remis)].filter((n) => !perdusNoms.has(n));
  // Et `repris` passe par le MÊME filtre : un skill récupéré d'un run interrompu au démarrage, puis
  // reperdu à la restauration finale, n'est pas « récupéré » — l'annoncer en ✅ au-dessus du ❌ qui
  // le dit coincé serait le même mensonge, une ligne plus bas.
  const reprisNoms = [...new Set(abri.repris ?? [])].filter((n) => !perdusNoms.has(n));
  return { lance: !echec, etapes, proteges: abri.noms, remis: remisNoms, perdus, repris: reprisNoms, ...(echec ? { echec } : {}) };
}

// ── LE RAPPORT ────────────────────────────────────────────────────────────────────────────────
//
// ⛔ POURQUOI CES TROIS LIGNES SONT ICI ET PLUS DANS `setup.mjs`. Elles vivaient dans une branche
// qu'on n'atteint que par un `--adopt` INTERACTIF où l'utilisateur a dit oui à un outil tiers :
// aucun garde ne pouvait les LIRE. C'est exactement là que le ✅ s'est mis à imprimer « tes 4
// skills design ont été remis en place » juste au-dessus du ❌ « NON remis en place », sur un
// `.claude/skills` vide. Une ligne que personne ne peut mesurer ment sans qu'on le voie ; celle-ci
// est pure, et `setup.mjs` ne fait plus que verser les trois bacs.
export function rapportAutoskills(a, projectDir) {
  const done = [], skipped = [], failed = [];
  // Le rapport re-nomme l'auteur et la licence : la ligne ✅ est la trace qui restera à l'écran,
  // et elle ne doit pas laisser croire que ces skills viennent du kit.
  // ⛔ ON COMPTE `remis`, PAS `proteges` : ce qui est REVENU, pas ce qui est SORTI. Compter les
  // écartés faisait imprimer « tes 4 skills design ont été remis en place » juste au-dessus du ❌
  // qui disait le contraire — la classe de bug du commit 0a19a4f, où le rapport donnait « déjà
  // présent » comme raison d'un `--force` écarté.
  if (a.lance) done.push(`skills tiers : ${AUTOSKILLS.commande} (${AUTOSKILLS.auteur}, ${AUTOSKILLS.licence}) — NON relus par le kit${a.remis.length ? ` ; tes ${a.remis.length} skills design du kit ont été remis en place` : ''}`);
  else skipped.push({ name: `skills tiers : ${AUTOSKILLS.commande}`, reason: `non lancé (${a.echec}) — optionnel, rien n'a été installé` });
  // Un run précédent interrompu laisse ses skills à l'abri ; celui-ci les a récupérés. Le dire,
  // parce que l'utilisateur les avait peut-être vus disparaître de `.claude/skills/`.
  if (a.repris?.length) done.push(`skills design récupérés d'un run interrompu : ${[...new Set(a.repris)].join(', ')}`);
  // Un skill du kit que la restauration n'a pas pu remettre n'existe plus qu'à l'abri : il est
  // toujours là, mais pas à sa place. Le taire laisserait `/doctor` item 11 le déclarer absent sans
  // que personne sache où il est passé — donc ❌. Et le message doit être ACTIONNABLE : l'abri est
  // `<i>/<nom>` avec `<i>` un compteur, donc « il est dans l'abri » ne suffit pas — pour
  // `frontend-design` il y a DEUX entrées, et rien dans leur nom ne dit laquelle va où.
  if (a.perdus?.length) failed.push(`skills design NON remis en place — déplace-les à la main : ${a.perdus.map((e) => `${path.relative(projectDir, e.abri)} → ${path.relative(projectDir, e.origine)}`).join(' ; ')}`);
  return { done, skipped, failed };
}
