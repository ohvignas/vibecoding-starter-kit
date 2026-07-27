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
  assert.ok(files.some((f) => f.to === '.claude/commands/init-vibecoding.md'), 'la commande d\'entrée est régénérable par --refresh');
  assert.ok(files.some((f) => f.to === '.claude/agents/test-runner.md'));
  assert.ok(files.some((f) => f.to === '.claude/agents/verificateur.md'));
  for (const c of ['critique-produit', 'critique-donnees', 'critique-ux']) {
    assert.ok(files.some((f) => f.to === `.claude/agents/${c}.md`), `panel : ${c} régénérable`);
  }
  for (const f of files) assert.ok(fs.existsSync(path.join(ROOT, f.from)), `source existe : ${f.from}`);
});

test('kitOwnedFiles(saas, cursor) : commandes + règles globales, aucun chemin .claude/', () => {
  const files = kitOwnedFiles('saas', 'cursor');
  assert.ok(files.some((f) => f.to === '.cursor/commands/build.md'));
  assert.ok(files.some((f) => f.to === '.cursor/rules/10-css-maquette.mdc'));
  assert.equal(files.some((f) => f.to.startsWith('.claude/')), false, 'aucun chemin .claude/ côté cursor');
});

test('kitOwnedFiles : agents des 3 assistants + règles typées À PLAT + hooks Cursor', () => {
  const c = kitOwnedFiles('saas', 'cursor');
  assert.ok(c.some((f) => f.to === '.cursor/agents/verificateur.md' && f.transform === 'cursor-agent'));
  assert.ok(c.some((f) => f.to === '.cursor/rules/convex.mdc'), 'règles typées copiées à plat');
  assert.equal(c.some((f) => f.to.includes('.cursor/rules/saas/')), false, 'jamais de sous-dossier de stack');
  assert.ok(c.some((f) => f.to === '.cursor/hooks/inject-memory.mjs'));
  assert.ok(kitOwnedFiles('saas', 'codex').some((f) => f.to === 'docs/agents/crew/verificateur.md'));
});

test('kitOwnedFiles ne contient AUCUN chemin utilisateur (src/docs/.env)', () => {
  for (const a of ['cursor', 'claude-code', 'codex']) {
    for (const f of kitOwnedFiles('saas', a)) {
      assert.doesNotMatch(f.to, /^src\/|^docs\/(PRD|ROADMAP|design|memory)|\.env/, `chemin utilisateur interdit : ${f.to}`);
    }
  }
});
