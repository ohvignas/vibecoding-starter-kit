import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESIGN_SKILL_SPECS, AGENT_SKILL_SPECS } from './matrix.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('AGENT_SKILL_SPECS : forme valide, jamais --all, pas de doublon de dépôt avec DESIGN_SKILL_SPECS', () => {
  const repos = new Set(DESIGN_SKILL_SPECS.map((s) => s.repo));
  for (const s of AGENT_SKILL_SPECS) {
    assert.ok(s.repo && s.label && Array.isArray(s.skills) && s.skills.length);
    assert.equal(s.all, undefined);
    assert.equal(repos.has(s.repo), false, `${s.repo} : déjà cloné par DESIGN_SKILL_SPECS → fusionner`);
  }
});

test('chaque skill installé est déclaré par l\'agent qui l\'utilise', () => {
  const all = [...DESIGN_SKILL_SPECS, ...AGENT_SKILL_SPECS].flatMap((s) => s.skills);
  for (const [agent, skill] of [['test-runner', 'webapp-testing'], ['security-reviewer', 'security-threat-model'], ['code-reviewer', 'find-bugs']]) {
    assert.ok(all.includes(skill), `${skill} doit être installé`);
    // le nom doit apparaître comme ÉLÉMENT DE LISTE, pas dans le champ name (`code-review` ≠ `code-reviewer`)
    assert.match(read(`templates/agents/subagents/${agent}.md`), new RegExp(`^\\s*-\\s*${skill}\\s*$`, 'm'), `${agent} déclare ${skill}`);
  }
});
