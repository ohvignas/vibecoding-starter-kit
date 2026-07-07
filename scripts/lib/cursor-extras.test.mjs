import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('BUGBOT.md a la checklist sécu', () => {
  const t = fs.readFileSync('templates/cursor/BUGBOT.md', 'utf8');
  assert.match(t, /secret/i);
  assert.match(t, /Convex/i);
  assert.match(t, /Electron|contextIsolation/i);
});

test('environment.json par stack : JSON valide avec terminals', () => {
  for (const s of ['saas', 'mobile', 'desktop']) {
    const j = JSON.parse(fs.readFileSync(`templates/cursor/environment/${s}.json`, 'utf8'));
    assert.ok(j.install, `${s}: install`);
    assert.ok(Array.isArray(j.terminals) && j.terminals.length, `${s}: terminals`);
  }
});

test('.cursorindexingignore exclut le généré, pas .env', () => {
  const t = fs.readFileSync('templates/cursor/cursorindexingignore', 'utf8');
  assert.match(t, /_generated/);
  assert.doesNotMatch(t, /\.env/);
});
