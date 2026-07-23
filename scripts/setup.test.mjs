import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRunPlan, kitRootFromModuleUrl } from './setup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};

test('kitRootFromModuleUrl : racine du kit = dossier parent de scripts/', () => {
  assert.equal(kitRootFromModuleUrl(import.meta.url), ROOT);
});

test('buildRunPlan : nom nu → projet créé dans le baseDir fourni', () => {
  const { assets, projectDir } = buildRunPlan({ stack: 'saas', assistant: 'cursor', project: 'mon-app' }, path.join(path.sep, 'tmp', 'base'));
  assert.equal(assets.commandsDir, '.cursor/commands');
  assert.equal(projectDir, path.resolve(path.join(path.sep, 'tmp', 'base'), 'mon-app'));
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

test('bin --refresh : régénère une règle cassée d\'un projet existant, ne touche pas src/', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-refresh-bin-'));
  const proj = path.join(dir, 'app');
  // Scaffold réel d'un projet (crée .vibecoding.json + AGENTS.md marqué + fichiers kit).
  execFileSync(process.execPath, ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'cursor', '--project', proj, '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
  // L'élève casse une règle managée d'AGENTS.md et garde du code perso dans src/.
  const agentsPath = path.join(proj, 'AGENTS.md');
  fs.writeFileSync(agentsPath, fs.readFileSync(agentsPath, 'utf8').replace('Règle secrets & coûts', 'CASSÉ'));
  fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
  fs.writeFileSync(path.join(proj, 'src/app.ts'), 'MON CODE');
  // Relance le bin en --refresh DEPUIS le projet : pas de re-scaffold, juste régénération.
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'setup.mjs'), '--project', proj, '--refresh'], { cwd: proj, stdio: 'pipe', env: GIT_ENV });
  const agents = fs.readFileSync(agentsPath, 'utf8');
  assert.match(agents, /Règle secrets & coûts/, 'règle managée régénérée');
  assert.doesNotMatch(agents, /CASSÉ/, 'version cassée remplacée en place');
  assert.equal(fs.readFileSync(path.join(proj, 'src/app.ts'), 'utf8'), 'MON CODE', 'src/ intouché');
  fs.rmSync(dir, { recursive: true, force: true });
});
