import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNewProjectCommand } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('le runbook /new-project est cohérent (phases + sorties + templates)', () => {
  assert.deepEqual(validateNewProjectCommand(ROOT), []);
});
