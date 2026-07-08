import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

// Garantie comportementale : la règle « finir le travail » (anti-flemme / anti-placeholder)
// doit rester dans l'AGENTS.md généré (via loop-section) ET dans la règle Cursor toujours-active.
test('la règle anti-flemme est présente dans loop-section + 00-project.mdc', () => {
  for (const f of ['templates/agents/loop-section.md', 'templates/cursor/rules/00-project.mdc']) {
    const t = read(f);
    assert.match(t, /anti-flemme/i, `${f} : mention anti-flemme`);
    assert.match(t, /placeholder/i, `${f} : interdit les placeholders`);
    assert.match(t, /report|plus tard|pour l'instant/i, `${f} : interdit le report`);
  }
});
