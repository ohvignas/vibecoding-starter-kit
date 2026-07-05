import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateDreamTemplate } from './validate-commands.mjs';

function makeRoot({ badPerms = false, omitSeed = false, omitWorkflow = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dream-'));
  fs.mkdirSync(path.join(root, 'templates/dream'), { recursive: true });
  if (!omitWorkflow) {
    let wf = 'on:\n  schedule:\n    - cron: "0 */4 * * *"\npermissions:\n  contents: write\n';
    wf += 'allowedTools Edit(docs/DREAM.md)\n';
    if (badPerms) wf += 'pull-requests: write\n';
    fs.writeFileSync(path.join(root, 'templates/dream/dream.yml'), wf);
  }
  if (!omitSeed) fs.writeFileSync(path.join(root, 'templates/dream/DREAM.md'), '# DREAM');
  return root;
}

test('workflow propose-only complet → aucune erreur', () => {
  assert.deepEqual(validateDreamTemplate(makeRoot()), []);
});
test('permissions PR write → erreur (pas propose-only)', () => {
  assert.ok(validateDreamTemplate(makeRoot({ badPerms: true })).some(e => /propose-only|pull-requests/.test(e)));
});
test('DREAM.md seed manquant → erreur', () => {
  assert.ok(validateDreamTemplate(makeRoot({ omitSeed: true })).some(e => /DREAM\.md/.test(e)));
});
test('workflow manquant → erreur', () => {
  assert.ok(validateDreamTemplate(makeRoot({ omitWorkflow: true })).some(e => /dream\.yml/.test(e)));
});
