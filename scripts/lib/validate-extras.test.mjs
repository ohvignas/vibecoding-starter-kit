// scripts/lib/validate-extras.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExtras } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('tous les templates extras existent', () => {
  assert.deepEqual(validateExtras(ROOT), []);
});
