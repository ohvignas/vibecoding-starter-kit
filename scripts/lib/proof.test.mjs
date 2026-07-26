import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('proof-rule : statuts, hiérarchie, interdits, max 3 tentatives', () => {
  const t = read('templates/agents/proof-rule.md');
  for (const s of ['PROUVÉ', 'NON PROUVÉ', 'BLOQUÉ', 'sortie brute', 'ROUGE avant', 'requête réseau', 'contexte frais', 'skip', '3 tentatives']) {
    assert.match(t, new RegExp(s));
  }
});

test('journal : graines JOURNAL.md + state.yaml (append-only, statuts)', () => {
  const j = read('templates/journal/JOURNAL.md');
  assert.match(j, /append-only/);
  assert.match(j, /lit ce fichier avant/);
  const s = read('templates/journal/state.yaml');
  assert.match(s, /repair_attempts/);
  assert.match(s, /blocked_reason/);
});
