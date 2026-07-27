import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETUP = path.join(ROOT, 'scripts', 'setup.mjs');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};

// Chaque assistant a SON dossier d'agents natif. Codex n'en a pas → docs/agents/crew/.
const DEST = { cursor: '.cursor/agents', 'claude-code': '.claude/agents', codex: 'docs/agents/crew' };

function scaffold(assistant) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `vs-agents-${assistant}-`));
  const proj = path.join(dir, 'app');
  execFileSync(process.execPath, [SETUP, proj, '--source', ROOT, '--stack', 'saas', '--assistant', assistant, '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
  return { dir, proj };
}
const count = (p) => (fs.existsSync(p) ? fs.readdirSync(p).filter((f) => f.endsWith('.md')).length : 0);

for (const assistant of ['cursor', 'claude-code', 'codex']) {
  test(`${assistant} : les 7 agents dans ${DEST[assistant]} et nulle part ailleurs`, () => {
    const { dir, proj } = scaffold(assistant);
    try {
      assert.equal(count(path.join(proj, DEST[assistant])), 7, `7 agents dans ${DEST[assistant]}`);
      for (const [a, d] of Object.entries(DEST)) {
        if (a === assistant) continue;
        assert.equal(count(path.join(proj, d)), 0, `aucun agent dans ${d}`);
      }
      if (assistant === 'cursor') {
        const t = fs.readFileSync(path.join(proj, '.cursor/agents/verificateur.md'), 'utf8');
        assert.match(t, /model: inherit/, 'frontmatter transformé pour Cursor');
      }
      if (assistant === 'codex') {
        assert.equal(fs.existsSync(path.join(proj, '.claude')), false, 'Codex : aucun dossier .claude/');
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
