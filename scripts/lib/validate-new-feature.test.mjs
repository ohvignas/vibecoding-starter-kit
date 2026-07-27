// scripts/lib/validate-new-feature.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateNewFeatureCommand } from './validate-commands.mjs';

const STEPS = ['worktree', 'brainstorming', 'writing-plans', 'subagent-driven-development', 'code-review', 'Règle de vérification', 'security-review', 'git commit', 'gh pr create', 'gh run watch', 'finishing-a-development-branch', 'main'];
const DEPTH = ["Critères d'acceptation", 'En tant que', 'Périmètre'];

function makeRoot({ omitStep = null, omitLoopRef = false, omitRunbook = false, omitDepth = null, ajoute = '' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
  if (!omitRunbook) {
    fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
    const steps = STEPS.filter(s => s !== omitStep).join(' \n');
    const depth = DEPTH.filter(d => d !== omitDepth).join(' \n');
    const loopRef = omitLoopRef ? '' : 'templates/agents/loop-section.md';
    fs.writeFileSync(path.join(root, 'templates/commands/new-feature.md'), `${steps}\n${depth}\n${loopRef}\n${ajoute}\n`);
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
// D1/D2 — le validateur ne se contente plus d'exiger le bon : il refuse le faux. Sans ces deux
// cas, remplacer `gh pr create` par le plugin fantôme repasserait au vert (il suffisait d'ajouter
// la chaîne exigée), et rien n'empêcherait de réintroduire la branche `dev`.
test('plugin de commit fantôme → erreur', () => {
  const errs = validateNewFeatureCommand(makeRoot({ ajoute: '### 7. Commit (`commit-commands:commit`)' }));
  assert.ok(errs.some(e => /plugin de commit jamais installé/.test(e)), `attendu une erreur, vu : ${JSON.stringify(errs)}`);
});
test('branche `dev` réintroduite → erreur', () => {
  const errs = validateNewFeatureCommand(makeRoot({ ajoute: 'Merge sur `dev`' }));
  assert.ok(errs.some(e => /branche `dev`/.test(e)), `attendu une erreur, vu : ${JSON.stringify(errs)}`);
});
test('étape `gh pr create` manquante → erreur (la PR ne s\'ouvre pas toute seule)', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitStep: 'gh pr create' })).some(e => /gh pr create/.test(e)));
});
