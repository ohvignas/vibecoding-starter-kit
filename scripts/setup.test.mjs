import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildRunPlan } from './setup.mjs';

test('buildRunPlan résout la matrice et le dossier projet absolu', () => {
  const { assets, projectDir } = buildRunPlan({ stack: 'saas', assistant: 'cursor', project: 'mon-app', source: '.' });
  assert.equal(assets.commandsDir, '.cursor/commands');
  assert.equal(projectDir, path.resolve('mon-app'));
});
