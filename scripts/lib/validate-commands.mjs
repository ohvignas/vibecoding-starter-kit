// scripts/lib/validate-commands.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DESIGN_SKILL_NAMES, STACKS } from './matrix.mjs';
import { cheminRunbook, dossierEtapes } from './commands-list.mjs';

// Les MÊMES chemins que ceux du scaffold, du `--refresh` et du plugin Cursor (`commands-list.mjs`).
// Le validateur les portait en littéral : il aurait pu exiger des étapes dans un dossier que
// personne ne livre — vert au dépôt, absent chez l'utilisateur.
const ENTREE = cheminRunbook('new-project');
const ETAPES_DIR = dossierEtapes('new-project');
const ENTREE_NF = cheminRunbook('new-feature');
const ETAPES_DIR_NF = dossierEtapes('new-feature');
const ENTREE_IV = cheminRunbook('init-vibecoding');
const ETAPES_DIR_IV = dossierEtapes('init-vibecoding');

// `/new-project` est découpé en ÉTAPES : une entrée courte, puis un fichier par étape dans
// `templates/commands/new-project/`. Les noms sont FIGÉS ici — `--refresh` n'efface jamais
// (`refresh.mjs`), une renumérotation ultérieure laisserait des orphelins à vie chez l'utilisateur.
const ETAPE = {
  cadrage: '01-cadrage.md',
  prd: '02-prd.md',
  archi: '03-stack-et-architecture.md',
  arbo: '04-arborescence.md',
  design: '05-design-maquette.md',
  roadmap: '06-roadmap.md',
  scaffold: '07-scaffold.md',
};

// ── ANCRAGE, et pourquoi surtout pas une concaténation ────────────────────────────────────────
// La tentation, au découpage, est de recoller les étapes en un seul texte et de garder les
// contrôles tels quels. Ce serait les AFFAIBLIR : `(^|\s)stack($|\s)` trouverait son mot dans
// n'importe laquelle des étapes — y compris celle qui ne parle pas de stack — donc le contrôle
// deviendrait PLUS facile à satisfaire qu'avec le fichier unique d'aujourd'hui. L'inverse du but.
// Chaque exigence est donc ancrée à SON fichier : le sujet « stack » se prouve dans l'étape stack,
// la sortie `docs/ROADMAP.md` dans l'étape roadmap, `@shadcnblocks` dans l'étape scaffold.
//
// COMMENT ON TOLÈRE LE DOSSIER VIDE SANS VIDER LE CONTRÔLE DE SON SENS — le dossier d'étapes est
// dans l'un de deux états, jamais entre les deux :
//   · ABSENT ou VIDE (avant le découpage) → chaque exigence retombe sur l'entrée `new-project.md`.
//     C'est mot pour mot le contrôle d'avant : ni plus faible, ni plus fort.
//   · PEUPLÉ (après) → chaque exigence est cherchée dans SON étape, et une étape que cette carte
//     nomme mais qui n'est pas sur le disque est une ERREUR (`étape manquante : …`).
// Autrement dit : l'absence n'est tolérée qu'EN BLOC. Un dossier à moitié découpé, ou dont une
// étape a été renommée, ne retombe jamais en silence sur l'entrée — c'est ce repli silencieux,
// et lui seul, qui rendrait la carte vide de sens.
//
// TROIS runbooks sont découpés, et les trois s'ancrent de cette façon : le mécanisme vit donc ici,
// une fois. Ce qui reste propre à chacun, c'est SA carte « exigence → étape », plus bas.
function ancrage(root, entree, etapesDir, errors) {
  const dir = path.join(root, etapesDir);
  // Le filtre `.md` n'est pas cosmétique : sans lui un sous-dossier partirait dans `readFileSync`
  // → `EISDIR`. Un `.gitkeep` (git ne suit pas un dossier vide) ne compte pas pour une étape.
  const surDisque = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.endsWith('.md')).sort() : [];
  const decoupe = surDisque.length > 0;

  const cache = new Map();
  const lire = (rel) => {
    if (!cache.has(rel)) cache.set(rel, fs.readFileSync(path.join(root, rel), 'utf8'));
    return cache.get(rel);
  };
  const etapesAbsentes = new Set();
  const ou = (etape) => {
    if (!decoupe) return entree;
    if (surDisque.includes(etape)) return `${etapesDir}/${etape}`;
    etapesAbsentes.add(etape);
    return null; // signalé une fois par `fin()` — jamais un repli silencieux sur l'entrée
  };
  return {
    // Une exigence, cherchée dans l'étape qui porte le sujet (ou dans l'entrée, dossier vide).
    exige(etape, satisfait, message) {
      const f = ou(etape);
      if (f !== null && !satisfait(lire(f))) errors.push(message(f));
    },
    // Une exigence qui reste dans l'ENTRÉE quoi qu'il arrive : le cadre, l'argument, le sommaire.
    exigeEntree(satisfait, message) {
      if (!satisfait(lire(entree))) errors.push(message(entree));
    },
    // Un INTERDIT porte sur TOUS les fichiers : une référence morte réapparue dans une étape
    // atteint le même lecteur, et un contrôle négatif qui ne lirait que l'entrée resterait vert.
    interdit(motif, quoi) {
      for (const f of [entree, ...surDisque.map((e) => `${etapesDir}/${e}`)]) {
        if (motif.test(lire(f))) errors.push(`${f} : référence morte — ${quoi}`);
      }
    },
    fin() {
      for (const e of [...etapesAbsentes].sort()) errors.push(`étape manquante : ${etapesDir}/${e}`);
    },
  };
}

