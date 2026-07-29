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

// Windows : `npx` n'est pas un exécutable mais un script `npx.cmd`. Depuis Node 20.12 (correctif
// CVE-2024-27980), le lancer sans `shell: true` échoue (ENOENT/EINVAL) — et le hook affichait
// alors « problème détecté » alors que RIEN n'avait tourné. Même règle que `buildRunCommand`
// côté installeur (scripts/lib/external.mjs) ; ce fichier est copié dans le projet, il ne peut
// rien importer du kit, la règle est donc réécrite ici — un test la compare aux deux endroits.
export function resolveCheckCommand(cmd, platform = process.platform) {
  const [file, ...args] = cmd;
  if (platform === 'win32' && file === 'npx') return { file: 'npx.cmd', args, options: { shell: true } };
  return { file, args, options: {} };
}

export function runChecks(ids, { cwd = process.cwd(), spawn = spawnSync, log = console.log, platform = process.platform } = {}) {
  let warnings = 0;
  for (const c of selectChecks(ids, { cwd })) {
    if (!c.willRun) { log(`· check ${c.id} sauté (${c.reason})`); continue; }
    const { file, args, options } = resolveCheckCommand(c.cmd, platform);
    const r = spawn(file, args, { cwd, stdio: 'inherit', ...options });
    // Deux issues à ne PAS confondre : l'outil n'a pas démarré (status null + error) ≠ l'outil
    // a tourné et n'est pas content (status ≠ 0). La première n'accuse pas le code de l'élève.
    if (r.error || r.status === null || r.status === undefined) {
      warnings++;
      log(`⚠ check ${c.id} : n'a pas pu être lancé (${r.error ? r.error.message : 'processus interrompu'}) — rien n'a été vérifié`);
      continue;
    }
    if (r.status !== 0) { warnings++; log(`⚠ check ${c.id} : problème détecté (non bloquant)`); }
  }
  if (warnings) log(`⚠ ${warnings} avertissement(s) — corrige quand tu peux (/doctor pour le bilan).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runChecks(process.argv.slice(2)));
}
