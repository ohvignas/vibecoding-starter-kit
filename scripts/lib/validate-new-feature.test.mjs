// scripts/lib/validate-new-feature.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateNewFeatureCommand } from './validate-commands.mjs';

const STEPS = ['worktree', 'brainstorming', 'writing-plans', 'subagent-driven-development', 'code-review', 'Règle de vérification', 'security-review', 'commit-push-pr', 'gh run watch', 'finishing-a-development-branch', 'dev'];
const DEPTH = ["Critères d'acceptation", 'En tant que', 'Périmètre'];

function makeRoot({ omitStep = null, omitLoopRef = false, omitRunbook = false, omitDepth = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
  if (!omitRunbook) {
    fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
    const steps = STEPS.filter(s => s !== omitStep).join(' \n');
    const depth = DEPTH.filter(d => d !== omitDepth).join(' \n');
    const loopRef = omitLoopRef ? '' : 'templates/agents/loop-section.md';
    fs.writeFileSync(path.join(root, 'templates/commands/new-feature.md'), `${steps}\n${depth}\n${loopRef}\n`);
  }
  return root;
}

test('runbook complet → aucune erreur', () => {
  assert.deepEqual(validateNewFeatureCommand(makeRoot()), []);
});
test('étape manquante → erreur', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitStep: 'security-review' })).some(e => /security-review/.test(e)));
});
test('référence loop-section manquante → erreur', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitLoopRef: true })).some(e => /loop-section/.test(e)));
});
test('spec pas assez détaillée (critères d\'acceptation manquants) → erreur', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitDepth: "Critères d'acceptation" })).some(e => /profondeur|acceptation/i.test(e)));
});
test('runbook absent → erreur unique', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitRunbook: true })).some(e => /new-feature\.md/.test(e)));
});