// Le SUJET de chaque étape : le mot qui prouve qu'elle traite bien ce qu'elle annonce. Ils
// s'appelaient « phases » — un vocabulaire que le kit n'écrit plus nulle part depuis que les
// étapes se nomment par leur fichier.
const SUJETS = [
  ['Brainstorm', ETAPE.cadrage], ['PRD', ETAPE.prd], ['stack', ETAPE.archi],
  ['architecture', ETAPE.archi], ['Design', ETAPE.design], ['Roadmap', ETAPE.roadmap],
  ['Mise en place', ETAPE.scaffold],
];
const OUTPUTS = [
  ['docs/PRD.md', ETAPE.prd], ['docs/ROADMAP.md', ETAPE.roadmap], ['docs/design.md', ETAPE.design],
  ['docs/ARCHITECTURE.md', ETAPE.archi], ['docs/memory', ETAPE.scaffold],
  // L'arborescence n'a pas de fichier à elle : elle s'écrit dans `docs/PRD.md`, la section que le
  // template porte pour elle. Deux étapes écrivent donc dans le même document — d'où deux entrées
  // ici, chacune ancrée à l'étape qui écrit. Sans celle-ci, l'étape pourrait cesser de dire OÙ
  // elle range sa sortie, et la seule chose qui relie les `UJ-*` aux écrans partirait dans le vide.
  ['docs/PRD.md', ETAPE.arbo],
];
// …et le runbook doit CITER les templates déplacés par le chemin qu'ils ont dans le projet généré :
// un template que personne n'ouvre ne vaut pas mieux qu'un template supprimé. Ancrés eux aussi :
// c'est l'étape qui S'EN SERT qui doit le citer, pas le sommaire d'entrée.
const RENVOIS = [['docs/templates/PRD.md', ETAPE.prd], ['docs/templates/architecture.md', ETAPE.archi]];
// Marqueurs de profondeur : ils prouvent que le kit porte de VRAIS templates, pas un runbook
// « one-liner ». Les templates PRD et architecture ont quitté le runbook (Lot D9 : new-project.md
// pesait 197 lignes sur les 458 du dossier `templates/commands/`, soit 43 % à lui seul) — le
// contrôle les SUIT dans leur nouveau fichier au lieu de disparaître avec le texte déplacé. Ceux
// du runbook suivent de la même façon le texte qui part en étape.
const DEPTH_RUNBOOK = [
  ['EXPERIENCE.md', ETAPE.design], ['maquette', ETAPE.design], ['index.html', ETAPE.design],
  ['ui.shadcn.com/create', ETAPE.design], ['@shadcnblocks', ETAPE.scaffold],
  // L'arborescence est le PONT entre les parcours `UJ-*` du PRD et les écrans que l'étape design
  // dessine : sans elle, chacun invente sa liste d'écrans. Ces trois marqueurs sont ce qui la
  // distingue d'un simple sommaire — d'où elle est DÉRIVÉE (`UJ-*`), comment on circule dedans
  // (navigation) et comment chaque page s'adresse (URL). Une étape qui les perd redevient une
  // liste de titres, et l'étape design n'a plus rien à dessiner d'exhaustif.
  ['UJ-', ETAPE.arbo], ['navigation', ETAPE.arbo], ['URL', ETAPE.arbo],
];
const DEPTH = {
  // Trois manques mesurés dans le template PRD, ajoutés au TRONC COMMUN (pas à un cluster) :
  //  · « Problème » — 0 occurrence avant. « Vision : quoi, pour qui, pourquoi ça compte » le
  //    frôle sans le nommer : un débutant décrivait sa solution sans avoir énoncé le problème.
  //  · « Objectifs commerciaux » — l'argent n'existait que dans le cluster « entreprise » (ROI),
  //    donc jamais pour un projet grand public ou perso, qui en a autant besoin.
  //  · « Arborescence » — 0 occurrence dans PRD.md, architecture.md ET le runbook : le pont
  //    entre les `UJ-*` et les écrans n'était écrit nulle part.
  'templates/prd/PRD.md': ['Métriques de succès', 'Non-objectifs', 'Index des hypothèses', 'Problème', 'Objectifs commerciaux', 'Arborescence'],
  'templates/specs/architecture.md': ['Invariants', 'Graine structurelle'],
};
const AGENTS_TEMPLATES = ['templates/agents/loop-section.md', 'templates/agents/design-rule.md', 'templates/agents/subagents-rule.md', 'templates/agents/verify-rule.md', 'templates/agents/reality-rule.md', 'templates/agents/proof-rule.md', 'templates/agents/secrets-cost-rule.md', 'templates/agents/css-maquette-rule.md'];

