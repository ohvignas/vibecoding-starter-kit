// scripts/lib/validate-commands.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateNewProjectCommand } from './validate-commands.mjs';

const PHASES = ['Brainstorm', 'PRD', 'stack', 'architecture', 'Design', 'Roadmap', 'Mise en place'];
const OUTPUTS = ['docs/PRD.md', 'docs/ROADMAP.md', 'docs/design.md', 'docs/superpowers/specs', 'docs/memory', 'docs/DREAM.md'];
const DEPTH = ['Métriques de succès', 'Non-objectifs', 'Index des hypothèses', 'Invariants', 'Graine structurelle', 'EXPERIENCE.md', 'maquette', 'index.html'];

function makeRoot({ omitPhase = null, omitTemplate = false, omitDepth = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-'));
  fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/agents'), { recursive: true });
  const phases = PHASES.filter(p => p !== omitPhase).join(' ');
  const outputs = OUTPUTS.join(' ');
  const depth = DEPTH.filter(d => d !== omitDepth).join(' ');
  fs.writeFileSync(path.join(root, 'templates/commands/new-project.md'), `${phases}\n${outputs}\n${depth}\n`);
  if (!omitTemplate) {
    fs.writeFileSync(path.join(root, 'templates/agents/loop-section.md'), 'boucle');
    fs.writeFileSync(path.join(root, 'templates/agents/design-rule.md'), 'design');
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
test('template pas assez détaillé (marqueur de profondeur manquant) → erreur', () => {
  assert.ok(validateNewProjectCommand(makeRoot({ omitDepth: 'Métriques de succès' })).some(e => /profondeur|Métriques/.test(e)));
});
test('runbook absent → erreur unique', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-'));
  const errs = validateNewProjectCommand(root);
  assert.ok(errs.some(e => /new-project\.md/.test(e)));
});
