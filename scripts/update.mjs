#!/usr/bin/env node
// scripts/update.mjs — met à jour un projet existant avec les nouveaux fichiers du kit.
// Lit le manifeste `.vibecoding.json` du projet, puis re-joue les copies du kit de façon
// NON DESTRUCTIVE (copyIfAbsent n'écrase rien) : tu récupères les nouveautés, ton travail est intact.
// Usage : node <kit>/scripts/update.mjs [--project <dossier>]  (défaut : dossier courant)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderAgentsFile } from './lib/agents-file.mjs';
import { mergeManagedSection } from './lib/managed-section.mjs';
import { kitOwnedFiles } from './lib/kit-owned.mjs';
import { resolveAssets } from './lib/matrix.mjs';

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
  // Chemin ABSOLU du script : update peut être lancé depuis le dossier du projet (cwd ≠ kit).
  return [path.join(kitRoot, 'scripts', 'setup.mjs'), '--source', kitRoot, '--stack', stack, '--assistant', assistant, '--project', projectDir, '--no-skills', '--yes'];
}

// Régénère la section managée d'AGENTS.md/CLAUDE.md + écrase les fichiers 100% kit.
// Ne touche RIEN d'autre. dryRun=true → calcule sans écrire.
export function refreshProject({ source, projectDir, manifest, dryRun = false }) {
  const { stack, assistant } = manifest;
  const { commandsDir } = resolveAssets(stack, assistant);
  const changed = [], skipped = [];

  // 1) AGENTS.md / CLAUDE.md : fusion de la section managée
  const fresh = renderAgentsFile({ source, stack, assistant, commandsDir });
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const dest = path.join(projectDir, name);
    if (!fs.existsSync(dest)) { skipped.push(`${name} (absent)`); continue; }
    const existing = fs.readFileSync(dest, 'utf8');
    const merged = mergeManagedSection(existing, fresh);
    if (merged !== existing) { if (!dryRun) fs.writeFileSync(dest, merged); changed.push(name); }
  }

  // 2) Fichiers 100% kit : écrasement ciblé (seulement si le contenu diffère)
  for (const { from, to } of kitOwnedFiles(stack, assistant)) {
    const src = path.join(source, from), dst = path.join(projectDir, to);
    if (!fs.existsSync(src)) { skipped.push(`${to} (source absente)`); continue; }
    const next = fs.readFileSync(src, 'utf8');
    const prev = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
    if (prev !== next) {
      if (!dryRun) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, next); }
      changed.push(to);
    }
  }
  return { changed, skipped };
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
      const { changed, skipped } = refreshProject({ source: kitRoot, projectDir, manifest, dryRun });
      console.log(dryRun ? '\n[dry-run] Fichiers qui seraient régénérés :' : '\nFichiers régénérés (kit) :');
      for (const c of changed) console.log(`  ~ ${c}`);
      if (!changed.length) console.log('  (rien à changer — déjà à jour)');
      console.log('\nZone « Tes règles à toi », src/, docs/ (PRD/design/mémoire) : NON touchés.');
      if (!dryRun) console.log('Astuce : relance avec `--dry-run` d\'abord pour prévisualiser.');
    } else {
      execFileSync(process.execPath, buildUpdateArgs(manifest, projectDir, kitRoot), { stdio: 'inherit' });
      console.log('\nÀ jour (fichiers neufs ajoutés). Pour aussi rafraîchir les règles/runbooks du kit : relance avec `--refresh`.');
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
