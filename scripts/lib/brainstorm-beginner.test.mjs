import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNewProjectCommand, validateNewFeatureCommand } from './validate-commands.mjs';
import { fichiersDuRunbook } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('new-project : parcours expliqué + cadrage débutant, validateur vert', () => {
  // Le parcours est resté dans l'entrée, le brainstorm est parti dans l'étape `01-…` : les deux
  // promesses ci-dessous se jugent sur le runbook ENTIER, énuméré depuis `commands-list.mjs`.
  const t = fichiersDuRunbook(ROOT, 'new-project').map((f) => read(f)).join('\n');
  assert.match(t, /Ce qu'on va faire ensemble/);
  assert.match(t, /un exemple concret/i);
  assert.match(t, /zéro jargon/i);
  assert.match(t, /langage simple/i);
  assert.match(t, /\bBrainstorm\b/); // le mot isolé requis par le validateur reste présent
  assert.deepEqual(validateNewProjectCommand(ROOT), []);
});

test('new-feature : brainstorm débutant, validateur vert', () => {
  // Même raison que ci-dessus : `/new-feature` est découpé, et le brainstorm débutant est parti
  // dans l'étape `01-…`. Le runbook ENTIER, énuméré depuis `commands-list.mjs`.
  const fichiers = fichiersDuRunbook(ROOT, 'new-feature');
  assert.ok(fichiers.length >= 6, `montage : ${fichiers.length} fichier(s) — le runbook découpé n'est pas lu en entier`);
  const t = fichiers.map((f) => read(f)).join('\n');
  assert.match(t, /langage simple/i);
  assert.match(t, /exemple concret/i);
  assert.match(t, /brainstorming/); // requis par le validateur
  assert.match(t, /Critères d'acceptation/); // template conservé
  assert.deepEqual(validateNewFeatureCommand(ROOT), []);
});
