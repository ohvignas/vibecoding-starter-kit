#!/usr/bin/env node
// Runner de checks vibe-stack — défensif et WARN-ONLY (exit 0 toujours).
// Skip proprement si l'outil/fichier n'est pas là (projet vide ou pré-scaffold).
// Usage : node .githooks/checks.mjs typecheck lint
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const CHECKS = {
  typecheck:    { cmd: ['npx', 'tsc', '--noEmit'],                         needs: 'tsconfig.json' },
  lint:         { cmd: ['npx', 'biome', 'check', '.'],                     needs: 'biome.json' },
  'lint-expo':  { cmd: ['npx', 'expo', 'lint'],                            needs: 'app.json' },
  'deps-check': { cmd: ['npx', 'expo', 'install', '--check'],             needs: 'app.json' },
  doctor:       { cmd: ['npx', 'expo-doctor'],                            needs: 'app.json' },
  security:     { cmd: ['npx', '@doyensec/electronegativity', '-i', '.'], needs: 'package.json' },
};

export function selectChecks(ids, { cwd = process.cwd() } = {}) {
  return ids.map((id) => {
    const def = CHECKS[id];
    if (!def) return { id, willRun: false, reason: 'inconnu' };
    if (!fs.existsSync(path.join(cwd, def.needs))) return { id, willRun: false, reason: `absent: ${def.needs}` };
    return { id, willRun: true, cmd: def.cmd };
  });
}

export function runChecks(ids, { cwd = process.cwd() } = {}) {
  let warnings = 0;
  for (const c of selectChecks(ids, { cwd })) {
    if (!c.willRun) { console.log(`· check ${c.id} sauté (${c.reason})`); continue; }
    const r = spawnSync(c.cmd[0], c.cmd.slice(1), { cwd, stdio: 'inherit' });
    if (r.status !== 0) { warnings++; console.log(`⚠ check ${c.id} : problème détecté (non bloquant)`); }
  }
  if (warnings) console.log(`⚠ ${warnings} avertissement(s) — corrige quand tu peux (/doctor pour le bilan).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runChecks(process.argv.slice(2)));
}
