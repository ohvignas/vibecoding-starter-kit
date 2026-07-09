import fs from 'node:fs';
import path from 'node:path';
import { resolveStackManifest, SUPERPOWERS, SHADCN_NOTE } from './matrix.mjs';
import { mergeMcpConfig } from './mcp.mjs';
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
    write(rel, mergeMcpConfig(read(rel), manifest.mcp));
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
    if (isCursor) { write('.cursor/hooks.json', extendCursorHooks(read('.cursor/hooks.json'), manifest.checks.onEdit)); done.push('.cursor/hooks.json (checks)'); }
    else { write('.claude/settings.json', claudeSettings(read('.claude/settings.json'), manifest.checks.onEdit)); done.push('.claude/settings.json (checks)'); }
  } catch (e) { failed.push(`hooks assistant (${e.message})`); }

  // 6. A-FAIRE.md
  try { write('docs/A-FAIRE.md', renderSetupAi({ stack, assistant, manifest, superpowersCmd: SUPERPOWERS[assistant], shadcnNote: SHADCN_NOTE, skillsInstalled })); done.push('docs/A-FAIRE.md'); }
  catch (e) { failed.push(`SETUP-AI (${e.message})`); }

  // 6b. DOMAINS.md (catalogue métier de la stack)
  try { write('docs/DOMAINS.md', renderDomains({ stack, domains: manifest.domains, shared: SHARED_DOMAINS })); done.push('docs/DOMAINS.md'); }
  catch (e) { failed.push(`DOMAINS (${e.message})`); }

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
