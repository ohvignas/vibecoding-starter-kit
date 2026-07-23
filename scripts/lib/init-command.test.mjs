import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
test('init-vibecoding : détecte, scaffolde OU met à jour, onboarde', () => {
  const t = fs.readFileSync(path.join(ROOT, 'templates/commands/init-vibecoding.md'), 'utf8');
  for (const s of ['.vibecoding.json', 'create-vibecoding-kit@latest', '--refresh', 'docs/A-FAIRE.md', '/new-project']) {
    assert.ok(t.includes(s), `manque « ${s} »`);
  }
});
