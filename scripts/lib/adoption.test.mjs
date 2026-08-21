import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STACK_AUCUNE, estAdopte } from './adoption.mjs';
import { parseArgs, validateArgs } from './args.mjs';
import { resolveAssets } from './matrix.mjs';

test('adoption — `aucune` est une valeur de stack légale', () => {
  assert.equal(STACK_AUCUNE, 'aucune');
  assert.equal(estAdopte('aucune'), true);
  assert.equal(estAdopte('saas'), false);
  const a = parseArgs(['--stack', 'aucune', '--assistant', 'cursor', '--project', 'x']);
  assert.deepEqual(validateArgs(a), [], 'validateArgs doit accepter aucune');
});

test('adoption — `aucune` ne livre ni règles de stack, ni ai-context, ni skill de stack', () => {
  for (const assistant of ['cursor', 'claude-code', 'codex']) {
    const { copies } = resolveAssets('aucune', assistant);
    const cibles = copies.map((c) => c.to);
    for (const interdit of ['AGENTS-stack.md', '.claude/skills/stack-aucune', '.cursor/rules/stack-aucune.mdc']) {
      assert.ok(!cibles.includes(interdit), `${assistant} : ${interdit} ne doit pas être livré sur aucune`);
    }
    assert.ok(!cibles.some((t) => t.startsWith('ai-context/')), `${assistant} : aucun ai-context sur aucune`);
  }
});

test('adoption — les 4 stacks offertes ne changent pas', () => {
  const { copies } = resolveAssets('saas', 'claude-code');
  assert.ok(copies.some((c) => c.to === 'AGENTS-stack.md'), 'saas doit toujours livrer ses règles');
});

test('adoption — scaffold `aucune` : exit 0, et aucun fichier de stack posé', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adopt-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}');
  execFileSync(process.execPath, [
    path.resolve('scripts/setup.mjs'),
    '--stack', 'aucune', '--assistant', 'claude-code', '--project', dir, '--no-skills', '--yes',
  ], { stdio: 'pipe' });
  for (const absent of ['.env.example', '.github/workflows/ci.yml', 'docs/examples/feature-exemple.md', 'AGENTS-stack.md', 'maquette', 'docs/ROADMAP.md']) {
    assert.ok(!fs.existsSync(path.join(dir, absent)), `${absent} ne doit pas être posé sur aucune`);
  }
  assert.ok(fs.existsSync(path.join(dir, 'docs/agents/JOURNAL.md')), 'JOURNAL.md DOIT être posé : deux règles gardées le citent');
});

test('adoption — package.json ressort octet pour octet identique', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
  const avant = '{ "name": "x", "scripts": { "dev": "next dev" } }';
  fs.writeFileSync(path.join(dir, 'package.json'), avant);
  execFileSync(process.execPath, [path.resolve('scripts/setup.mjs'), '--stack', 'aucune', '--assistant', 'cursor', '--project', dir, '--no-skills', '--yes'], { stdio: 'pipe' });
  assert.equal(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), avant, 'le kit a touché son package.json');
});
