import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard, wireSigint, renderNonTtyHelp } from './wizard.mjs';

const NULL_OUT = { write() {} };
const scripted = (answers) => { let i = 0; return async () => answers[i++]; };

test('needsWizard : TTY + config incomplète (le wizard complète) ; --yes = jamais de questions', () => {
  assert.equal(needsWizard([], true), true);
  assert.equal(needsWizard([], false), false);
  assert.equal(needsWizard(['--stack', 'saas'], true), true); // incomplet + TTY → le wizard complète
  assert.equal(needsWizard(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x'], true), false);
  assert.equal(needsWizard(['--stack', 'saas'], false), false);
  assert.equal(needsWizard(['--yes'], true), false);
});

test('buildArgsFromAnswers : mappe + défauts + validation', () => {
  const a = buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local' }, { caveman: true });
  assert.equal(a.stack, 'saas');
  assert.equal(a.source, null); // null = setup.mjs y mettra la racine du kit
  assert.equal(a.backend, 'local');
  assert.equal(a.caveman, true); // caveman vient du flag --caveman (base), plus du wizard
  assert.equal(a.dryRun, false);
});

test('buildArgsFromAnswers : conserve les drapeaux CLI déjà passés (base)', () => {
  const base = { source: '../kit', noSkills: true, force: true, dryRun: false };
  const a = buildArgsFromAnswers({ stack: 'mobile', assistant: 'cursor', project: 'app' }, base);
  assert.equal(a.source, '../kit');
  assert.equal(a.noSkills, true);
  assert.equal(a.force, true);
});

test('buildArgsFromAnswers : rejette une entrée invalide', () => {
  assert.throws(() => buildArgsFromAnswers({ stack: 'flutter', assistant: 'claude-code', project: 'x' }), /stack/);
  assert.throws(() => buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'nom invalide!' }), /project/);
});

test('caveman opt-in : buildArgsFromAnswers ne l\'active que via le flag --caveman', () => {
  const off = buildArgsFromAnswers({ stack: 'saas', assistant: 'cursor', project: 'x' }, {});
  assert.equal(off.caveman, false);
  const on = buildArgsFromAnswers({ stack: 'saas', assistant: 'cursor', project: 'x' }, { caveman: true });
  assert.equal(on.caveman, true);
});

test('renderBackendNote : saas+local seulement', () => {
  assert.match(renderBackendNote('saas', 'local'), /convex deployment select local/);
  assert.equal(renderBackendNote('saas', 'cloud'), '');
  assert.equal(renderBackendNote('desktop', 'local'), '');
});

test('runWizard : saas → demande le backend, produit les bons args', async () => {
  const ask = scripted(['1', '2', 'mon-app', '2', 'o']); // saas, claude-code, nom, backend local, apprentissage oui (ni caveman ni code d'accès)
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local', learning: true });
});

test('runWizard : redemande sur choix invalide (mobile → pas de backend)', async () => {
  const ask = scripted(['9', '2', '1', 'app', 'n']); // stack 9 invalide→2 mobile ; assistant 1 cursor ; nom ; apprentissage non
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'mobile', assistant: 'cursor', project: 'app', backend: 'cloud', learning: false });
});

test('runWizard : vitrine (choix 4) → pas de question backend', async () => {
  const ask = scripted(['4', '1', 'site', 'n']); // vitrine, cursor, nom, apprentissage non
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'vitrine', assistant: 'cursor', project: 'site', backend: 'cloud', learning: false });
});

test('wireSigint : Ctrl+C → message + exit 130', () => {
  const handlers = {};
  const rl = { on(evt, cb) { handlers[evt] = cb; } };
  const codes = [], msgs = [];
  wireSigint(rl, (c) => codes.push(c), (m) => msgs.push(m));
  handlers.SIGINT();
  assert.deepEqual(codes, [130]);
  assert.match(msgs[0], /annulée/);
});

test('renderNonTtyHelp : mentionne les drapeaux, PowerShell et Git Bash', () => {
  const h = renderNonTtyHelp();
  assert.match(h, /--stack/);
  assert.match(h, /--assistant/);
  assert.match(h, /--project/);
  assert.match(h, /PowerShell/);
  assert.match(h, /Git Bash/);
});
