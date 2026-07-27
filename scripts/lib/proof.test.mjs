import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const AGENTS = ['verificateur', 'test-runner', 'security-reviewer', 'code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux'];

test('droits : rédacteurs d\'artefacts écrivent, les autres sont bridés', () => {
  for (const a of ['verificateur', 'security-reviewer']) {
    assert.match(read(`templates/agents/subagents/${a}.md`), /^tools:.*\bWrite\b/m, `${a} écrit son artefact`);
  }
  for (const a of ['test-runner', 'code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux']) {
    assert.match(read(`templates/agents/subagents/${a}.md`), /^disallowedTools:.*\bEdit\b/m, `${a} ne modifie pas le code`);
  }
});

test('frontmatter : skills en liste, AUCUN mcpServers (aucun MCP n\'est présent sur les 4 stacks)', () => {
  for (const a of AGENTS) {
    const t = read(`templates/agents/subagents/${a}.md`);
    assert.doesNotMatch(t, /^skills: \S/m, `${a} : skills doit être une liste`);
    assert.doesNotMatch(t, /^mcpServers:/m, `${a} : pas de mcpServers en frontmatter (dépend de la stack)`);
  }
});

test('proof-rule : statuts, hiérarchie, interdits, max 3 tentatives', () => {
  const t = read('templates/agents/proof-rule.md');
  for (const s of ['PROUVÉ', 'NON PROUVÉ', 'BLOQUÉ', 'sortie brute', 'ROUGE avant', 'requête réseau', 'contexte frais', 'skip', '3 tentatives']) {
    assert.match(t, new RegExp(s));
  }
});

test('verificateur : contexte frais, checks anti-faux-succès, verdict', () => {
  const t = read('templates/agents/subagents/verificateur.md');
  for (const s of ['model: claude-sonnet-5', 'PROUVÉ', 'oxlint', 'knip', 'JOURNAL', 'ne codes? pas', 'expect-expect']) {
    assert.match(t, new RegExp(s));
  }
});

test('security-reviewer : outils réels + tests négatifs + artefact', () => {
  const t = read('templates/agents/subagents/security-reviewer.md');
  for (const s of ['semgrep', 'gitleaks', 'osv-scanner', 'IDOR', 'tests négatifs', '\\.security/', 'model: claude-opus-5']) {
    assert.match(t, new RegExp(s));
  }
});

test('journal : graines JOURNAL.md + state.yaml (append-only, statuts)', () => {
  const j = read('templates/journal/JOURNAL.md');
  assert.match(j, /append-only/);
  assert.match(j, /lit ce fichier avant/);
  const s = read('templates/journal/state.yaml');
  assert.match(s, /repair_attempts/);
  assert.match(s, /blocked_reason/);
});
