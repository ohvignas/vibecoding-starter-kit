// scripts/lib/external.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pickFromClone, installCaveman, buildSkillAddArgs, installSkills, buildRunCommand } from './external.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vs-ext-')); }

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

test('buildSkillAddArgs : all → --all (et jamais --skill)', () => {
  const args = buildSkillAddArgs({ label: 'convex', repo: 'get-convex/agent-skills', all: true, skills: ['ignoré'] }, 'cursor');
  assert.deepEqual(args, ['-y', 'skills', 'add', 'get-convex/agent-skills', '--all', '-a', 'cursor', '--yes']);
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

test('installSkills : passe cwd (le projet) à chaque run — sinon skills au mauvais endroit', () => {
  const cwds = [];
  const run = (cmd, args, opts) => { cwds.push(opts && opts.cwd); };
  installSkills([{ label: 'a', repo: 'a/b' }, { label: 'c', repo: 'c/d' }], 'cursor', run, '/proj');
  assert.deepEqual(cwds, ['/proj', '/proj']);
});

test('buildRunCommand : npx → npx.cmd + shell sur win32 uniquement', () => {
  assert.deepEqual(buildRunCommand('npx', 'win32'), { cmd: 'npx.cmd', options: { shell: true } });
  assert.deepEqual(buildRunCommand('npx', 'darwin'), { cmd: 'npx', options: {} });
  assert.deepEqual(buildRunCommand('npx', 'linux'), { cmd: 'npx', options: {} });
});

test('buildRunCommand : git inchangé sur toutes les plateformes', () => {
  assert.deepEqual(buildRunCommand('git', 'win32'), { cmd: 'git', options: {} });
  assert.deepEqual(buildRunCommand('git', 'darwin'), { cmd: 'git', options: {} });
});
