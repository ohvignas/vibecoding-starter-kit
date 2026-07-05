// scripts/lib/validate-memory.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateMemoryTemplates } from './validate-commands.mjs';

const MEM = ['index', 'gotchas', 'conventions', 'decisions', 'archive'];
const RULE_REFS = ['index', 'gotchas', 'conventions', 'decisions', 'consolidate-memory'];

function makeRoot({ omitMem = null, omitRules = false, ruleOmitRef = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-'));
  fs.mkdirSync(path.join(root, 'templates/memory'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/agents'), { recursive: true });
  for (const m of MEM) if (m !== omitMem) fs.writeFileSync(path.join(root, `templates/memory/${m}.md`), `# ${m}`);
  if (!omitRules) fs.writeFileSync(path.join(root, 'templates/agents/memory-rules.md'), RULE_REFS.filter(r => r !== ruleOmitRef).join(' '));
  return root;
}

test('complet → aucune erreur', () => {
  assert.deepEqual(validateMemoryTemplates(makeRoot()), []);
});
test('fichier mémoire manquant → erreur', () => {
  assert.ok(validateMemoryTemplates(makeRoot({ omitMem: 'gotchas' })).some(e => /gotchas/.test(e)));
});
test('memory-rules absent → erreur', () => {
  assert.ok(validateMemoryTemplates(makeRoot({ omitRules: true })).some(e => /memory-rules/.test(e)));
});
test('memory-rules ne référence pas consolidate-memory → erreur', () => {
  assert.ok(validateMemoryTemplates(makeRoot({ ruleOmitRef: 'consolidate-memory' })).some(e => /consolidate-memory/.test(e)));
});
