import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveStackManifest, SUPERPOWERS } from './matrix.mjs';
import { mergeMcpConfig, expandMcpCommands } from './mcp.mjs';
import { extendCursorHooks, claudeSettings, prePushScript, preCommitCheckLine } from './hooks.mjs';
import { renderSetupAi } from './setup-ai.mjs';
import { renderDomains, secretsBlock, MARQUE_SECRETS, SHARED_DOMAINS, DOMAIN_TRIGGERS } from './domains.mjs';
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
    // Codex n'a AUCUN hook d'édition → ne jamais lui écrire de `.claude/` fantôme. La note
    // « lance npm run typecheck » qui le lui dit fait partie du rendu de docs/RUN.md (run-doc.mjs),
    // avec la note « backend en local » : un seul endroit produit ce fichier, donc `--refresh`
    // sait le reproduire.
    if (isCursor) { write('.cursor/hooks.json', extendCursorHooks(read('.cursor/hooks.json'), manifest.checks.onEdit)); done.push('.cursor/hooks.json (checks)'); }
    else if (assistant === 'claude-code') { write('.claude/settings.json', claudeSettings(read('.claude/settings.json'), manifest.checks.onEdit)); done.push('.claude/settings.json (checks)'); }
  } catch (e) { failed.push(`hooks assistant (${e.message})`); }

  // 6. A-FAIRE.md — JAMAIS écrasé s'il existe : l'utilisateur y coche ses cases, et `/new-project`
  // y ajoute une section « Pour ton projet ». Un `update` réécrivait tout et effaçait les deux.
  // La version fraîche part en `.new` pour qu'il puisse comparer.
  try {
    const rendered = renderSetupAi({ stack, assistant, manifest, superpowersCmd: SUPERPOWERS[assistant], skillsInstalled });
    if (read('docs/A-FAIRE.md') === null) { write('docs/A-FAIRE.md', rendered); done.push('docs/A-FAIRE.md'); }
    else { write('docs/A-FAIRE.md.new', rendered); done.push('docs/A-FAIRE.md.new (ton A-FAIRE.md est conservé)'); }
  } catch (e) { failed.push(`A-FAIRE (${e.message})`); }

  // 6b. DOMAINS.md (catalogue métier de la stack) — même protection : `/new-project` l'enrichit.
  // Les déclencheurs (DOMAIN_TRIGGERS) sont RENDUS dans le catalogue, et appliqués au PRD s'il
  // existe déjà (`selectDomains`) : la table pilotait jusqu'ici du vide.
  try {
    const rendered = renderDomains({ stack, domains: manifest.domains, shared: SHARED_DOMAINS, triggers: DOMAIN_TRIGGERS, prd: read('docs/PRD.md') ?? '' });
    if (read('docs/DOMAINS.md') === null) { write('docs/DOMAINS.md', rendered); done.push('docs/DOMAINS.md'); }
    else { write('docs/DOMAINS.md.new', rendered); done.push('docs/DOMAINS.md.new (ton DOMAINS.md est conservé)'); }
  } catch (e) { failed.push(`DOMAINS (${e.message})`); }

  // 6b-bis. Les secrets que ces domaines DÉCLARENT, ajoutés au `.env.example` du projet.
  // Ils étaient déclarés dans matrix.mjs et n'atterrissaient nulle part : l'utilisateur
  // découvrait la variable manquante au runtime. Additif et idempotent.
  try {
    const env = read('.env.example');
    if (env !== null && !env.includes(MARQUE_SECRETS)) {
      const bloc = secretsBlock(manifest.domains, env);
      if (bloc) { write('.env.example', `${env.replace(/\s*$/, '\n')}\n${bloc}`); done.push('.env.example (secrets des capacités)'); }
    }
  } catch (e) { failed.push(`.env.example secrets (${e.message})`); }

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
