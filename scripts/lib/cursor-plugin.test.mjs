import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCursorPlugin, pluginManifest } from '../build-cursor-plugin.mjs';

// fileURLToPath (pas new URL(...).pathname) : sur Windows .pathname renvoie /D:/… → chemin cassé.
const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('buildCursorPlugin : manifeste + 10 commandes + règle, fidèles aux templates', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-plugin-'));
  buildCursorPlugin(KIT, out);

  const manifest = JSON.parse(fs.readFileSync(path.join(out, '.cursor-plugin', 'plugin.json'), 'utf8'));
  assert.equal(manifest.name, 'vibecoding');
  assert.equal(manifest.name, pluginManifest().name);

  for (const c of ['init-vibecoding', 'new-project', 'build', 'sos', 'deploy']) {
    assert.ok(fs.existsSync(path.join(out, 'commands', `${c}.md`)), `commands/${c}.md`);
  }
  assert.ok(fs.existsSync(path.join(out, 'rules', '00-project.mdc')), 'rules/00-project.mdc');

  // Source de vérité = templates (pas de dérive) : le contenu est identique.
  assert.equal(
    fs.readFileSync(path.join(out, 'commands', 'new-project.md'), 'utf8'),
    fs.readFileSync(path.join(KIT, 'templates/commands/new-project.md'), 'utf8'),
  );
  fs.rmSync(out, { recursive: true, force: true });
});

// `cursor-plugin/` est un ARTEFACT COMMITTÉ : une seconde copie, suivie par git, de fichiers dont
// la source vit dans `templates/`. D10 (`commands.test.mjs`) confronte déjà la moitié `commands/`
// à sa source. L'autre moitié — `rules/` et le manifeste — n'était comparée NULLE PART : le test
// ci-dessus construit dans un dossier jetable et ne regarde jamais la copie committée. Mesuré :
// `cursor-plugin/rules/00-project.mdc` a porté pendant un commit une phrase que sa source venait
// de perdre, sans qu'aucun test ne bronche. Le canal touché est la marketplace Cursor —
// `cursor-plugin/` est hors du champ `files` de package.json, il ne part pas par npm.
//
// On compare l'ARBORESCENCE, pas seulement le contenu d'un fichier connu : un fichier ajouté au
// build sans être committé, ou laissé derrière après que le build a cessé de le produire, dérive
// exactement pareil. `commands/` est exclu — c'est le périmètre de D10, le dupliquer ferait
// rougir deux tests pour une seule cause.
const listeRecursive = (racine) => {
  const out = [];
  const marche = (rel) => {
    for (const e of fs.readdirSync(path.join(racine, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) marche(r); else out.push(r);
    }
  };
  marche('');
  return out;
};

test('le plugin Cursor committé (règles + manifeste) est ce que le build produit AUJOURD\'HUI', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-plugin-drift-'));
  buildCursorPlugin(KIT, out);
  const committe = path.join(KIT, 'cursor-plugin');
  const horsCommands = (f) => !f.startsWith('commands/');

  const attendus = listeRecursive(out).filter(horsCommands);
  const presents = listeRecursive(committe).filter(horsCommands);
  assert.deepEqual(presents, attendus,
    'cursor-plugin/ n\'a pas les mêmes fichiers (hors commands/) que ce que le build produit — relance `node scripts/build-cursor-plugin.mjs` et commite l\'artefact');

  for (const f of attendus) {
    assert.equal(
      fs.readFileSync(path.join(committe, f), 'utf8'),
      fs.readFileSync(path.join(out, f), 'utf8'),
      `cursor-plugin/${f} a dérivé de sa source — relance \`node scripts/build-cursor-plugin.mjs\` et commite l'artefact`);
  }
  assert.ok(attendus.includes('rules/00-project.mdc'), 'montage : la règle n\'est plus dans le build, ce contrôle ne compare plus rien');
  fs.rmSync(out, { recursive: true, force: true });
});
