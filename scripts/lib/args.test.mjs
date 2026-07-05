import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, validateArgs } from './args.mjs';

test('parseArgs lit les drapeaux', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'mon-app', '--dry-run']);
  assert.equal(a.stack, 'saas');
  assert.equal(a.assistant, 'cursor');
  assert.equal(a.project, 'mon-app');
  assert.equal(a.dryRun, true);
  assert.equal(a.source, '.'); // défaut
});

test('parseArgs rejette un drapeau inconnu', () => {
  assert.throws(() => parseArgs(['--nope']), /inconnu/);
});

test('parseArgs lit --caveman (défaut false)', () => {
  assert.equal(parseArgs(['--stack','saas','--assistant','cursor','--project','a']).caveman, false);
  assert.equal(parseArgs(['--stack','saas','--assistant','cursor','--project','a','--caveman']).caveman, true);
});

test('validateArgs signale stack/assistant/projet invalides', () => {
  assert.deepEqual(validateArgs(parseArgs(['--stack','x','--assistant','y','--project','!!'])).length, 3);
  assert.deepEqual(validateArgs(parseArgs(['--stack','saas','--assistant','cursor','--project','ok'])), []);
  assert.deepEqual(validateArgs(parseArgs(['--stack','saas','--assistant','cursor','--project','/tmp/vibe-demo'])), []);
  assert.equal(validateArgs(parseArgs(['--stack','saas','--assistant','cursor','--project','a b'])).length, 1);
});
