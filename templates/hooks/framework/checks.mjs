#!/usr/bin/env node
// Runner de checks vibe-stack — défensif et WARN-ONLY (exit 0 toujours).
// Skip proprement si l'outil/fichier n'est pas là (projet vide ou pré-scaffold).
// Usage : node .githooks/checks.mjs typecheck lint
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// `script` = le nom du script package.json que la STACK a déclaré pour ce check. Sans lui, le
// hook lançait `npx tsc --noEmit` partout — y compris sur une vitrine Astro, où `tsc` ne lit
// AUCUN `.astro` et sort donc 0 sans rien avoir vérifié, pendant que la stack déclarait
// `astro check`. Le check dit maintenant la vérité : il lance ce que la stack a déclaré.
export const CHECKS = {
  typecheck:    { cmd: ['npx', 'tsc', '--noEmit'],             needs: 'tsconfig.json', script: 'typecheck' },
  lint:         { cmd: ['npx', 'biome', 'check', '.'],         needs: 'biome.json',    script: 'lint' },
  'lint-expo':  { cmd: ['npx', 'expo', 'lint'],                needs: 'app.json' },
  'deps-check': { cmd: ['npx', 'expo', 'install', '--check'],  needs: 'app.json' },
  doctor:       { cmd: ['npx', 'expo-doctor'],                 needs: 'app.json' },
  // Remplace l'ancien check `security`, qui appelait `@doyensec/electronegativity` — paquet npm
  // figé au 09/03/2023. `npm audit` est livré avec npm : rien à installer, rien à pourrir.
  audit:        { cmd: ['npm', 'audit', '--audit-level=high'], needs: 'package-lock.json' },
};

// Le script déclaré par la stack l'emporte sur la commande par défaut — s'il existe vraiment
// dans le package.json du projet. Un package.json illisible ne fait pas tomber le hook.
function scriptCommand(cwd, name) {
  if (!name) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    return pkg && pkg.scripts && pkg.scripts[name] ? ['npm', 'run', name] : null;
  } catch { return null; }
}

export function selectChecks(ids, { cwd = process.cwd() } = {}) {
  return ids.map((id) => {
    const def = CHECKS[id];
    if (!def) return { id, willRun: false, reason: 'inconnu' };
    if (!fs.existsSync(path.join(cwd, def.needs))) return { id, willRun: false, reason: `absent: ${def.needs}` };
    const declare = scriptCommand(cwd, def.script);
    return { id, willRun: true, cmd: declare ?? def.cmd, via: declare ? 'script' : 'defaut' };
  });
}

// Windows : `npx` n'est pas un exécutable mais un script `npx.cmd`. Depuis Node 20.12 (correctif
// CVE-2024-27980), le lancer sans `shell: true` échoue (ENOENT/EINVAL) — et le hook affichait
// alors « problème détecté » alors que RIEN n'avait tourné. Même règle que `buildRunCommand`
// côté installeur (scripts/lib/external.mjs) ; ce fichier est copié dans le projet, il ne peut
// rien importer du kit, la règle est donc réécrite ici — un test la compare aux deux endroits.
// `npm` est logé à la même enseigne (`npm.cmd`) : depuis que les checks lancent le script
// déclaré par la stack, le hook l'invoque autant que `npx`.
const CMD_WINDOWS = new Set(['npx', 'npm']);
export function resolveCheckCommand(cmd, platform = process.platform) {
  const [file, ...args] = cmd;
  if (platform === 'win32' && CMD_WINDOWS.has(file)) return { file: `${file}.cmd`, args, options: { shell: true } };
  return { file, args, options: {} };
}

export function runChecks(ids, { cwd = process.cwd(), spawn = spawnSync, log = console.log, platform = process.platform } = {}) {
  let warnings = 0;
  for (const c of selectChecks(ids, { cwd })) {
    if (!c.willRun) { log(`· check ${c.id} sauté (${c.reason})`); continue; }
    // Le défaut peut ne rien vérifier du tout : sur une vitrine, `tsc --noEmit` ne lit pas les
    // `.astro` et sort vert. Tant que le projet n'a pas déclaré son script, on le DIT — sinon le
    // hook affiche un succès pour un contrôle qui n'a rien contrôlé.
    if (c.via === 'defaut') log(`· check ${c.id} : aucun script "${c.id}" dans package.json → repli sur \`${c.cmd.join(' ')}\`, qui ne couvre peut-être pas ta stack (voir docs/A-FAIRE.md)`);
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
