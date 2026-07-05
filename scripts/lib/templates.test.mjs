// scripts/lib/templates.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCursorMdc, renderProjectAgentsMd, toSkillMd } from './templates.mjs';

test('toCursorMdc encadre le corps avec un frontmatter', () => {
  const out = toCursorMdc({ description: 'Règles X', body: 'CONTENU' });
  assert.match(out, /^---\n/);
  assert.match(out, /description: "Règles X"/);
  assert.match(out, /alwaysApply: true/);
  assert.match(out, /CONTENU/);
});

test('toCursorMdc échappe les descriptions dangereuses', () => {
  const out = toCursorMdc({ description: 'a\nb: c', body: 'X' });
  assert.match(out, /description: "a b: c"/);      // newline -> space, quoted
  const fm = out.split('---')[1];                   // frontmatter block
  assert.equal(fm.match(/description:/g).length, 1); // description on a single line
});

test('toSkillMd produit un SKILL.md avec frontmatter name+description', () => {
  const out = toSkillMd({ name: 'new-project', description: 'Fondation', body: 'CONTENU' });
  assert.match(out, /^---\nname: new-project\n/);
  assert.match(out, /description: "Fondation"/);
  assert.match(out, /CONTENU/);
});

test('renderProjectAgentsMd compose la boucle + @import mémoire, sans BMAD', () => {
  const out = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', commandsDir: '.cursor/commands', loopSection: 'BOUCLE-SP', designRule: 'REGLE-DESIGN', memoryRules: 'REGLES-MEMOIRE' });
  assert.match(out, /@docs\/memory\/index\.md/);
  assert.match(out, /BOUCLE-SP/);
  assert.match(out, /REGLE-DESIGN/);
  assert.match(out, /REGLES-MEMOIRE/);
  assert.match(out, /saas/);
  assert.match(out, /new-project/);
  assert.doesNotMatch(out, /BMAD/i);
});
