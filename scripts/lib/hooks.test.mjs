import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extendCursorHooks, claudeSettings, prePushScript, preCommitCheckLine } from './hooks.mjs';

test('extendCursorHooks ajoute un afterFileEdit checks, idempotent', () => {
  const start = JSON.stringify({ version: 1, hooks: { afterFileEdit: [{ command: 'node .cursor/hooks/log-edit.mjs', type: 'command' }] } });
  const once = extendCursorHooks(start, ['typecheck']);
  const j = JSON.parse(once);
  assert.equal(j.hooks.afterFileEdit.length, 2);
  assert.ok(j.hooks.afterFileEdit.some((h) => h.command === 'node .githooks/checks.mjs typecheck'));
  const twice = extendCursorHooks(once, ['typecheck']);
  assert.equal(JSON.parse(twice).hooks.afterFileEdit.length, 2, 'idempotent');
});

test('claudeSettings crée un PostToolUse Edit|Write', () => {
  const out = claudeSettings(null, ['typecheck']);
  const j = JSON.parse(out);
  const entry = j.hooks.PostToolUse[0];
  assert.equal(entry.matcher, 'Edit|Write');
  assert.equal(entry.hooks[0].command, 'node .githooks/checks.mjs typecheck');
});

test('prePushScript vide → true ; non vide → commande checks', () => {
  assert.match(prePushScript([]), /\ntrue\n/);
  assert.match(prePushScript(['security']), /node \.githooks\/checks\.mjs security/);
});

test('preCommitCheckLine', () => {
  assert.equal(preCommitCheckLine(['typecheck', 'lint']), 'node .githooks/checks.mjs typecheck lint');
});
