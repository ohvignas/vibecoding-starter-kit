import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSetupAi } from './setup-ai.mjs';
import { resolveStackManifest, VISUAL_CHECK_STACKS } from './matrix.mjs';

const call = (stack) => renderSetupAi({ stack, assistant: 'cursor', manifest: resolveStackManifest(stack, 'cursor'), superpowersCmd: 'x', shadcnNote: 'y', skillsInstalled: true });
const renderFor = call;

test('A-FAIRE documente les outils de vérification sur TOUTES les stacks', () => {
  for (const s of ['saas', 'mobile', 'desktop', 'vitrine']) {
    const md = renderFor(s);
    for (const t of ['semgrep', 'gitleaks', 'osv-scanner']) assert.match(md, new RegExp(t), `${s} : ${t}`);
  }
});

test('PixelRAG rendu dans A-FAIRE pour les stacks web, PAS mobile', () => {
  assert.deepEqual(VISUAL_CHECK_STACKS, ['saas', 'desktop', 'vitrine']);
  for (const s of VISUAL_CHECK_STACKS) {
    assert.match(call(s), /PixelRAG/, `${s} doit avoir PixelRAG`);
    assert.match(call(s), /pip install pixelrag/);
  }
  assert.doesNotMatch(call('mobile'), /PixelRAG/, 'mobile = RN, pas de PixelRAG');
});
