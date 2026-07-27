// scripts/lib/validate-commands.mjs
import fs from 'node:fs';
import path from 'node:path';

const PHASES = ['Brainstorm', 'PRD', 'stack', 'architecture', 'Design', 'Roadmap', 'Mise en place'];
const OUTPUTS = ['docs/PRD.md', 'docs/ROADMAP.md', 'docs/design.md', 'docs/superpowers/specs', 'docs/memory'];
const AGENTS_TEMPLATES = ['templates/agents/loop-section.md', 'templates/agents/design-rule.md', 'templates/agents/subagents-rule.md', 'templates/agents/verify-rule.md', 'templates/agents/reality-rule.md', 'templates/agents/proof-rule.md', 'templates/agents/secrets-cost-rule.md', 'templates/agents/css-maquette-rule.md'];
// Marqueurs de profondeur : ils prouvent que le kit porte de VRAIS templates, pas un runbook
// « one-liner ». Les templates PRD et architecture ont quitté le runbook (Lot D9 : new-project.md
// pesait 197 lignes sur les 458 du dossier `templates/commands/`, soit 43 % à lui seul) — le
// contrôle les SUIT dans leur nouveau fichier au lieu de disparaître avec le texte déplacé.
const DEPTH = {
  'templates/commands/new-project.md': ['EXPERIENCE.md', 'maquette', 'index.html', 'ui.shadcn.com/create', '@shadcnblocks'],
  'templates/prd/PRD.md': ['Métriques de succès', 'Non-objectifs', 'Index des hypothèses'],
  'templates/specs/architecture.md': ['Invariants', 'Graine structurelle'],
};
// …et le runbook doit CITER les templates déplacés par le chemin qu'ils ont dans le projet généré :
// un template que personne n'ouvre ne vaut pas mieux qu'un template supprimé.
const RENVOIS = ['docs/templates/PRD.md', 'docs/templates/architecture.md'];

export function validateNewProjectCommand(root) {
  const errors = [];
  const runbook = path.join(root, 'templates/commands/new-project.md');
  if (!fs.existsSync(runbook)) { errors.push('manquant : templates/commands/new-project.md'); return errors; }
  const txt = fs.readFileSync(runbook, 'utf8');
  for (const p of PHASES) if (!new RegExp(`(^|\\s)${p}($|\\s)`).test(txt)) errors.push(`runbook : phase manquante « ${p} »`);
  for (const o of OUTPUTS) if (!txt.includes(o)) errors.push(`runbook : sortie non référencée « ${o} »`);
  for (const r of RENVOIS) if (!txt.includes(r)) errors.push(`runbook : template déplacé jamais cité « ${r} »`);
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
  const skills = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'brand-guidelines'];
  for (const s of skills) if (!txt.includes(s)) errors.push(`edit-design : skill non référencé « ${s} »`);
  if (!txt.includes('design.md')) errors.push('edit-design : design.md non référencé');
  return errors;
}

export function validateNewFeatureCommand(root) {
  const errors = [];
  const rb = path.join(root, 'templates/commands/new-feature.md');
  if (!fs.existsSync(rb)) { errors.push('manquant : templates/commands/new-feature.md'); return errors; }
  const txt = fs.readFileSync(rb, 'utf8');
  // `git commit` / `gh pr create` / `main` remplacent l'ancien duo (plugin de commit + branche
  // `dev`) : ce plugin n'est jamais installé par le kit, et le scaffold ne crée que `main`.
  // `dev` était de toute façon un contrôle vide — la chaîne apparaît dans « subagent-driven-development ».
  const steps = ['worktree', 'brainstorming', 'writing-plans', 'subagent-driven-development', 'code-review', 'Règle de vérification', 'security-review', 'git commit', 'gh pr create', 'gh run watch', 'finishing-a-development-branch', 'main'];
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
