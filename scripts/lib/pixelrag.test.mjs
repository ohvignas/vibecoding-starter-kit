import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSetupAi } from './setup-ai.mjs';
import { resolveStackManifest, VISUAL_CHECK_STACKS } from './matrix.mjs';

const call = (stack) => renderSetupAi({ stack, assistant: 'cursor', manifest: resolveStackManifest(stack, 'cursor'), superpowersCmd: 'x', shadcnNote: 'y', skillsInstalled: true });

test('PixelRAG rendu dans A-FAIRE pour les stacks web, PAS mobile', () => {
  assert.deepEqual(VISUAL_CHECK_STACKS, ['saas', 'desktop', 'vitrine']);
  for (const s of VISUAL_CHECK_STACKS) {
    assert.match(call(s), /PixelRAG/, `${s} doit avoir PixelRAG`);
    assert.match(call(s), /pip install pixelrag/);
  }
  assert.doesNotMatch(call('mobile'), /PixelRAG/, 'mobile = RN, pas de PixelRAG');
});
