// scripts/lib/refresh.mjs — logique de mise à jour NON destructive, partagée par
// `setup.mjs` (bin `--refresh`) ET `update.mjs`. Vivre ici évite l'import circulaire :
// les deux entrées importent d'ici, jamais l'une de l'autre.
import fs from 'node:fs';
import path from 'node:path';
import { renderAgentsFile } from './agents-file.mjs';
import { mergeManagedSection, MARK_START_PREFIX } from './managed-section.mjs';
import { kitOwnedFiles, kitOwnedGenerated } from './kit-owned.mjs';
import { toCursorAgent } from './agent-frontmatter.mjs';
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
  // `learning` vient du MANIFESTE, pas du défaut : sans lui, un projet créé en `--no-learning`
  // voyait la section « Mode apprentissage » revenir au premier `--refresh`. Absent (projet
  // d'avant la mémorisation) = `true`, exactement le défaut du scaffold.
  const learning = manifest.learning !== false;
  const fresh = renderAgentsFile({ source, stack, assistant, commandsDir, learning });
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const dest = path.join(projectDir, name);
    if (!fs.existsSync(dest)) { skipped.push(`${name} (absent)`); continue; }
    const existing = fs.readFileSync(dest, 'utf8');
    if (!existing.includes(MARK_START_PREFIX)) migrated.push(name); // vieux projet : bloc préfixé, ancien contenu conservé dessous
    const merged = mergeManagedSection(existing, fresh);
    if (merged !== existing) { if (!dryRun) fs.writeFileSync(dest, merged); changed.push(name); }
  }
  for (const { from, to, transform } of kitOwnedFiles(stack, assistant)) {
    const src = path.join(source, from), dst = path.join(projectDir, to);
    if (!fs.existsSync(src)) { skipped.push(`${to} (source absente)`); continue; }
    let next;
    // Le transform est appliqué AVANT la comparaison : sinon un agent Cursor serait réécrit
    // à chaque passage (le fichier sur disque ne peut jamais égaler la source brute).
    try {
      next = fs.readFileSync(src, 'utf8');
      if (transform === 'cursor-agent') next = toCursorAgent(next);
    } catch (e) { skipped.push(`${to} (illisible : ${e.message})`); continue; }
    const prev = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
    if (prev !== next) { if (!dryRun) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, next); } changed.push(to); }
  }

  // Fichiers CALCULÉS par le scaffold (hooks git, config MCP, docs/RUN.md) : sans eux, un projet
  // gardait à vie les hooks et les serveurs MCP de sa date de création.
  for (const g of kitOwnedGenerated(stack, assistant, { backend: manifest.backend })) {
    const dst = path.join(projectDir, g.to);
    const prev = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
    // Un fichier jamais posé (projet d'une autre version, assistant sans ce fichier) n'est pas
    // créé de nulle part par un refresh : c'est le rôle du scaffold.
    if (prev === null) { skipped.push(`${g.to} (absent du projet)`); continue; }
    let next;
    try {
      const tpl = g.from ? fs.readFileSync(path.join(source, g.from), 'utf8') : null;
      next = g.render(prev, tpl);
    } catch (e) { skipped.push(`${g.to} (non régénérable : ${e.message})`); continue; }
    if (prev === next) continue;
    // policy 'new' : le fichier peut porter des notes de l'utilisateur → on livre à côté.
    const cible = g.policy === 'new' ? `${g.to}.new` : g.to;
    const dstFinal = path.join(projectDir, cible);
    if (g.policy === 'new' && fs.existsSync(dstFinal) && fs.readFileSync(dstFinal, 'utf8') === next) continue;
    if (!dryRun) {
      fs.mkdirSync(path.dirname(dstFinal), { recursive: true });
      fs.writeFileSync(dstFinal, next);
      if (g.mode) fs.chmodSync(dstFinal, g.mode);
    }
    changed.push(cible);
  }
  return { changed, skipped, migrated };
}
