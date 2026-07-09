import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseArgs, validateArgs, expandHome, resolveProjectDir, projectBaseDir } from './args.mjs';

test('parseArgs lit les drapeaux', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'mon-app', '--dry-run']);
  assert.equal(a.stack, 'saas');
  assert.equal(a.assistant, 'cursor');
  assert.equal(a.project, 'mon-app');
  assert.equal(a.dryRun, true);
  assert.equal(a.source, null); // défaut : null = setup.mjs y mettra la racine du kit
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
  assert.deepEqual(validateArgs(parseArgs(['--stack','saas','--assistant','cursor','--project','C:\\Users\\eleve\\app'])), []); // chemin absolu Windows
  assert.equal(validateArgs(parseArgs(['--stack','saas','--assistant','cursor','--project','a b'])).length, 1);
});

test('parseArgs : --license capturé, défaut null', () => {
  assert.equal(parseArgs(['--stack','saas','--assistant','cursor','--project','x']).license, null);
  assert.equal(parseArgs(['--project','x','--license','VIBE-7K4Q-9F2P-XR31']).license, 'VIBE-7K4Q-9F2P-XR31');
});

test('--backend : parsé et validé (cloud|local)', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x', '--backend', 'local']);
  assert.equal(a.backend, 'local');
  assert.deepEqual(validateArgs(a), []);
});
test('--backend invalide → erreur', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x', '--backend', 'nope']);
  assert.ok(validateArgs(a).some((e) => /backend/.test(e)));
});

test('--no-skills : drapeau lu', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x', '--no-skills']);
  assert.equal(a.noSkills, true);
});

test('--yes : drapeau lu (mode non-interactif)', () => {
  assert.equal(parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x', '--yes']).yes, true);
  assert.equal(parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x']).yes, false);
});

test('expandHome : ~ et ~/… étendus, le reste intact', () => {
  const home = path.join(path.sep, 'home', 'eleve');
  assert.equal(expandHome('~/mon-app', home), path.join(home, 'mon-app'));
  assert.equal(expandHome('~', home), home);
  assert.equal(expandHome('mon-app', home), 'mon-app');
  assert.equal(expandHome('./mon-app', home), './mon-app');
  assert.equal(expandHome(null, home), null);
});

test('resolveProjectDir : nom nu résolu contre baseDir ; chemins explicites respectés', () => {
  const base = path.join(path.sep, 'tmp');
  assert.equal(resolveProjectDir('mon-app', base), path.resolve(base, 'mon-app'));
  assert.equal(resolveProjectDir('apps/mon-app', base), path.resolve('apps/mon-app'));
  const abs = path.resolve(path.sep, 'ailleurs', 'app');
  assert.equal(resolveProjectDir(abs, base), abs);
});

test('projectBaseDir : cwd si installé (node_modules), sinon à côté du clone', () => {
  const cwd = path.join(path.sep, 'home', 'eleve', 'projets');
  assert.equal(projectBaseDir(path.join(path.sep, 'home', 'eleve', 'vibecoding-starter-kit'), cwd), path.join(path.sep, 'home', 'eleve'));
  assert.equal(projectBaseDir(path.join(path.sep, 'home', 'eleve', '.npm', '_npx', 'abc', 'node_modules', 'create-vibecoding-kit'), cwd), cwd);
});

test('parseArgs : nom de projet positionnel (npm create vibecoding-kit mon-app)', () => {
  assert.equal(parseArgs(['mon-app', '--stack', 'saas']).project, 'mon-app');
  assert.equal(parseArgs(['--stack', 'saas', '--project', 'x']).project, 'x'); // --project explicite marche toujours
});

test('validateArgs : vitrine est une stack valide', () => {
  assert.deepEqual(validateArgs(parseArgs(['--stack','vitrine','--assistant','cursor','--project','x'])), []);
});
