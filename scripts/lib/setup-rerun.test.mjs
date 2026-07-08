import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};

function runSetup(projectDir) {
  return execFileSync(
    process.execPath,
    ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'claude-code', '--project', projectDir, '--no-skills', '--yes'],
    { encoding: 'utf8', env: GIT_ENV },
  );
}

test('re-run : rapport 3 états + AGENTS.md.new + exit 0 quand tout va bien', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-rerun-'));
  runSetup(dir);
  const out2 = runSetup(dir); // 2e run : rien n'est écrasé
  assert.match(out2, /Conservé/);
  assert.match(out2, /⚠️ AGENTS\.md existant conservé \(nouvelle version : AGENTS\.md\.new\)/);
  assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md.new')), 'AGENTS.md.new écrit');
  assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md.new')), 'CLAUDE.md.new écrit');
});

test('échecs de copies (source vide) → exit ≠ 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-fail-'));
  const sourceVide = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-vide-'));
  let code = 0;
  try {
    execFileSync(
      process.execPath,
      ['scripts/setup.mjs', '--source', sourceVide, '--stack', 'saas', '--assistant', 'claude-code', '--project', dir, '--no-skills', '--yes'],
      { stdio: 'pipe', env: GIT_ENV },
    );
  } catch (e) { code = e.status ?? 1; }
  assert.notEqual(code, 0, 'exit 1 attendu quand failed[] non vide');
});
