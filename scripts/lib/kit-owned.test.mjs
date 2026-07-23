import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitOwnedFiles } from './kit-owned.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('kitOwnedFiles(saas, claude-code) : commandes + subagents, sources existantes', () => {
  const files = kitOwnedFiles('saas', 'claude-code');
  assert.ok(files.some((f) => f.to === '.claude/commands/new-project.md'));
  assert.ok(files.some((f) => f.to === '.claude/agents/test-runner.md'));
  for (const f of files) assert.ok(fs.existsSync(path.join(ROOT, f.from)), `source existe : ${f.from}`);
});

test('kitOwnedFiles(saas, cursor) : commandes + règles globales, PAS de subagents', () => {
  const files = kitOwnedFiles('saas', 'cursor');
  assert.ok(files.some((f) => f.to === '.cursor/commands/build.md'));
  assert.ok(files.some((f) => f.to === '.cursor/rules/10-css-maquette.mdc'));
  assert.equal(files.some((f) => f.to.startsWith('.claude/')), false);
});

test('kitOwnedFiles ne contient AUCUN chemin utilisateur (src/docs/.env)', () => {
  for (const a of ['cursor', 'claude-code', 'codex']) {
    for (const f of kitOwnedFiles('saas', a)) {
      assert.doesNotMatch(f.to, /^src\/|^docs\/(PRD|ROADMAP|design|memory)|\.env/, `chemin utilisateur interdit : ${f.to}`);
    }
  }
});
