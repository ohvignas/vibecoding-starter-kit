import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRoadmapStep } from '../../templates/cursor/hooks/inject-memory.mjs';

const ROADMAP = `# Roadmap
- [x] ## 0. Fondations
  - ✅ Ce que tu vois : l'app démarre
- [ ] ## 1. Connexion des utilisateurs
  - ✅ Ce que tu vois : l'écran de login
- [ ] ## 2. Liste des rendez-vous
`;

test('renvoie le 1er jalon non coché', () => {
  assert.equal(nextRoadmapStep(ROADMAP), '1. Connexion des utilisateurs');
});

test('null si tout est coché ou vide', () => {
  assert.equal(nextRoadmapStep('- [x] ## 0. Fait'), null);
  assert.equal(nextRoadmapStep(''), null);
});
