// scripts/lib/windows.test.mjs — E7. Ce que le kit peut prouver DEPUIS macOS/Linux sur le cas
// Windows : la présence et le contenu des règles de fin de ligne, et la cohérence de la règle
// « npx est npx.cmd » entre l'installeur et le hook copié dans le projet.
//
// CE QUI N'EST PAS PROUVÉ ICI, et ne peut pas l'être sans une machine Windows : qu'un
// `spawnSync('npx.cmd', …, { shell: true })` aboutisse réellement, et que git applique bien
// `eol=lf` au checkout. Ces deux points restent à vérifier sur Windows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRunCommand } from './external.mjs';
import { resolveCheckCommand } from '../../templates/hooks/framework/checks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Les hooks git du kit (`.githooks/pre-commit`, `pre-push`) sont des scripts bash. Checkoutés en
// CRLF sur Windows, ils échouent avec un `bad interpreter: ^M` illisible pour un débutant.
const REGLES_EOL = [/^\*\s+text=auto/m, /^\*\.mjs\s+text\s+eol=lf/m];

test('E7 — le dépôt du kit fixe ses fins de ligne (.gitattributes)', () => {
  const ga = read('.gitattributes');
  for (const r of REGLES_EOL) assert.match(ga, r);
});

test('E7 — le projet généré reçoit les mêmes règles, et les scripts de hooks en LF', () => {
  const tpl = read('templates/gitattributes');
  for (const r of REGLES_EOL) assert.match(tpl, r);
  assert.match(tpl, /\.githooks\/\*\s+text\s+eol=lf/, 'les hooks bash cassent en CRLF (bad interpreter: ^M)');
});

test('E7 — installeur et hook copié disent la MÊME chose de npx sur Windows', () => {
  for (const platform of ['win32', 'darwin', 'linux']) {
    const installeur = buildRunCommand('npx', platform);
    const hook = resolveCheckCommand(['npx', 'x'], platform);
    assert.equal(hook.file, installeur.cmd, `${platform} : exécutable divergent`);
    assert.deepEqual(hook.options, installeur.options, `${platform} : options divergentes`);
  }
});
