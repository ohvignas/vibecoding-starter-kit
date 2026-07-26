import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CRITICS = ['critique-produit', 'critique-donnees', 'critique-ux'];

test('panel de critiques : personas distincts, format MANQUE, ne codent pas', () => {
  const bodies = CRITICS.map((c) => read(`templates/agents/subagents/${c}.md`));
  for (const [i, t] of bodies.entries()) {
    assert.match(t, new RegExp(`name: ${CRITICS[i]}`), `${CRITICS[i]} : frontmatter name`);
    assert.match(t, /MANQUE/, `${CRITICS[i]} : format de sortie`);
    assert.match(t, /ne codes? pas/, `${CRITICS[i]} : ne code pas`);
    assert.match(t, /docs\/skills|skills/, `${CRITICS[i]} : s'appuie sur les skills`);
  }
  // lentilles distinctes : chacun a son mot-clé propre
  assert.match(bodies[0], /Vera/); assert.match(bodies[1], /Marc/); assert.match(bodies[2], /Lina/);
  assert.match(bodies[1], /mock/i); assert.match(bodies[2], /chargement/i);
});

test('crew : chaque agent déclare son modèle et lit le journal', () => {
  for (const a of ['code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux']) {
    const t = read(`templates/agents/subagents/${a}.md`);
    assert.match(t, /model: claude-(opus|sonnet)-5/, `${a} : modèle déclaré`);
    assert.match(t, /JOURNAL\.md/, `${a} : lit/écrit le journal`);
  }
});

test('Phase 6 : audit de complétude + panel critique en parallèle avant roadmap', () => {
  const np = read('templates/commands/new-project.md');
  assert.match(np, /Audit complet de complétude/);
  assert.match(np, /inventaire de complétude/);
  for (const c of ['critique-produit', 'critique-donnees', 'critique-ux']) assert.match(np, new RegExp(c));
  assert.match(np, /en parallèle/);
  assert.match(np, /toutes? les features/i);
});

test('help : présente l\'équipe d\'agents invocables', () => {
  const h = read('templates/commands/help.md');
  assert.match(h, /L'équipe d'agents/);
  assert.match(h, /critique-ux/);
  assert.match(h, /test-runner/);
});
