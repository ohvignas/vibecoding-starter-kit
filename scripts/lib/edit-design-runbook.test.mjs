// scripts/lib/edit-design-runbook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEditDesignCommand } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('le runbook /edit-design est cohérent (4 skills + design.md)', () => {
  assert.deepEqual(validateEditDesignCommand(ROOT), []);
});
