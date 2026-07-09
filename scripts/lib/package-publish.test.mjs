import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('package.json est publiable en scaffolder npm', () => {
  assert.equal(pkg.name, 'create-vibecoding-kit');       // `npm create vibecoding-kit`
  assert.equal(pkg.private, undefined, 'pas de private:true (sinon npm publish refuse)');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.bin['create-vibecoding-kit'], 'scripts/setup.mjs');
  assert.ok(pkg.engines && pkg.engines.node, 'engines.node présent');
  // La whitelist embarque ce que setup lit au runtime, et RIEN de superflu.
  for (const d of ['scripts', 'templates', 'stacks', 'ai-context']) assert.ok(pkg.files.includes(d), `files doit inclure ${d}`);
  for (const d of ['docs', 'formateur', '.superpowers']) assert.ok(!pkg.files.includes(d), `files ne doit PAS inclure ${d}`);
});

test('version bumpée pour la release licence (≥ 0.3.0)', () => {
  const [maj, min] = pkg.version.split('.').map(Number);
  assert.ok(maj > 0 || min >= 3, `version ${pkg.version} attendue ≥ 0.3.0`);
});

test('le bin pointe un fichier réel avec shebang node', () => {
  const bin = fs.readFileSync(new URL('../../scripts/setup.mjs', import.meta.url), 'utf8');
  assert.match(bin.split('\n')[0], /^#!.*node/);
});
