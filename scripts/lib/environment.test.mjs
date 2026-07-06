import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeStackEnvironment } from './environment.mjs';

function project() { return fs.mkdtempSync(path.join(os.tmpdir(), 'env-')); }
const SOURCE = process.cwd(); // la suite tourne à la racine du repo

test('SaaS/claude-code : MCP, checks.mjs, pre-push, settings, SETUP-AI', () => {
  const dir = project();
  const { done, failed } = writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'saas', assistant: 'claude-code' });
  assert.deepEqual(failed, [], 'aucun échec');
  const mcp = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
  assert.ok(mcp.mcpServers.shadcn, 'MCP shadcn écrit');
  assert.ok(!('expo' in mcp.mcpServers), 'pas de serveur expo dans un projet SaaS');
  assert.ok(fs.existsSync(path.join(dir, '.githooks/checks.mjs')), 'runner copié');
  assert.ok(fs.existsSync(path.join(dir, '.githooks/pre-push')), 'pre-push écrit');
  const settings = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8'));
  assert.equal(settings.hooks.PostToolUse[0].matcher, 'Edit|Write');
  const setup = fs.readFileSync(path.join(dir, 'docs/SETUP-AI.md'), 'utf8');
  assert.match(setup, /convex@claude-plugins-official/);
});

test('Cursor : écrit .cursor/mcp.json et étend .cursor/hooks.json', () => {
  const dir = project();
  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cursor/hooks.json'), JSON.stringify({ version: 1, hooks: { afterFileEdit: [] } }));
  const { failed } = writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'saas', assistant: 'cursor' });
  assert.deepEqual(failed, []);
  assert.ok(fs.existsSync(path.join(dir, '.cursor/mcp.json')));
  const hooks = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/hooks.json'), 'utf8'));
  assert.ok(hooks.hooks.afterFileEdit.some((h) => h.command === 'node .githooks/checks.mjs typecheck'));
});

test('pre-commit existant → ligne de checks ajoutée', () => {
  const dir = project();
  fs.mkdirSync(path.join(dir, '.githooks'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.githooks/pre-commit'), '#!/usr/bin/env bash\nset -e\n');
  writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'desktop', assistant: 'claude-code' });
  const pc = fs.readFileSync(path.join(dir, '.githooks/pre-commit'), 'utf8');
  assert.match(pc, /node \.githooks\/checks\.mjs typecheck lint/);
});

test('package.json présent → scripts ajoutés sans écraser', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'garde' } }));
  writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'saas', assistant: 'claude-code' });
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.typecheck, 'garde', 'ne réécrit pas');
  assert.equal(pkg.scripts.lint, 'biome check .', 'ajoute le manquant');
});

test('DOMAINS.md est écrit avec le catalogue de la stack', () => {
  const dir = project();
  writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'saas', assistant: 'claude-code' });
  const dom = fs.readFileSync(path.join(dir, 'docs/DOMAINS.md'), 'utf8');
  assert.match(dom, /Capacités métier/);
  assert.match(dom, /@better-auth\/stripe/);
});
