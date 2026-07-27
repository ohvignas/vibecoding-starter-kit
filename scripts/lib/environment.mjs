import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveStackManifest, SUPERPOWERS, SHADCN_NOTE } from './matrix.mjs';
import { mergeMcpConfig, expandMcpCommands } from './mcp.mjs';
import { extendCursorHooks, claudeSettings, prePushScript, preCommitCheckLine } from './hooks.mjs';
import { renderSetupAi } from './setup-ai.mjs';
import { renderDomains, SHARED_DOMAINS } from './domains.mjs';
import { ensureDir } from './fsops.mjs';

// Écrit l'environnement IA d'une stack dans un projet (déclaratif, additif, non destructif).
export function writeStackEnvironment({ projectDir, source, stack, assistant, skillsInstalled = true }) {
  const done = [], failed = [];
  const manifest = resolveStackManifest(stack, assistant);
  const isCursor = assistant === 'cursor';
  const abs = (rel) => path.join(projectDir, rel);
  const read = (rel) => { try { return fs.readFileSync(abs(rel), 'utf8'); } catch { return null; } };
  const write = (rel, content) => { ensureDir(path.dirname(abs(rel))); fs.writeFileSync(abs(rel), content); };

  // 1. MCP mergé (par stack)
  try {
    const rel = isCursor ? '.cursor/mcp.json' : '.mcp.json';
    write(rel, mergeMcpConfig(read(rel), expandMcpCommands(manifest.mcp, os.homedir())));
    done.push(`${rel} (MCP)`);
  } catch (e) { failed.push(`mcp (${e.message})`); }

  // 2. Runner de checks
  try {
    ensureDir(abs('.githooks'));
    fs.copyFileSync(path.join(source, 'templates/hooks/framework/checks.mjs'), abs('.githooks/checks.mjs'));
    done.push('.githooks/checks.mjs');
  } catch (e) { failed.push(`checks.mjs (${e.message})`); }

  // 3. pre-push (checks lourds)
  try {
    write('.githooks/pre-push', prePushScript(manifest.checks.prePush));
    fs.chmodSync(abs('.githooks/pre-push'), 0o755);
    done.push('.githooks/pre-push');
  } catch (e) { failed.push(`pre-push (${e.message})`); }

  // 4. pre-commit : ajoute la ligne de checks si le hook existe déjà (le scan secrets reste)
  try {
    const pc = read('.githooks/pre-commit');
    if (pc) {
      const line = preCommitCheckLine(manifest.checks.preCommit);
      if (!pc.includes(line)) {
        write('.githooks/pre-commit', pc.replace(/\s*$/, '\n') + line + '\n');
        fs.chmodSync(abs('.githooks/pre-commit'), 0o755);
        done.push('.githooks/pre-commit (checks)');
      }
    }
  } catch (e) { failed.push(`pre-commit checks (${e.message})`); }

  // 5. Câblage hooks assistant
  try {
    // 3 branches : Codex n'a AUCUN hook d'édition → ne jamais lui écrire de `.claude/` fantôme
    // (la note « lance npm run typecheck » lui est ajoutée dans docs/RUN.md, voir plus bas).
    if (isCursor) { write('.cursor/hooks.json', extendCursorHooks(read('.cursor/hooks.json'), manifest.checks.onEdit)); done.push('.cursor/hooks.json (checks)'); }
    else if (assistant === 'claude-code') { write('.claude/settings.json', claudeSettings(read('.claude/settings.json'), manifest.checks.onEdit)); done.push('.claude/settings.json (checks)'); }
    else {
      // Codex : pas de hook d'édition → on le dit une seule fois dans docs/RUN.md (garde `includes`,
      // même motif que la note « Backend en local » : un re-run ne duplique jamais la ligne).
      const NOTE = "> Codex n'a pas de hook d'édition : lance `npm run typecheck` après tes modifications.";
      const cur = read('docs/RUN.md');
      if (cur !== null && !cur.includes("Codex n'a pas de hook d'édition")) {
        write('docs/RUN.md', `${NOTE}\n\n${cur}`);
        done.push('docs/RUN.md (note typecheck Codex)');
      }
    }
  } catch (e) { failed.push(`hooks assistant (${e.message})`); }

  // 6. A-FAIRE.md — JAMAIS écrasé s'il existe : l'utilisateur y coche ses cases, et `/new-project`
  // y ajoute une section « Pour ton projet ». Un `update` réécrivait tout et effaçait les deux.
  // La version fraîche part en `.new` pour qu'il puisse comparer.
  try {
    const rendered = renderSetupAi({ stack, assistant, manifest, superpowersCmd: SUPERPOWERS[assistant], shadcnNote: SHADCN_NOTE, skillsInstalled });
    if (read('docs/A-FAIRE.md') === null) { write('docs/A-FAIRE.md', rendered); done.push('docs/A-FAIRE.md'); }
    else { write('docs/A-FAIRE.md.new', rendered); done.push('docs/A-FAIRE.md.new (ton A-FAIRE.md est conservé)'); }
  } catch (e) { failed.push(`A-FAIRE (${e.message})`); }

  // 6b. DOMAINS.md (catalogue métier de la stack) — même protection : `/new-project` l'enrichit.
  try {
    const rendered = renderDomains({ stack, domains: manifest.domains, shared: SHARED_DOMAINS });
    if (read('docs/DOMAINS.md') === null) { write('docs/DOMAINS.md', rendered); done.push('docs/DOMAINS.md'); }
    else { write('docs/DOMAINS.md.new', rendered); done.push('docs/DOMAINS.md.new (ton DOMAINS.md est conservé)'); }
  } catch (e) { failed.push(`DOMAINS (${e.message})`); }

  // 6c. Mémoire partagée du crew, dans `docs/agents/` — jamais écrasée : journal append-only, état
  // courant, et l'inventaire de complétude que les 3 critiques reçoivent par son chemin (Lot C).
  try {
    for (const [rel, seed] of [['docs/agents/JOURNAL.md', 'templates/journal/JOURNAL.md'], ['docs/agents/state.yaml', 'templates/journal/state.yaml'], ['docs/agents/inventaire.md', 'templates/journal/inventaire.md']]) {
      if (read(rel) !== null) continue;
      write(rel, fs.readFileSync(path.join(source, seed), 'utf8'));
      done.push(rel);
    }
  } catch (e) { failed.push(`journal (${e.message})`); }

  // 7. Scripts package.json si présent
  try {
    const pkg = read('package.json');
    if (pkg) {
      const j = JSON.parse(pkg); j.scripts = j.scripts || {};
      let changed = false;
      for (const [k, v] of Object.entries(manifest.scripts)) if (!(k in j.scripts)) { j.scripts[k] = v; changed = true; }
      if (changed) { write('package.json', JSON.stringify(j, null, 2) + '\n'); done.push('package.json (scripts)'); }
    }
  } catch (e) { failed.push(`package.json (${e.message})`); }

  return { done, failed };
}
