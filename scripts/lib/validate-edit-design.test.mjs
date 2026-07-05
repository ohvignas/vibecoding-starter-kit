import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateEditDesignCommand } from './validate-commands.mjs';

const SKILLS = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'shadcnblocks', 'brand-guidelines'];

function makeRoot({ omitSkill = null, omitDesignMd = false, omitRunbook = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ed-'));
  if (!omitRunbook) {
    fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
    const skills = SKILLS.filter(s => s !== omitSkill).join(' ');
    const dmd = omitDesignMd ? '' : 'docs/design.md';
    fs.writeFileSync(path.join(root, 'templates/commands/edit-design.md'), `${skills}\n${dmd}\n`);
  }
  return root;
}

test('runbook complet → aucune erreur', () => {
  assert.deepEqual(validateEditDesignCommand(makeRoot()), []);
});
test('skill manquant → erreur', () => {
  assert.ok(validateEditDesignCommand(makeRoot({ omitSkill: 'shadcnblocks' })).some(e => /shadcnblocks/.test(e)));
});
test('design.md manquant → erreur', () => {
  assert.ok(validateEditDesignCommand(makeRoot({ omitDesignMd: true })).some(e => /design\.md/.test(e)));
});
test('runbook absent → erreur unique', () => {
  assert.ok(validateEditDesignCommand(makeRoot({ omitRunbook: true })).some(e => /edit-design\.md/.test(e)));
});
