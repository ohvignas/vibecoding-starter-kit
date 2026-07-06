import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('le template ROADMAP a les dimensions + l’acceptation visuelle', () => {
  const t = fs.readFileSync('templates/roadmap/ROADMAP.md', 'utf8');
  assert.match(t, /Fondations/);
  assert.match(t, /Ce que tu vois/);
  for (const dim of ['Modèle de données', 'Auth', 'États', 'Déploiement']) assert.match(t, new RegExp(dim));
});

test('chaque cible de run décrit ce qu’on doit voir', () => {
  for (const [stack, needle] of [['saas', 'localhost'], ['mobile', 'expo start'], ['desktop', 'run start']]) {
    const t = fs.readFileSync(`templates/run/${stack}.md`, 'utf8');
    assert.match(t, /Ce que tu dois voir/);
    assert.match(t, new RegExp(needle));
  }
});
