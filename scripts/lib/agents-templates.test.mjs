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
test('design-rule : les 5 skills design + design.md', () => {
  const t = read('templates/agents/design-rule.md');
  for (const s of ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'shadcnblocks', 'brand-guidelines', 'design.md']) {
    assert.match(t, new RegExp(s.replace(/[-.]/g, '\\$&')));
  }
});
