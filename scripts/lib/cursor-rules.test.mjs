import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('00-project.mdc est une règle Always minuscule', () => {
  const t = fs.readFileSync('templates/cursor/rules/00-project.mdc', 'utf8');
  assert.match(t, /alwaysApply:\s*true/);
  assert.match(t, /secret/i);
  assert.ok(t.split('\n').length < 25, 'règle courte');
});

test('règles auto-attachées : frontmatter globs + alwaysApply:false', () => {
  const cases = [
    ['saas/convex.mdc', 'convex/\\*\\*'],
    ['saas/tanstack.mdc', 'src/routes/\\*\\*'],
    ['mobile/expo.mdc', 'app/\\*\\*'],
    ['desktop/electron-security.mdc', 'preload'],
  ];
  for (const [f, needle] of cases) {
    const t = fs.readFileSync(`templates/cursor/rules/${f}`, 'utf8');
    assert.match(t, /alwaysApply:\s*false/, f);
    assert.match(t, /globs:/, f);
    assert.match(t, new RegExp(needle), f);
  }
});