export function validateNewProjectCommand(root) {
  const errors = [];
  if (!fs.existsSync(path.join(root, ENTREE))) { errors.push(`manquant : ${ENTREE}`); return errors; }
  const { exige, fin } = ancrage(root, ENTREE, ETAPES_DIR, errors);

  for (const [s, e] of SUJETS) exige(e, (t) => new RegExp(`(^|\\s)${s}($|\\s)`).test(t), (f) => `${f} : sujet manquant « ${s} »`);
  for (const [o, e] of OUTPUTS) exige(e, (t) => t.includes(o), (f) => `${f} : sortie non référencée « ${o} »`);
  for (const [r, e] of RENVOIS) exige(e, (t) => t.includes(r), (f) => `${f} : template déplacé jamais cité « ${r} »`);
  for (const [d, e] of DEPTH_RUNBOOK) exige(e, (t) => t.includes(d), (f) => `${f} : template pas assez détaillé, manque « ${d} »`);
  fin();

  for (const [f, marqueurs] of Object.entries(DEPTH)) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) { errors.push(`template manquant : ${f}`); continue; }
    const contenu = fs.readFileSync(p, 'utf8');
    for (const d of marqueurs) if (!contenu.includes(d)) errors.push(`${f} : template pas assez détaillé, manque « ${d} »`);
  }
  for (const t of AGENTS_TEMPLATES) if (!fs.existsSync(path.join(root, t))) errors.push(`template manquant : ${t}`);
  return errors;
}

export function validateEditDesignCommand(root) {
  const errors = [];
  const rb = path.join(root, 'templates/commands/edit-design.md');
  if (!fs.existsSync(rb)) { errors.push('manquant : templates/commands/edit-design.md'); return errors; }
  const txt = fs.readFileSync(rb, 'utf8');
  // La liste vient de matrix.mjs (DESIGN_SKILL_NAMES) : le validateur en portait une copie, donc
  // il aurait continué à valider les 4 anciens noms après un changement de la source.
  for (const s of DESIGN_SKILL_NAMES) if (!txt.includes(s)) errors.push(`edit-design : skill non référencé « ${s} »`);
  if (!txt.includes('design.md')) errors.push('edit-design : design.md non référencé');
  return errors;
}

