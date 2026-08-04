// scripts/lib/validate-commands.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DESIGN_SKILL_NAMES } from './matrix.mjs';

const ENTREE = 'templates/commands/new-project.md';
const ETAPES_DIR = 'templates/commands/new-project';

// `/new-project` est découpé en ÉTAPES : une entrée courte, puis un fichier par étape dans
// `templates/commands/new-project/`. Les noms sont FIGÉS ici — `--refresh` n'efface jamais
// (`refresh.mjs`), une renumérotation ultérieure laisserait des orphelins à vie chez l'utilisateur.
const ETAPE = {
  cadrage: '01-cadrage.md',
  prd: '02-prd.md',
  archi: '03-stack-et-architecture.md',
  design: '05-design-maquette.md',
  roadmap: '06-roadmap.md',
  scaffold: '07-scaffold.md',
};

// ── ANCRAGE, et pourquoi surtout pas une concaténation ────────────────────────────────────────
// La tentation, au découpage, est de recoller les étapes en un seul texte et de garder les
// contrôles tels quels. Ce serait les AFFAIBLIR : `(^|\s)stack($|\s)` trouverait son mot dans
// n'importe laquelle des étapes — y compris celle qui ne parle pas de stack — donc le contrôle
// deviendrait PLUS facile à satisfaire qu'avec le fichier unique d'aujourd'hui. L'inverse du but.
// Chaque exigence est donc ancrée à SON fichier : la phase « stack » se prouve dans l'étape stack,
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
const PHASES = [
  ['Brainstorm', ETAPE.cadrage], ['PRD', ETAPE.prd], ['stack', ETAPE.archi],
  ['architecture', ETAPE.archi], ['Design', ETAPE.design], ['Roadmap', ETAPE.roadmap],
  ['Mise en place', ETAPE.scaffold],
];
const OUTPUTS = [
  ['docs/PRD.md', ETAPE.prd], ['docs/ROADMAP.md', ETAPE.roadmap], ['docs/design.md', ETAPE.design],
  ['docs/ARCHITECTURE.md', ETAPE.archi], ['docs/memory', ETAPE.scaffold],
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
];
const DEPTH = {
  'templates/prd/PRD.md': ['Métriques de succès', 'Non-objectifs', 'Index des hypothèses'],
  'templates/specs/architecture.md': ['Invariants', 'Graine structurelle'],
};
const AGENTS_TEMPLATES = ['templates/agents/loop-section.md', 'templates/agents/design-rule.md', 'templates/agents/subagents-rule.md', 'templates/agents/verify-rule.md', 'templates/agents/reality-rule.md', 'templates/agents/proof-rule.md', 'templates/agents/secrets-cost-rule.md', 'templates/agents/css-maquette-rule.md'];

export function validateNewProjectCommand(root) {
  const errors = [];
  if (!fs.existsSync(path.join(root, ENTREE))) { errors.push(`manquant : ${ENTREE}`); return errors; }

  const dir = path.join(root, ETAPES_DIR);
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
    if (!decoupe) return ENTREE;
    if (surDisque.includes(etape)) return `${ETAPES_DIR}/${etape}`;
    etapesAbsentes.add(etape);
    return null; // signalé une fois plus bas — jamais un repli silencieux sur l'entrée
  };
  const exige = (etape, satisfait, message) => {
    const f = ou(etape);
    if (f !== null && !satisfait(lire(f))) errors.push(message(f));
  };

  for (const [p, e] of PHASES) exige(e, (t) => new RegExp(`(^|\\s)${p}($|\\s)`).test(t), (f) => `${f} : phase manquante « ${p} »`);
  for (const [o, e] of OUTPUTS) exige(e, (t) => t.includes(o), (f) => `${f} : sortie non référencée « ${o} »`);
  for (const [r, e] of RENVOIS) exige(e, (t) => t.includes(r), (f) => `${f} : template déplacé jamais cité « ${r} »`);
  for (const [d, e] of DEPTH_RUNBOOK) exige(e, (t) => t.includes(d), (f) => `${f} : template pas assez détaillé, manque « ${d} »`);
  for (const e of [...etapesAbsentes].sort()) errors.push(`étape manquante : ${ETAPES_DIR}/${e}`);

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

export function validateNewFeatureCommand(root) {
  const errors = [];
  const rb = path.join(root, 'templates/commands/new-feature.md');
  if (!fs.existsSync(rb)) { errors.push('manquant : templates/commands/new-feature.md'); return errors; }
  const txt = fs.readFileSync(rb, 'utf8');
  // `git commit` / `gh pr create` / `--base main` remplacent l'ancien duo (plugin de commit +
  // branche `dev`) : ce plugin n'est jamais installé par le kit, et le scaffold ne crée que `main`.
  // `dev` était un contrôle vide — la chaîne apparaît dans « subagent-driven-development ». Son
  // remplaçant `main` l'était tout autant : « Gates humains » (new-feature.md:5) le satisfait, donc
  // n'importe quel runbook le satisfaisait, y compris un qui ne nomme aucune branche. On exige
  // désormais la chaîne OPÉRANTE, celle qui fixe vraiment la cible du merge et qui ne peut pas
  // apparaître par accident dans une phrase française : `--base main` (l'argument de `gh pr create`).
  const steps = ['worktree', 'brainstorming', 'writing-plans', 'subagent-driven-development', 'code-review', 'Règle de vérification', 'security-review', 'git commit', 'gh pr create', 'gh run watch', 'finishing-a-development-branch', '--base main'];
  for (const s of steps) if (!txt.includes(s)) errors.push(`new-feature : étape non référencée « ${s} »`);
  if (!txt.includes('loop-section.md')) errors.push('new-feature : ne référence pas templates/agents/loop-section.md');
  // Interdits : le validateur ne se contente plus d'exiger le bon, il refuse le faux.
  for (const [motif, quoi] of [[/commit-commands/, 'plugin de commit jamais installé par le kit'], [/`dev`/, 'branche `dev` : le scaffold ne crée que `main`']]) {
    if (motif.test(txt)) errors.push(`new-feature : référence morte — ${quoi}`);
  }
  // Profondeur : la spec de feature (story + critères d'acceptation) doit être présente, pas un simple « brainstorm ».
  const depth = ["Critères d'acceptation", 'En tant que', 'Périmètre'];
  for (const d of depth) if (!txt.includes(d)) errors.push(`new-feature : spec pas assez détaillée, manque « ${d} »`);
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
