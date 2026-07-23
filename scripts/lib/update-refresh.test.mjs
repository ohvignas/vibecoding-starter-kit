import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshProject } from '../update.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function fakeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  // AGENTS.md avec un vieux bloc managé + une zone utilisateur à préserver
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '<!-- vibecoding:start x -->\nVIEILLE REGLE\n<!-- vibecoding:end -->\n\n## Mes règles\nGARDE-MOI');
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '<!-- vibecoding:start x -->\nVIEUX\n<!-- vibecoding:end -->');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/app.ts'), 'MON CODE');
  return dir;
}

test('refresh : régénère le bloc managé, préserve zone utilisateur ET src/', () => {
  const dir = fakeProject();
  const res = refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'claude-code' }, dryRun: false });
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Règle design/, 'nouvelles règles injectées');
  assert.doesNotMatch(agents, /VIEILLE REGLE/, 'ancien bloc remplacé');
  assert.match(agents, /GARDE-MOI/, 'zone utilisateur préservée');
  assert.equal(fs.readFileSync(path.join(dir, 'src/app.ts'), 'utf8'), 'MON CODE', 'src/ intouché');
  assert.ok(res.changed.includes('AGENTS.md'));
});

test('refresh --dry-run : n\'écrit rien', () => {
  const dir = fakeProject();
  const before = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'claude-code' }, dryRun: true });
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), before, 'inchangé en dry-run');
});
