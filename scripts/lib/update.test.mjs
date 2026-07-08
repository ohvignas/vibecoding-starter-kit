import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readVibecodingManifest, buildUpdateArgs } from '../update.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};

test('readVibecodingManifest : lit le manifeste, erreur claire si absent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-mf-'));
  assert.throws(() => readVibecodingManifest(dir), /\.vibecoding\.json/);
  fs.writeFileSync(path.join(dir, '.vibecoding.json'), JSON.stringify({ stack: 'saas', assistant: 'cursor' }));
  assert.deepEqual(readVibecodingManifest(dir), { stack: 'saas', assistant: 'cursor' });
});

test('buildUpdateArgs : re-joue le setup avec la stack/assistant du manifeste', () => {
  const a = buildUpdateArgs({ stack: 'mobile', assistant: 'cursor' }, '/p', '/kit');
  assert.deepEqual(a, ['scripts/setup.mjs', '--source', '/kit', '--stack', 'mobile', '--assistant', 'cursor', '--project', '/p', '--no-skills', '--yes']);
});

test('intégration : update recrée un fichier supprimé, ne touche pas un fichier modifié', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-upd-'));
  const proj = path.join(dir, 'app');
  const setup = () => execFileSync(process.execPath, ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'cursor', '--project', proj, '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
  setup();
  // l'élève a modifié ONBOARDING, et un fichier généré a disparu
  const onboarding = path.join(proj, 'docs/ONBOARDING.md');
  fs.writeFileSync(onboarding, 'MON CONTENU À MOI');
  fs.rmSync(path.join(proj, 'docs/ROADMAP.md'));
  // update = re-joue le setup (non destructif)
  execFileSync(process.execPath, ['scripts/update.mjs', '--project', proj], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
  assert.ok(fs.existsSync(path.join(proj, 'docs/ROADMAP.md')), 'fichier supprimé recréé');
  assert.equal(fs.readFileSync(onboarding, 'utf8'), 'MON CONTENU À MOI', 'fichier modifié préservé');
  fs.rmSync(dir, { recursive: true, force: true });
});
