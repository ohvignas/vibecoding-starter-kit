import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN_SKILL_SPECS, SHADCN_NOTE, SUPERPOWERS, resolveAssets } from './matrix.mjs';

test('DESIGN_SKILL_SPECS : 3 specs, repos vérifiés, 4 skills', () => {
  assert.equal(DESIGN_SKILL_SPECS.length, 3);
  const repos = DESIGN_SKILL_SPECS.map((s) => s.repo);
  assert.ok(repos.includes('github.com/anthropics/skills'));
  assert.ok(repos.includes('github.com/vercel-labs/agent-skills'));
  assert.ok(repos.includes('github.com/nextlevelbuilder/ui-ux-pro-max-skill'));
  const all = DESIGN_SKILL_SPECS.flatMap((s) => s.skills);
  assert.deepEqual(all.sort(), ['brand-guidelines', 'frontend-design', 'ui-ux-pro-max', 'web-design-guidelines']);
});

test('SUPERPOWERS exporté + SHADCN_NOTE mentionne la clé payante', () => {
  assert.match(SUPERPOWERS['claude-code'], /plugin install superpowers/);
  assert.match(SHADCN_NOTE, /clé|payante|API/i);
});

test('resolveAssets : design retiré de inAssistant, superpowers gardé', () => {
  const p = resolveAssets('saas', 'cursor');
  assert.ok(!p.inAssistant.some((s) => /design/i.test(s.name)), 'plus de design dans inAssistant');
  assert.ok(p.inAssistant.some((s) => s.name === 'superpowers'));
});