// `/new-feature` est découpé lui aussi : les dix temps de la boucle sont regroupés en CINQ
// fichiers, un par gate réel (cadrer · construire · prouver · livrer, plus le préflight). Noms
// FIGÉS ici — `refresh.mjs` n'efface jamais, une renumérotation laisserait des orphelins à vie.
const ETAPE_NF = {
  preflight: '00-preflight.md',
  spec: '01-spec-de-feature.md',
  execution: '02-plan-et-execution.md',
  verification: '03-verification.md',
  livraison: '04-livraison.md',
};

// Chaque exigence dans le fichier qui la porte. Concaténer les étapes rendrait le contrôle PLUS
// facile à satisfaire qu'avec le fichier d'un bloc : `git commit` trouverait son mot n'importe où,
// y compris dans l'étape qui ne parle pas de livraison.
// `git commit` / `gh pr create` / `--base main` remplacent l'ancien duo (plugin de commit +
// branche `dev`) : ce plugin n'est jamais installé par le kit, et le scaffold ne crée que `main`.
// `dev` était un contrôle vide — la chaîne apparaît dans « subagent-driven-development ». Son
// remplaçant `main` l'était tout autant : « Gates humains » le satisfaisait, donc n'importe quel
// runbook le satisfaisait, y compris un qui ne nomme aucune branche. On exige donc la chaîne
// OPÉRANTE, qui ne peut pas apparaître par accident dans une phrase française : `--base`.
// POURQUOI PLUS `--base main` MAIS `--base` TOUT COURT : la cible de la PR ne peut plus être
// nommée d'avance. Un dépôt que le kit n'a pas créé a sa propre topologie — l'utilisateur qui
// travaille sur une branche d'intégration branchait depuis elle et ouvrait sa PR vers `main` :
// strictement pire que rien. La base se relève au préflight et la PR y revient. La chaîne reste
// opérante (aucune phrase française ne contient `--base`), et l'interdit plus bas empêche que la
// dérivation soit contournée en réécrivant une cible en dur.
const ETAPES_NF = [
  ['worktree', ETAPE_NF.preflight],
  ['brainstorming', ETAPE_NF.spec],
  ['writing-plans', ETAPE_NF.execution],
  ['subagent-driven-development', ETAPE_NF.execution],
  ['code-review', ETAPE_NF.verification],
  ['Règle de vérification', ETAPE_NF.verification],
  ['security-review', ETAPE_NF.verification],
  ['git commit', ETAPE_NF.livraison],
  ['gh pr create', ETAPE_NF.livraison],
  ['gh run watch', ETAPE_NF.livraison],
  ['finishing-a-development-branch', ETAPE_NF.livraison],
  ['--base', ETAPE_NF.livraison],
];
// Profondeur : la spec de feature (story + critères d'acceptation) doit être présente, pas un
// simple « brainstorm » — et elle se prouve dans l'étape qui la produit.
const DEPTH_NF = [["Critères d'acceptation", ETAPE_NF.spec], ['En tant que', ETAPE_NF.spec], ['Périmètre', ETAPE_NF.spec]];

