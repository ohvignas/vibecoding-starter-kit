// scripts/lib/memory-templates.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMemoryTemplates } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('templates mémoire cohérents', () => {
  assert.deepEqual(validateMemoryTemplates(ROOT), []);
});
