import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRunPlan, kitRootFromModuleUrl } from './setup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('kitRootFromModuleUrl : racine du kit = dossier parent de scripts/', () => {
  assert.equal(kitRootFromModuleUrl(import.meta.url), ROOT);
});

test('buildRunPlan : nom nu → projet créé À CÔTÉ du kit (../<nom>)', () => {
  const { assets, projectDir } = buildRunPlan({ stack: 'saas', assistant: 'cursor', project: 'mon-app' }, path.join(path.sep, 'tmp', 'kit'));
  assert.equal(assets.commandsDir, '.cursor/commands');
  assert.equal(projectDir, path.resolve(path.join(path.sep, 'tmp', 'kit'), '..', 'mon-app'));
});

test('buildRunPlan : chemin explicite (relatif avec séparateur, ou absolu) respecté', () => {
  const kit = path.join(path.sep, 'tmp', 'kit');
  assert.equal(buildRunPlan({ stack: 'saas', assistant: 'cursor', project: 'apps/mon-app' }, kit).projectDir, path.resolve('apps/mon-app'));
  const abs = path.join(os.tmpdir(), 'ailleurs-app');
  assert.equal(buildRunPlan({ stack: 'saas', assistant: 'cursor', project: abs }, kit).projectDir, path.resolve(abs));
});

test('non-TTY sans drapeaux : erreurs + aide PowerShell + exit 1', () => {
  let code = 0, err = '';
  try { execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'setup.mjs')], { stdio: 'pipe' }); }
  catch (e) { code = e.status ?? 1; err = String(e.stderr); }
  assert.equal(code, 1);
  assert.match(err, /--stack/);
  assert.match(err, /PowerShell/);
});

test('lancé depuis un autre dossier : --dry-run résout le projet hors du clone du kit', () => {
  const out = execFileSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'setup.mjs'), '--stack', 'saas', '--assistant', 'cursor', '--project', 'demo-hors-kit', '--dry-run'],
    { cwd: os.tmpdir(), encoding: 'utf8' },
  );
  const plan = JSON.parse(out);
  assert.equal(plan.projectDir, path.resolve(ROOT, '..', 'demo-hors-kit'));
});
