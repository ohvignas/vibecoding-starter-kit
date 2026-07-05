// scripts/lib/dream-template.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDreamTemplate } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('template dream cohérent (propose-only)', () => {
  assert.deepEqual(validateDreamTemplate(ROOT), []);
});
