import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePlaybook } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('le playbook et les sources de la matrice existent', () => {
  assert.deepEqual(validatePlaybook(ROOT), []);
});
