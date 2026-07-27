import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

// Garantie comportementale : la règle « finir le travail » (anti-flemme / anti-placeholder) doit
// rester atteignable depuis les DEUX fichiers toujours-actifs de Cursor — mais écrite une seule fois.
// Elle était dupliquée dans `00-project.mdc`, qui en donnait une version divergente (revue du Lot B) ;
// désormais `loop-section` la définit, `00-project.mdc` y renvoie.
test('anti-flemme : définie dans loop-section, atteignable depuis 00-project.mdc', () => {
  const loop = read('templates/agents/loop-section.md');
  assert.match(loop, /anti-flemme/i, 'loop-section : mention anti-flemme');
  assert.match(loop, /placeholder/i, 'loop-section : interdit les placeholders');
  assert.match(loop, /report|plus tard|pour l'instant/i, 'loop-section : interdit le report');

  const mdc = read('templates/cursor/rules/00-project.mdc');
  assert.match(mdc, /placeholder|report/i, '00-project.mdc : le sujet est nommé');
  assert.match(mdc, /Boucle d'itération/, "00-project.mdc : renvoie à la règle qui la définit, sans la redéfinir");
});
