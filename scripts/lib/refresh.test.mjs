import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshProject, readVibecodingManifest } from './refresh.mjs';
import { MARK_START_PREFIX } from './managed-section.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('refresh : régénère le bloc managé, préserve zone user + src/', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${MARK_START_PREFIX} vieux -->\nVIEUX\n<!-- vibecoding:end -->\n\n## Perso\nGARDE-MOI`);
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), `${MARK_START_PREFIX} v -->\nX\n<!-- vibecoding:end -->`);
  fs.mkdirSync(path.join(dir, 'src')); fs.writeFileSync(path.join(dir, 'src/a.ts'), 'CODE');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'claude-code' }, dryRun: false });
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Règle design/); assert.doesNotMatch(agents, /VIEUX/); assert.match(agents, /GARDE-MOI/);
  assert.equal(fs.readFileSync(path.join(dir, 'src/a.ts'), 'utf8'), 'CODE');
  assert.ok(r.changed.includes('AGENTS.md')); assert.equal(r.migrated.length, 0, 'marqueurs présents → pas de migration');
});

test('refresh : projet SANS marqueurs → migrated signalé, contenu conservé', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-old-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Vieux\nANCIENNE REGLE');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor' }, dryRun: false });
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /ANCIENNE REGLE/, 'ancien contenu conservé');
  assert.match(agents, /Règle design/, 'nouveau bloc ajouté');
  assert.ok(r.migrated.includes('AGENTS.md'), 'migration signalée');
});

test('refresh --dry-run : n\'écrit rien', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-dry-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${MARK_START_PREFIX} v -->\nX\n<!-- vibecoding:end -->`);
  const before = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor' }, dryRun: true });
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), before);
});

test('readVibecodingManifest : lit stack/assistant, jette si absent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-'));
  assert.throws(() => readVibecodingManifest(dir), /vibecoding\.json/);
  fs.writeFileSync(path.join(dir, '.vibecoding.json'), '{"stack":"saas","assistant":"cursor"}');
  assert.equal(readVibecodingManifest(dir).stack, 'saas');
});
