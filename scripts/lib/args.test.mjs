import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseArgs, validateArgs, expandHome, resolveProjectDir, projectBaseDir } from './args.mjs';

test('parseArgs : --refresh', () => {
  assert.equal(parseArgs(['--refresh']).refresh, true);
  assert.equal(parseArgs([]).refresh, false);
});

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
  // Un espace est LÉGITIME dans un chemin (« C:\Users\Jean Dupont\app ») : accepté depuis le Lot 0.
  assert.deepEqual(validateArgs(parseArgs(['--stack','saas','--assistant','cursor','--project','a b'])), []);
  // Ce qui reste refusé : les métacaractères de shell.
  assert.equal(validateArgs(parseArgs(['--stack','saas','--assistant','cursor','--project','a;rm'])).length, 1);
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

// `--yes` est ACCEPTÉ (sinon parseArgs jetterait « Argument inconnu ») mais n'a plus de champ :
// le mode non interactif se décide sur `argv` dans `needsWizard`, jamais sur `args.yes`.
test('--yes : accepté sans erreur, et sans champ mort dans l\'objet', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x', '--yes']);
  assert.equal(a.stack, 'saas');
  assert.equal('yes' in a, false);
  assert.equal('mockup' in a, false);
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

// --- Lot 0 : bugs prouvés par l'audit du 27/07/2026 ---

test('un drapeau ne peut pas être avalé comme valeur (--project --no-skills)', () => {
  assert.throws(() => parseArgs(['--project', '--no-skills']), /attend une valeur/);
  assert.throws(() => parseArgs(['--stack', '--yes']), /attend une valeur/);
  assert.throws(() => parseArgs(['--assistant']), /attend une valeur/);
});

test('« . » et « ./ » désignent le dossier courant, jamais le HOME', () => {
  const cwd = '/tmp/mon-projet';
  assert.equal(resolveProjectDir('.', '/ailleurs', cwd), path.resolve(cwd));
  assert.equal(resolveProjectDir('./', '/ailleurs', cwd), path.resolve(cwd));
});

test('chemins avec espace ou accent acceptés (Jean Dupont, projet-café)', () => {
  for (const p of ['mon projet', 'projet-café', '/Users/Jean Dupont/app', 'C:\\Users\\Jean Dupont\\app']) {
    const errs = validateArgs({ stack: 'saas', assistant: 'cursor', project: p });
    assert.deepEqual(errs, [], `« ${p} » doit être accepté`);
  }
});

test('les caractères dangereux pour un shell restent refusés', () => {
  for (const p of ['app; rm -rf /', 'app$(whoami)', 'app`id`', 'app|cat', 'app\nrm']) {
    const errs = validateArgs({ stack: 'saas', assistant: 'cursor', project: p });
    assert.ok(errs.some((e) => /project/.test(e)), `« ${p} » doit être refusé`);
  }
});
