import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Régression : pour Cursor, les commandes doivent être des slash-commands TYPABLES
// (`.cursor/commands/<cmd>.md`), pas des Skills auto-déclenchées (`.cursor/skills/…`).
test('cursor : commandes en .cursor/commands/*.md, pas en .cursor/skills', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-cur-'));
  // Identité git explicite : le setup fait un commit initial (Plan 7) — CI sans user.name global.
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
  };
  execFileSync(
    process.execPath,
    ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'cursor', '--project', dir, '--no-skills', '--yes'],
    { stdio: 'ignore', env },
  );
  for (const c of ['new-project', 'build', 'new-feature', 'edit-design', 'doctor', 'next', 'sos']) {
    assert.ok(fs.existsSync(path.join(dir, `.cursor/commands/${c}.md`)), `.cursor/commands/${c}.md doit exister`);
  }
  assert.ok(!fs.existsSync(path.join(dir, '.cursor/skills')), 'plus de dossier .cursor/skills');
});
