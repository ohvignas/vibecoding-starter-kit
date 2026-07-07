// scripts/lib/external.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectByTags, pickFromClone, installCaveman, buildSkillAddArgs, installSkills } from './external.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vs-ext-')); }

test('selectByTags filtre par sous-chaîne', () => {
  const d = tmp();
  for (const f of ['typescript.mdc', 'react.mdc', 'python.mdc']) fs.writeFileSync(path.join(d, f), '');
  assert.deepEqual(selectByTags(d, ['typescript', 'react']).sort(), ['react.mdc', 'typescript.mdc']);
});

test('pickFromClone signale une source manquante', () => {
  const clone = tmp(), proj = tmp();
  fs.writeFileSync(path.join(clone, 'CLAUDE.md'), 'k');
  const res = pickFromClone(clone, [{ src: 'CLAUDE.md', to: 'AGENTS-karpathy.md' }, { src: 'NOPE', to: 'x' }], proj);
  assert.equal(res[0].status, 'copied');
  assert.equal(res[1].status, 'missing-src');
});

test('installCaveman lance le script d\'install officiel', () => {
  const calls = [];
  installCaveman((cmd, args) => calls.push([cmd, args]));
  assert.equal(calls[0][0], 'bash');
  assert.match(calls[0][1][1], /caveman\/main\/install\.sh/);
});

test('buildSkillAddArgs : repo + skills + assistant', () => {
  const args = buildSkillAddArgs({ label: 'x', repo: 'github.com/anthropics/skills', skills: ['frontend-design', 'brand-guidelines'] }, 'cursor');
  assert.deepEqual(args, ['-y', 'skills', 'add', 'github.com/anthropics/skills', '--skill', 'frontend-design', 'brand-guidelines', '-a', 'cursor', '--yes']);
});

test('buildSkillAddArgs : sans skills → pas de --skill', () => {
  const args = buildSkillAddArgs({ label: 'x', repo: 'owner/repo' }, 'codex');
  assert.deepEqual(args, ['-y', 'skills', 'add', 'owner/repo', '-a', 'codex', '--yes']);
});

test('installSkills : lance chaque spec, échec gracieux', () => {
  const calls = [];
  const run = (cmd, args) => { calls.push([cmd, args]); if (args.includes('boom/repo')) throw new Error('offline'); };
  const specs = [
    { label: 'ok1', repo: 'a/b', skills: ['s1'] },
    { label: 'ko', repo: 'boom/repo' },
    { label: 'ok2', repo: 'c/d' },
  ];
  const res = installSkills(specs, 'cursor', run);
  assert.deepEqual(res.done, ['ok1', 'ok2']);
  assert.equal(res.failed.length, 1);
  assert.match(res.failed[0], /ko .*offline/);
  assert.equal(calls.length, 3);
  assert.equal(calls[0][0], 'npx');
});
