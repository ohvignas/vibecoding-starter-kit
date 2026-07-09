import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const setup = fileURLToPath(new URL('../setup.mjs', import.meta.url));

// Régression : `npm create vibecoding-kit` / `npx` lancent le bin via un symlink
// node_modules/.bin/create-vibecoding-kit → process.argv[1] est le symlink, import.meta.url
// le realpath. Sans résolution de realpath, le garde d'entrée est faux → main() ne tourne
// jamais sous npx → scaffold no-op silencieux (exit 0, zéro fichier). Ce test le prouve.
// Windows : créer un symlink de fichier exige des droits admin/mode développeur → EPERM en CI.
// npm/npx utilise de toute façon un shim .cmd sur Windows, pas un symlink POSIX.
test('setup.mjs lancé via un symlink (comme npx) exécute bien main()', { skip: process.platform === 'win32' && 'symlink privileges requis sur Windows' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-npx-'));
  try {
    const link = path.join(tmp, 'create-vibecoding-kit');
    fs.symlinkSync(setup, link);
    // --dry-run : main() calcule et imprime le plan puis rend la main, sans rien écrire.
    const out = execFileSync(
      process.execPath,
      [link, 'demo', '--stack', 'saas', '--assistant', 'cursor', '--yes', '--dry-run'],
      { encoding: 'utf8' },
    );
    assert.match(out, /projectDir/, 'main() doit tourner via le symlink et émettre le plan --dry-run');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
