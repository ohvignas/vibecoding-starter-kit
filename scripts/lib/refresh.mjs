// scripts/lib/refresh.mjs — logique de mise à jour NON destructive, partagée par
// `setup.mjs` (bin `--refresh`) ET `update.mjs`. Vivre ici évite l'import circulaire :
// les deux entrées importent d'ici, jamais l'une de l'autre.
import fs from 'node:fs';
import path from 'node:path';
import { renderAgentsFile } from './agents-file.mjs';
import { mergeManagedSection, MARK_START_PREFIX } from './managed-section.mjs';
import { kitOwnedFiles } from './kit-owned.mjs';
import { resolveAssets } from './matrix.mjs';

export function readVibecodingManifest(projectDir) {
  const mf = path.join(projectDir, '.vibecoding.json');
  if (!fs.existsSync(mf)) throw new Error(`Pas de .vibecoding.json dans ${projectDir} — ce dossier n'a pas été généré par le kit (lance d'abord le scaffold).`);
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  if (!m.stack || !m.assistant) throw new Error('.vibecoding.json incomplet (stack/assistant manquant).');
  return m;
}

// Régénère la section managée d'AGENTS.md/CLAUDE.md + écrase les fichiers 100% kit. Ne touche RIEN d'autre.
export function refreshProject({ source, projectDir, manifest, dryRun = false }) {
  const { stack, assistant } = manifest;
  const { commandsDir } = resolveAssets(stack, assistant);
  const changed = [], skipped = [], migrated = [];
  const fresh = renderAgentsFile({ source, stack, assistant, commandsDir });
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const dest = path.join(projectDir, name);
    if (!fs.existsSync(dest)) { skipped.push(`${name} (absent)`); continue; }
    const existing = fs.readFileSync(dest, 'utf8');
    if (!existing.includes(MARK_START_PREFIX)) migrated.push(name); // vieux projet : bloc préfixé, ancien contenu conservé dessous
    const merged = mergeManagedSection(existing, fresh);
    if (merged !== existing) { if (!dryRun) fs.writeFileSync(dest, merged); changed.push(name); }
  }
  for (const { from, to } of kitOwnedFiles(stack, assistant)) {
    const src = path.join(source, from), dst = path.join(projectDir, to);
    if (!fs.existsSync(src)) { skipped.push(`${to} (source absente)`); continue; }
    const next = fs.readFileSync(src, 'utf8');
    const prev = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
    if (prev !== next) { if (!dryRun) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, next); } changed.push(to); }
  }
  return { changed, skipped, migrated };
}