export function validateNewFeatureCommand(root) {
  const errors = [];
  if (!fs.existsSync(path.join(root, ENTREE_NF))) { errors.push(`manquant : ${ENTREE_NF}`); return errors; }
  const { exige, exigeEntree, interdit, fin } = ancrage(root, ENTREE_NF, ETAPES_DIR_NF, errors);

  for (const [s, e] of ETAPES_NF) exige(e, (t) => t.includes(s), (f) => `${f} : étape non référencée « ${s} »`);
  for (const [d, e] of DEPTH_NF) exige(e, (t) => t.includes(d), (f) => `${f} : spec pas assez détaillée, manque « ${d} »`);
  // Le CADRE reste dans l'entrée : c'est le fichier chargé comme commande, celui qui dit à quelle
  // boucle d'`AGENTS.md` les étapes appartiennent. Une étape seule ne peut pas porter ce renvoi.
  //
  // ON EXIGE LA DESTINATION, PLUS LA SOURCE. Cette règle réclamait la chaîne `loop-section.md`,
  // et l'entrée l'a donc portée pendant tout le chantier sous la forme « (issue de
  // `templates/agents/loop-section.md`) ». Or `templates/` est un dossier du KIT : il n'existe
  // pas dans le projet livré. Le garde obligeait donc le runbook à renvoyer le débutant vers un
  // dossier absent de chez lui — un garde qui FABRIQUE le défaut qu'il croit prévenir.
  // La propriété visée, elle, est bonne, et se dit sans citer aucune source : l'entrée nomme la
  // BOUCLE et le fichier que l'utilisateur peut vraiment ouvrir.
  exigeEntree((t) => /boucle/i.test(t) && /AGENTS\.md/.test(t),
    (f) => `${f} : ne dit pas à quelle boucle de l'AGENTS.md ses étapes appartiennent`);
  // Et la chaîne reste prouvée de bout en bout — mais ICI, dans le test, pas dans le fichier
  // livré : la boucle que l'entrée annonce est bien celle que `loop-section.md` rend dans
  // l'`AGENTS.md` du projet. Sans ce second maillon, l'entrée pourrait renvoyer à une boucle que
  // rien n'écrit jamais.
  const source = path.join(root, 'templates/agents/loop-section.md');
  if (!fs.existsSync(source) || !/boucle/i.test(fs.readFileSync(source, 'utf8'))) {
    errors.push('templates/agents/loop-section.md : la boucle annoncée par l\'entrée n\'est plus rendue dans AGENTS.md');
  }
  // Interdits : le validateur ne se contente pas d'exiger le bon, il refuse le faux — partout.
  interdit(/commit-commands/, 'plugin de commit jamais installé par le kit');
  interdit(/`dev`/, 'branche `dev` : le scaffold ne crée que `main`');
  // La contrepartie de `--base` : exiger le drapeau sans interdire la cible figée laisserait
  // réécrire `--base main` demain, et l'utilisateur brancherait depuis sa base pour ouvrir la PR
  // ailleurs — la faute exacte que la dérivation existe pour empêcher.
  interdit(/--base (main|master)\b/, 'cible de PR en dur : elle doit être la base relevée au préflight');
  fin();
  return errors;
}

// `/init-vibecoding` déclarait déjà lui-même ses cinq « Étape 0 » à « Étape 4 » : le découpage
// reprend exactement ces frontières, un fichier par étape, même numéro. Noms FIGÉS.
const ETAPE_IV = {
  etat: '00-detecter-l-etat.md',
  questions: '01-les-2-questions.md',
  scaffold: '02-scaffold.md',
  onboarding: '03-onboarding.md',
  lancement: '04-verifier-et-lancer.md',
};
// Ce que ce runbook doit dire, et OÙ. Rien ici n'était sous contrôle avant le découpage au-delà de
// cinq chaînes cherchées dans le fichier entier ; les ancrer, c'est resserrer, pas relâcher.
const ETAPES_IV = [
  // L'état se détecte sur CE fichier-là, et la mise à jour se montre avant de s'appliquer.
  ['.vibecoding.json', ETAPE_IV.etat],
  ['--dry-run', ETAPE_IV.etat],
  ['--refresh', ETAPE_IV.etat],
  // La commande de scaffold, avec ses valeurs littérales : c'est elle que G3 rejoue.
  ['npx -y create-vibecoding-kit@latest --stack', ETAPE_IV.scaffold],
  ['<assistant> =', ETAPE_IV.scaffold],
  // L'onboarding déroule LE fichier d'install, pas un doc inventé.
  ['docs/A-FAIRE.md', ETAPE_IV.onboarding],
  // Et la sortie : le diagnostic, puis la commande qui enchaîne.
  ['/doctor', ETAPE_IV.lancement],
  ['/new-project', ETAPE_IV.lancement],
];

