// scripts/lib/validate-commands.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateNewProjectCommand } from './validate-commands.mjs';

const PHASES = ['Brainstorm', 'PRD', 'stack', 'architecture', 'Design', 'Roadmap', 'Mise en place'];
const OUTPUTS = ['docs/PRD.md', 'docs/ROADMAP.md', 'docs/design.md', 'docs/superpowers/specs', 'docs/memory'];
const RENVOIS = ['docs/templates/PRD.md', 'docs/templates/architecture.md'];
// Les marqueurs de profondeur ont suivi le contenu : le runbook garde les siens, les templates
// PRD/architecture portent les leurs depuis qu'ils vivent dans `templates/` (Lot D9).
const DEPTH_RUNBOOK = ['EXPERIENCE.md', 'maquette', 'index.html', 'ui.shadcn.com/create', '@shadcnblocks'];
const DEPTH_PRD = ['Métriques de succès', 'Non-objectifs', 'Index des hypothèses'];
const DEPTH_ARCHI = ['Invariants', 'Graine structurelle'];

function makeRoot({ omitPhase = null, omitTemplate = false, omitDepth = null, omitRenvoi = null, omitDepthFile = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-'));
  fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/agents'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/prd'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/specs'), { recursive: true });
  const phases = PHASES.filter(p => p !== omitPhase).join(' ');
  const outputs = OUTPUTS.join(' ');
  const renvois = RENVOIS.filter(r => r !== omitRenvoi).join(' ');
  const depth = DEPTH_RUNBOOK.filter(d => d !== omitDepth).join(' ');
  fs.writeFileSync(path.join(root, 'templates/commands/new-project.md'), `${phases}\n${outputs}\n${renvois}\n${depth}\n`);
  if (omitDepthFile !== 'templates/prd/PRD.md') {
    fs.writeFileSync(path.join(root, 'templates/prd/PRD.md'), DEPTH_PRD.filter(d => d !== omitDepth).join('\n') + '\n');
  }
  if (omitDepthFile !== 'templates/specs/architecture.md') {
    fs.writeFileSync(path.join(root, 'templates/specs/architecture.md'), DEPTH_ARCHI.filter(d => d !== omitDepth).join('\n') + '\n');
  }
  if (!omitTemplate) {
    fs.writeFileSync(path.join(root, 'templates/agents/loop-section.md'), 'boucle');
    fs.writeFileSync(path.join(root, 'templates/agents/design-rule.md'), 'design');
    fs.writeFileSync(path.join(root, 'templates/agents/subagents-rule.md'), 'subagents');
    fs.writeFileSync(path.join(root, 'templates/agents/verify-rule.md'), 'verify');
    fs.writeFileSync(path.join(root, 'templates/agents/reality-rule.md'), 'reality');
    fs.writeFileSync(path.join(root, 'templates/agents/proof-rule.md'), 'proof');
    fs.writeFileSync(path.join(root, 'templates/agents/secrets-cost-rule.md'), 'secrets');
    fs.writeFileSync(path.join(root, 'templates/agents/css-maquette-rule.md'), 'css');
  }
  return root;
}

test('runbook complet + templates → aucune erreur', () => {
  assert.deepEqual(validateNewProjectCommand(makeRoot()), []);
});
test('phase manquante → erreur', () => {
  assert.ok(validateNewProjectCommand(makeRoot({ omitPhase: 'PRD' })).some(e => /PRD/.test(e)));
});
test('template manquant → erreur', () => {
  assert.ok(validateNewProjectCommand(makeRoot({ omitTemplate: true })).some(e => /loop-section/.test(e)));
});
test('runbook pas assez détaillé (marqueur de profondeur manquant) → erreur', () => {
  assert.ok(validateNewProjectCommand(makeRoot({ omitDepth: 'EXPERIENCE.md' })).some(e => /profondeur|EXPERIENCE/.test(e)));
});
// D9 — le contrôle de profondeur a SUIVI le contenu déplacé. Sans ces deux cas, vider
// templates/prd/PRD.md repasserait au vert : le validateur ne regarderait plus que le runbook.
test('template PRD amputé d\'un marqueur → erreur', () => {
  const errs = validateNewProjectCommand(makeRoot({ omitDepth: 'Métriques de succès' }));
  assert.ok(errs.some(e => /templates\/prd\/PRD\.md.*Métriques de succès/.test(e)), `vu : ${JSON.stringify(errs)}`);
});
test('template architecture amputé d\'un marqueur → erreur', () => {
  const errs = validateNewProjectCommand(makeRoot({ omitDepth: 'Graine structurelle' }));
  assert.ok(errs.some(e => /templates\/specs\/architecture\.md.*Graine structurelle/.test(e)), `vu : ${JSON.stringify(errs)}`);
});
test('template déplacé absent → erreur', () => {
  const errs = validateNewProjectCommand(makeRoot({ omitDepthFile: 'templates/prd/PRD.md' }));
  assert.ok(errs.some(e => /template manquant : templates\/prd\/PRD\.md/.test(e)), `vu : ${JSON.stringify(errs)}`);
});
test('runbook qui ne cite plus le template déplacé → erreur (un template que personne n\'ouvre)', () => {
  const errs = validateNewProjectCommand(makeRoot({ omitRenvoi: 'docs/templates/PRD.md' }));
  assert.ok(errs.some(e => /jamais cité.*docs\/templates\/PRD\.md/.test(e)), `vu : ${JSON.stringify(errs)}`);
});
test('runbook absent → erreur unique', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-'));
  const errs = validateNewProjectCommand(root);
  assert.ok(errs.some(e => /new-project\.md/.test(e)));
});
