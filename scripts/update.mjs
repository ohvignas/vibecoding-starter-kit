#!/usr/bin/env node
// scripts/update.mjs — met à jour un projet existant avec les nouveaux fichiers du kit.
// Lit le manifeste `.vibecoding.json` du projet, puis re-joue les copies du kit de façon
// NON DESTRUCTIVE (copyIfAbsent n'écrase rien) : tu récupères les nouveautés, ton travail est intact.
// Usage : node <kit>/scripts/update.mjs [--project <dossier>]  (défaut : dossier courant)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function readVibecodingManifest(projectDir) {
  const mf = path.join(projectDir, '.vibecoding.json');
  if (!fs.existsSync(mf)) {
    throw new Error(`Pas de .vibecoding.json dans ${projectDir} — ce dossier n'a pas été généré par le kit (lance d'abord scripts/setup.mjs).`);
  }
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  if (!m.stack || !m.assistant) throw new Error('.vibecoding.json incomplet (stack/assistant manquant).');
  return m;
}

export function buildUpdateArgs({ stack, assistant }, projectDir, kitRoot) {
  // Re-joue le setup : copyIfAbsent n'écrase jamais → seuls les fichiers manquants sont ajoutés.
  return ['scripts/setup.mjs', '--source', kitRoot, '--stack', stack, '--assistant', assistant, '--project', projectDir, '--no-skills', '--yes'];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const i = process.argv.indexOf('--project');
  const projectDir = path.resolve(i !== -1 ? process.argv[i + 1] : process.cwd());
  try {
    const manifest = readVibecodingManifest(projectDir);
    console.log(`Mise à jour de ${projectDir} (${manifest.stack} / ${manifest.assistant})…`);
    execFileSync(process.execPath, buildUpdateArgs(manifest, projectDir, kitRoot), { stdio: 'inherit' });
    console.log('\nÀ jour. Tes fichiers existants n\'ont pas été touchés ; seuls les nouveaux fichiers du kit ont été ajoutés.');
  } catch (e) { console.error(e.message); process.exit(1); }
}
