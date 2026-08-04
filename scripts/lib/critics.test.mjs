import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fichiersDuRunbook } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CRITICS = ['critique-produit', 'critique-donnees', 'critique-ux'];
// `/new-project` est découpé : la Phase 6 vit dans l'étape `06-…`, plus dans l'entrée. On lit donc
// le runbook entier (entrée + étapes), liste dérivée de la source unique `commands-list.mjs`.
const newProject = () => fichiersDuRunbook(ROOT, 'new-project').map((f) => read(f)).join('\n');

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

// Ces 4 agents sont bridés en écriture (`disallowedTools`) : ils LISENT le journal, ils ne
// l'écrivent pas. Leur ligne part dans leur rapport, l'orchestrateur l'ajoute (Lot C, C1).
test('crew : chaque agent déclare son modèle et LIT le journal (sans jamais l\'écrire)', () => {
  for (const a of ['code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux']) {
    const t = read(`templates/agents/subagents/${a}.md`);
    assert.match(t, /model: claude-(opus|sonnet)-5/, `${a} : modèle déclaré`);
    assert.match(t, /Lis `docs\/agents\/JOURNAL\.md`/, `${a} : lit la mémoire partagée du crew`);
    assert.doesNotMatch(t, /ajoutes-y une ligne|Écris une ligne/i, `${a} : ne peut pas écrire → on ne le lui ordonne pas`);
  }
});

test('Phase 6 : audit de complétude + panel critique en parallèle avant roadmap', () => {
  const np = newProject();
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
