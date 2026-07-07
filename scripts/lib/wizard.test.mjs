import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard } from './wizard.mjs';

const NULL_OUT = { write() {} };
const scripted = (answers) => { let i = 0; return async () => answers[i++]; };

test('needsWizard : sans flags ET TTY seulement', () => {
  assert.equal(needsWizard([], true), true);
  assert.equal(needsWizard([], false), false);
  assert.equal(needsWizard(['--stack', 'saas'], true), false);
});

test('buildArgsFromAnswers : mappe + défauts + validation', () => {
  const a = buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local', caveman: true });
  assert.equal(a.stack, 'saas');
  assert.equal(a.source, '.');
  assert.equal(a.backend, 'local');
  assert.equal(a.caveman, true);
  assert.equal(a.dryRun, false);
});

test('buildArgsFromAnswers : rejette une entrée invalide', () => {
  assert.throws(() => buildArgsFromAnswers({ stack: 'flutter', assistant: 'claude-code', project: 'x' }), /stack/);
  assert.throws(() => buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'nom invalide!' }), /project/);
});

test('renderBackendNote : saas+local seulement', () => {
  assert.match(renderBackendNote('saas', 'local'), /convex deployment select local/);
  assert.equal(renderBackendNote('saas', 'cloud'), '');
  assert.equal(renderBackendNote('desktop', 'local'), '');
});

test('runWizard : saas → demande le backend, produit les bons args', async () => {
  const ask = scripted(['1', '2', 'mon-app', '2', 'o']); // saas, claude-code, nom, backend local, caveman oui
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local', caveman: true });
});

test('runWizard : redemande sur choix invalide (mobile → pas de backend)', async () => {
  const ask = scripted(['9', '2', '1', 'app', 'n']); // stack 9 invalide→2 mobile ; assistant 1 cursor ; nom ; caveman non
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'mobile', assistant: 'cursor', project: 'app', backend: 'cloud', caveman: false });
});
