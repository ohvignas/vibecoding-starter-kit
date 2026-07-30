// scripts/lib/report.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport } from './report.mjs';

test('le rapport liste installé, à-faire-dans-l-IA, sauté, échecs', () => {
  const out = formatReport({
    project: 'mon-app', stack: 'saas', assistant: 'cursor',
    done: ['.cursor/rules/stack-saas.mdc'],
    inAssistant: [{ name: 'superpowers', command: '/add-plugin superpowers' }],
    skipped: [{ name: 'awesome-cursorrules', reason: 'Cursor only' }],
    failed: ['BMAD (timeout)'],
  });
  assert.match(out, /✅ .*stack-saas\.mdc/);
  assert.match(out, /superpowers : \/add-plugin superpowers/);
  assert.match(out, /awesome-cursorrules/);
  assert.match(out, /❌ BMAD/);
  // Prochaine étape : le prompt imprimé juste après, puis `/help` — l'entrée du kit.
  // (Elle disait « lance /new-project », alors que rien n'est encore installé à cette seconde.)
  assert.match(out, /\/help/);
  assert.doesNotMatch(out, /lance \/new-project/);
});

test('le rapport affiche les fichiers conservés (jamais écrasés)', () => {
  const out = formatReport({
    project: '/abs/mon-app', stack: 'saas', assistant: 'cursor',
    done: [], kept: ['docs/ROADMAP.md', '⚠️ AGENTS.md existant conservé (nouvelle version : AGENTS.md.new)'],
    inAssistant: [], skipped: [], failed: [],
  });
  assert.match(out, /Conservé/);
  assert.match(out, /AGENTS\.md\.new/);
  assert.match(out, /docs\/ROADMAP\.md/);
});
