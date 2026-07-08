import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssets } from './matrix.mjs';

test('SaaS + Cursor : mdc stack, 1 seul clone (karpathy), commandsDir cursor, pas de bmad', () => {
  const p = resolveAssets('saas', 'cursor');
  assert.ok(p.copies.find(c => c.to === '.cursor/rules/stack-saas.mdc' && c.transform === 'mdc'));
  // La règle de stack est Agent-Requested (alwaysApply:false) pour ne pas saturer le contexte à chaque tour.
  assert.equal(p.copies.find(c => c.to === '.cursor/rules/stack-saas.mdc').alwaysApply, false);
  // awesome-cursorrules SUPPRIMÉ : le matching par tags déversait 64-201 règles hors-sujet (globs **/*).
  assert.equal(p.clones.length, 1);
  assert.match(p.clones[0].repo, /andrej-karpathy-skills/);
  assert.equal(p.commandsDir, '.cursor/commands');
  assert.equal(p.inAssistant[0].command, '/add-plugin superpowers');
  assert.ok(!p.inAssistant.some(s => /design/i.test(s.name)));
  assert.equal(p.bmad, undefined);
});
test('Desktop + Claude Code : pas de MCP, skill dir, commandsDir claude, rien de sauté', () => {
  const p = resolveAssets('desktop', 'claude-code');
  assert.ok(!p.copies.find(c => (c.to || '').includes('mcp.json')));
  assert.deepEqual(p.skipped, []);
  assert.ok(p.copies.find(c => c.to === '.claude/skills/stack-desktop' && c.transform === 'dir'));
  assert.equal(p.commandsDir, '.claude/commands');
  assert.equal(p.clones.length, 1);
});
test('Mobile + Codex : AGENTS brut, superpowers /plugins, commandsDir docs/commands', () => {
  const p = resolveAssets('mobile', 'codex');
  assert.ok(p.copies.find(c => c.from === 'stacks/mobile/AGENTS.md' && c.transform === 'raw'));
  assert.equal(p.commandsDir, 'docs/commands');
  assert.match(p.inAssistant[0].command, /plugins/);
});
test('assistant inconnu → throw', () => {
  assert.throws(() => resolveAssets('saas', 'windsurf'), /Assistant inconnu/);
});
