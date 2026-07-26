import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('loop-section : boucle superpowers, def-of-done dev, pas de BMAD', () => {
  const t = read('templates/agents/loop-section.md');
  for (const s of ['brainstorming', 'writing-plans', 'subagent-driven-development', 'test live', 'merge', 'dev']) {
    assert.match(t, new RegExp(s));
  }
  assert.doesNotMatch(t, /BMAD/i);
});
test('design-rule : 4 skills design + design.md + blocs @shadcnblocks via CLI', () => {
  const t = read('templates/agents/design-rule.md');
  for (const s of ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'brand-guidelines', 'design.md', '@shadcnblocks']) {
    assert.match(t, new RegExp(s.replace(/[-.]/g, '\\$&')));
  }
});

test('subagents-rule : quand déléguer + contrat + parallèle + modèle sonnet 5', () => {
  const t = read('templates/agents/subagents-rule.md');
  for (const s of ['subagent-driven-development', 'parallèle', 'contexte frais', 'artefact', 'Règle design', 'claude-sonnet-5']) {
    assert.match(t, new RegExp(s));
  }
});

test('verify-rule : rendu + fonctionnement E2E + Playwright/Maestro + test-runner + trous QA', () => {
  const t = read('templates/agents/verify-rule.md');
  for (const s of ['navigateur', 'screenshot', 'maquette', 'systematic-debugging', 'verification-before-completion', 'end-to-end', 'Playwright', 'Maestro', 'test-runner', 'contexte frais', 'erreurs API', 'FONCTIONNEMENT', 'PixelRAG']) {
    assert.match(t, new RegExp(s));
  }
});

test('subagent test-runner : contexte frais, Playwright/Maestro, verdict court, ne code pas', () => {
  const t = read('templates/agents/subagents/test-runner.md');
  for (const s of ['Playwright', 'Maestro', 'critères', 'Verdict', 'ne codes? rien', 'toMatchAriaSnapshot', 'waitForRequest', 'rechargement', 'model:']) {
    assert.match(t, new RegExp(s));
  }
});

test('secrets-cost-rule : .env + jamais commit + coûts/modèle', () => {
  const t = read('templates/agents/secrets-cost-rule.md');
  for (const s of ['\\.env', 'pre-commit', 'destructive', 'Modèle adapté', 'fan-out']) {
    assert.match(t, new RegExp(s));
  }
});

test('css-maquette-rule : pas de slice lignes + accolades + vrai CSS + couleur primaire', () => {
  const t = read('templates/agents/css-maquette-rule.md');
  for (const s of ['plages de lignes', 'Accolades', 'vrai CSS', 'shadcn', 'primaire']) {
    assert.match(t, new RegExp(s));
  }
});

test('reality-rule : zéro mock + boutons câblés + maquette à l\'identique', () => {
  const t = read('templates/agents/reality-rule.md');
  for (const s of ['mock', 'vrai backend', 'MARCHE', 'PixelRAG', 'Prends le temps']) {
    assert.match(t, new RegExp(s));
  }
});

test('ROADMAP + Phase 6 : données/câblage réel par jalon (zéro mock)', () => {
  const roadmap = read('templates/roadmap/ROADMAP.md');
  const np = read('templates/commands/new-project.md');
  assert.match(roadmap, /Données \/ câblage réel/);
  assert.match(np, /vraie donnée/i);
  assert.match(np, /zéro mock/i);
});

test('règle Cursor CSS scoped : globs styles + non-alwaysApply', () => {
  const t = read('templates/cursor/rules/10-css-maquette.mdc');
  assert.match(t, /globs:\s*\*\*\/styles\/\*\*/);
  assert.match(t, /alwaysApply:\s*false/);
});

test('stacks/vitrine : AGENTS.md + README + prompts présents et complets', () => {
  const a = read('stacks/vitrine/AGENTS.md');
  assert.match(a, /îlot/i);
  assert.match(a, /client:/);
  assert.match(a, /llms\.txt/);
  assert.match(a, /JSON-LD/);
  assert.match(a, /robots\.txt/);
  assert.match(a, /@astrojs\/sitemap/);
  assert.match(a, /Keystatic/);
  assert.ok(read('stacks/vitrine/README.md').length > 800);
  assert.ok(read('stacks/vitrine/prompts-de-demarrage.md').includes('shadcn'));
});
