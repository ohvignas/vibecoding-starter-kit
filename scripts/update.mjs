#!/usr/bin/env node
// scripts/update.mjs — met à jour un projet existant avec les nouveaux fichiers du kit.
// Lit le manifeste `.vibecoding.json` du projet, puis re-joue les copies du kit de façon
// NON DESTRUCTIVE (copyIfAbsent n'écrase rien) : tu récupères les nouveautés, ton travail est intact.
// Usage : node <kit>/scripts/update.mjs [--project <dossier>]  (défaut : dossier courant)
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readVibecodingManifest, refreshProject } from './lib/refresh.mjs';
// Source unique : refreshProject + readVibecodingManifest vivent dans lib/refresh.mjs (partagé avec setup.mjs).
// Re-export pour compat : update.test.mjs importe encore readVibecodingManifest depuis ce module.
export { readVibecodingManifest, refreshProject };

export function buildUpdateArgs({ stack, assistant }, projectDir, kitRoot) {
  // Re-joue le setup : copyIfAbsent n'écrase jamais → seuls les fichiers manquants sont ajoutés.
  // Chemin ABSOLU du script : update peut être lancé depuis le dossier du projet (cwd ≠ kit).
  return [path.join(kitRoot, 'scripts', 'setup.mjs'), '--source', kitRoot, '--stack', stack, '--assistant', assistant, '--project', projectDir, '--no-skills', '--yes'];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const i = process.argv.indexOf('--project');
  const projectDir = path.resolve(i !== -1 ? process.argv[i + 1] : process.cwd());
  try {
    const manifest = readVibecodingManifest(projectDir);
    console.log(`Mise à jour de ${projectDir} (${manifest.stack} / ${manifest.assistant}${manifest.kitVersion ? `, généré avec le kit ${manifest.kitVersion}` : ''})…`);
    const refresh = process.argv.includes('--refresh');
    const dryRun = process.argv.includes('--dry-run');
    if (refresh) {
      const { changed, skipped, migrated } = refreshProject({ source: kitRoot, projectDir, manifest, dryRun });
      console.log(dryRun ? '\n[dry-run] Fichiers qui seraient régénérés :' : '\nFichiers régénérés (kit) :');
      for (const c of changed) console.log(`  ~ ${c}`);
      if (!changed.length) console.log('  (rien à changer — déjà à jour)');
      if (migrated.length) console.log(`\n⚠️ Projet d'une ancienne version (sans marqueurs) : les nouvelles règles ont été ajoutées EN HAUT de ${migrated.join(', ')}. Ouvre le(s) fichier(s) et supprime l'ancien bloc de règles en double sous « vibecoding:end » (garde tes notes perso).`);
      console.log('\nZone « Tes règles à toi », src/, docs/ (PRD/design/mémoire) : NON touchés.');
      if (!dryRun) console.log('Astuce : relance avec `--dry-run` d\'abord pour prévisualiser.');
    } else {
      execFileSync(process.execPath, buildUpdateArgs(manifest, projectDir, kitRoot), { stdio: 'inherit' });
      console.log('\nÀ jour (fichiers neufs ajoutés). Pour aussi rafraîchir les règles/runbooks du kit : relance avec `--refresh`.');
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
