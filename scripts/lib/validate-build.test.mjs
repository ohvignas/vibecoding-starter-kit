import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBuildCommand } from './validate-commands.mjs';

test('/build runbook référence la boucle, le visuel et la roadmap', () => {
  assert.deepEqual(validateBuildCommand('.'), []);
});