export function validateInitCommand(root) {
  const errors = [];
  if (!fs.existsSync(path.join(root, ENTREE_IV))) { errors.push(`manquant : ${ENTREE_IV}`); return errors; }
  const { exige, exigeEntree, fin } = ancrage(root, ENTREE_IV, ETAPES_DIR_IV, errors);

  for (const [s, e] of ETAPES_IV) exige(e, (t) => t.includes(s), (f) => `${f} : consigne non référencée « ${s} »`);
  // Les 4 stacks sont LUES dans matrix.mjs (source de vérité de ce que le CLI accepte) : une stack
  // ajoutée sans être proposée à l'utilisateur ferait échouer ce test au lieu de passer inaperçue.
  for (const s of Object.keys(STACKS)) {
    exige(ETAPE_IV.questions, (t) => t.includes(`**${s}**`), (f) => `${f} : la stack « ${s} » n'est pas proposée à l'utilisateur`);
  }
  // Le CADRE — qui parle, comment — reste dans l'entrée : chaque étape s'y réfère, et c'est le
  // seul fichier que l'assistant charge comme commande.
  exigeEntree((t) => t.includes('## Règles'), (f) => `${f} : les règles de conduite transverses ont quitté l'entrée`);
  fin();
  return errors;
}

export function validateMemoryTemplates(root) {
  const errors = [];
  const mem = ['index', 'gotchas', 'conventions', 'decisions', 'archive'];
  for (const m of mem) if (!fs.existsSync(path.join(root, `templates/memory/${m}.md`))) errors.push(`mémoire : fichier manquant « templates/memory/${m}.md »`);
  const rulesPath = path.join(root, 'templates/agents/memory-rules.md');
  if (!fs.existsSync(rulesPath)) { errors.push('mémoire : manquant templates/agents/memory-rules.md'); return errors; }
  const txt = fs.readFileSync(rulesPath, 'utf8');
  for (const r of ['index', 'gotchas', 'conventions', 'decisions', 'consolidate-memory']) if (!txt.includes(r)) errors.push(`memory-rules : ne référence pas « ${r} »`);
  return errors;
}

export function validateExtras(root) {
  const errors = [];
  const files = [
    'templates/cursor/hooks.json', 'templates/cursor/hooks/inject-memory.mjs', 'templates/cursor/hooks/log-edit.mjs', 'templates/cursor/cursorignore',
    'templates/security/secrets.yml',
    'templates/env/saas.env.example', 'templates/env/mobile.env.example', 'templates/env/desktop.env.example', 'templates/env/vitrine.env.example',
    'templates/ci/saas.yml', 'templates/ci/mobile.yml', 'templates/ci/desktop.yml', 'templates/ci/vitrine.yml',
    'templates/agents/subagents/code-reviewer.md', 'templates/agents/subagents/security-reviewer.md', 'templates/agents/subagents/test-runner.md',
    'templates/agents/subagents/verificateur.md',
    'templates/agents/subagents/critique-produit.md', 'templates/agents/subagents/critique-donnees.md', 'templates/agents/subagents/critique-ux.md',
    'templates/gitignore/saas.gitignore', 'templates/gitignore/mobile.gitignore', 'templates/gitignore/desktop.gitignore', 'templates/gitignore/vitrine.gitignore',
    'templates/journal/JOURNAL.md', 'templates/journal/state.yaml', 'templates/journal/inventaire.md',
    'templates/prd/PRD.md', 'templates/specs/architecture.md',
    'templates/commands/doctor.md',
    'templates/hooks/pre-commit',
    'templates/examples/saas.md', 'templates/examples/mobile.md', 'templates/examples/desktop.md', 'templates/examples/vitrine.md',
  ];
  for (const f of files) if (!fs.existsSync(path.join(root, f))) errors.push(`extra manquant : ${f}`);
  return errors;
}

export function validateBuildCommand(root) {
  const errors = [];
  const rb = path.join(root, 'templates/commands/build.md');
  if (!fs.existsSync(rb)) { errors.push('manquant : templates/commands/build.md'); return errors; }
  const txt = fs.readFileSync(rb, 'utf8');
  for (const s of ['docs/ROADMAP.md', 'subagent-driven-development', 'docs/RUN.md', 'Ce que tu vois', 'writing-plans']) {
    if (!txt.includes(s)) errors.push(`build : ne référence pas « ${s} »`);
  }
  return errors;
}
