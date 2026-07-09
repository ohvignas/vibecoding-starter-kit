import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCursorPlugin, pluginManifest } from '../build-cursor-plugin.mjs';

// fileURLToPath (pas new URL(...).pathname) : sur Windows .pathname renvoie /D:/… → chemin cassé.
const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('buildCursorPlugin : manifeste + 9 commandes + règle, fidèles aux templates', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-plugin-'));
  buildCursorPlugin(KIT, out);

  const manifest = JSON.parse(fs.readFileSync(path.join(out, '.cursor-plugin', 'plugin.json'), 'utf8'));
  assert.equal(manifest.name, 'vibecoding');
  assert.equal(manifest.name, pluginManifest().name);

  for (const c of ['new-project', 'build', 'sos', 'debug', 'deploy']) {
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
