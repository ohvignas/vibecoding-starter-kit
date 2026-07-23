// scripts/lib/validate-commands.mjs
import fs from 'node:fs';
import path from 'node:path';

const PHASES = ['Brainstorm', 'PRD', 'stack', 'architecture', 'Design', 'Roadmap', 'Mise en place'];
const OUTPUTS = ['docs/PRD.md', 'docs/ROADMAP.md', 'docs/design.md', 'docs/superpowers/specs', 'docs/memory', 'docs/DREAM.md'];
const AGENTS_TEMPLATES = ['templates/agents/loop-section.md', 'templates/agents/design-rule.md', 'templates/agents/subagents-rule.md', 'templates/agents/verify-rule.md', 'templates/agents/secrets-cost-rule.md', 'templates/agents/css-maquette-rule.md'];
// Marqueurs de profondeur : prouvent que les templates PRD/archi/design sont bien intégrés (pas un runbook « one-liner »).
const DEPTH = ['Métriques de succès', 'Non-objectifs', 'Index des hypothèses', 'Invariants', 'Graine structurelle', 'EXPERIENCE.md', 'maquette', 'index.html', 'ui.shadcn.com/create', '@shadcnblocks'];

export function validateNewProjectCommand(root) {
  const errors = [];
  const runbook = path.join(root, 'templates/commands/new-project.md');
  if (!fs.existsSync(runbook)) { errors.push('manquant : templates/commands/new-project.md'); return errors; }
  const txt = fs.readFileSync(runbook, 'utf8');
  for (const p of PHASES) if (!new RegExp(`(^|\\s)${p}($|\\s)`).test(txt)) errors.push(`runbook : phase manquante « ${p} »`);
  for (const o of OUTPUTS) if (!txt.includes(o)) errors.push(`runbook : sortie non référencée « ${o} »`);
  for (const d of DEPTH) if (!txt.includes(d)) errors.push(`runbook : template pas assez détaillé, manque « ${d} »`);
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
  const steps = ['worktree', 'brainstorming', 'writing-plans', 'subagent-driven-development', 'code-review', '/verify', 'security-review', 'commit-push-pr', 'gh run watch', 'finishing-a-development-branch', 'dev'];
  for (const s of steps) if (!txt.includes(s)) errors.push(`new-feature : étape non référencée « ${s} »`);
  if (!txt.includes('loop-section.md')) errors.push('new-feature : ne référence pas templates/agents/loop-section.md');
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

export function validateDreamTemplate(root) {
  const errors = [];
  const wf = path.join(root, 'templates/dream/dream.yml');
  if (!fs.existsSync(wf)) errors.push('dream : manquant templates/dream/dream.yml');
  else {
    const txt = fs.readFileSync(wf, 'utf8');
    if (!txt.includes('schedule') || !txt.includes('cron')) errors.push('dream : pas de déclencheur schedule/cron');
    if (!txt.includes('Edit(docs/DREAM.md)')) errors.push('dream : allowedTools doit se limiter à Edit(docs/DREAM.md)');
    if (txt.includes('pull-requests: write') || txt.includes('issues: write')) errors.push('dream : NON propose-only (pull-requests/issues write interdit)');
  }
  if (!fs.existsSync(path.join(root, 'templates/dream/DREAM.md'))) errors.push('dream : manquant templates/dream/DREAM.md (seed)');
  return errors;
}

export function validateExtras(root) {
  const errors = [];
  const files = [
    'templates/cursor/hooks.json', 'templates/cursor/hooks/inject-memory.mjs', 'templates/cursor/hooks/log-edit.mjs', 'templates/cursor/cursorignore',
    'templates/security/secrets.yml', 'templates/ONBOARDING.md',
    'templates/env/saas.env.example', 'templates/env/mobile.env.example', 'templates/env/desktop.env.example', 'templates/env/vitrine.env.example',
    'templates/ci/saas.yml', 'templates/ci/mobile.yml', 'templates/ci/desktop.yml', 'templates/ci/vitrine.yml',
    'templates/agents/subagents/code-reviewer.md', 'templates/agents/subagents/security-reviewer.md', 'templates/agents/subagents/test-runner.md',
    'templates/gitignore/saas.gitignore', 'templates/gitignore/mobile.gitignore', 'templates/gitignore/desktop.gitignore', 'templates/gitignore/vitrine.gitignore',
    'templates/memory-consolidate/consolidate.yml',
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
