import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('stacks shadcn : SHADCNBLOCKS_API_KEY (pro, optionnel) dans .env.example', () => {
  for (const s of ['saas', 'desktop', 'vitrine']) {
    assert.match(read(`templates/env/${s}.env.example`), /SHADCNBLOCKS_API_KEY=/, `${s} : clé shadcnblocks manquante`);
  }
  // mobile n'a pas shadcn → pas de clé
  assert.doesNotMatch(read('templates/env/mobile.env.example'), /SHADCNBLOCKS_API_KEY/);
});
