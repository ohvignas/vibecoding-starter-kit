// scripts/lib/new-feature-runbook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNewFeatureCommand } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('le runbook /new-feature est cohérent (toutes les étapes + loop-section)', () => {
  assert.deepEqual(validateNewFeatureCommand(ROOT), []);
});
