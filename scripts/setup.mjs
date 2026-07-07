#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs, validateArgs } from './lib/args.mjs';
import { resolveAssets, DESIGN_SKILL_SPECS, SUPERPOWERS } from './lib/matrix.mjs';
import { renderProjectAgentsMd, toCursorMdc } from './lib/templates.mjs';
import { ensureDir, copyIfAbsent, copyDirIfAbsent } from './lib/fsops.mjs';
import { cloneRepo, pickFromClone, selectByTags, installCaveman, installSkills } from './lib/external.mjs';
import { formatReport } from './lib/report.mjs';
import { meetsNode, ensureGit } from './lib/prereqs.mjs';
import { writeStackEnvironment } from './lib/environment.mjs';
import readline from 'node:readline/promises';
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard } from './lib/wizard.mjs';
import { supportsColor, ok } from './lib/ui.mjs';

export function buildRunPlan(args) {
  const assets = resolveAssets(args.stack, args.assistant);
  const projectDir = path.resolve(args.project);
  return { assets, projectDir };
}

async function main() {
  const argv = process.argv.slice(2);
  const on = supportsColor(process.stdout, process.env);
  const fromWizard = needsWizard(argv, Boolean(process.stdin.isTTY));
  let args;
  if (fromWizard) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try { args = buildArgsFromAnswers(await runWizard((q) => rl.question(q), on)); }
    finally { rl.close(); }
  } else {
    args = parseArgs(argv);
    const errs = validateArgs(args);
    if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  }
  if (!meetsNode(process.version)) { console.error('Node ≥ 20.12 requis (voir guides/02-installer-les-outils.md)'); process.exit(1); }
  if (!ensureGit()) { console.error('git requis (voir guides/02-installer-les-outils.md)'); process.exit(1); }

  const { assets, projectDir } = buildRunPlan(args);
  if (args.dryRun) { console.log(JSON.stringify({ projectDir, caveman: args.caveman, ...assets }, null, 2)); return; }

  const done = [], failed = [];
  const opt = { force: args.force };

  ensureDir(projectDir);
  const snip = (f) => { try { return fs.readFileSync(path.join(args.source, `templates/agents/${f}`), 'utf8'); } catch { return ''; } };
  const agents = renderProjectAgentsMd({ ...args, commandsDir: assets.commandsDir, loopSection: snip('loop-section.md'), designRule: snip('design-rule.md'), memoryRules: snip('memory-rules.md') });
  // Toujours écrire les DEUX (AGENTS.md pour Cursor/Codex, CLAUDE.md pour Claude Code) — projet portable quel que soit l'assistant.
  fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), agents);
  fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), agents);
  ensureDir(path.join(projectDir, 'maquette'));
  done.push('AGENTS.md + CLAUDE.md + maquette/');

  for (const c of assets.copies) {
    try {
      const src = path.join(args.source, c.from);
      const dest = path.join(projectDir, c.to);
      if (c.transform === 'dir') copyDirIfAbsent(src, dest, opt);
      else if (c.transform === 'mdc') {
        ensureDir(path.dirname(dest));
        if (!fs.existsSync(dest) || args.force) fs.writeFileSync(dest, toCursorMdc({ description: c.description, body: fs.readFileSync(src, 'utf8'), alwaysApply: c.alwaysApply !== false }));
      } else copyIfAbsent(src, dest, opt);
      done.push(c.to);
    } catch (e) { failed.push(`${c.to} (${e.message})`); }
  }

  for (const cl of assets.clones) {
    let tmp;
    try {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-clone-'));
      cloneRepo(cl.repo, tmp);
      if (cl.picks) pickFromClone(tmp, cl.picks, projectDir);
      else if (cl.matchTags) {
        const rulesDir = path.join(tmp, 'rules');
        for (const f of selectByTags(rulesDir, cl.matchTags)) copyIfAbsent(path.join(rulesDir, f), path.join(projectDir, cl.to, f), opt);
      }
      done.push(cl.repo);
    } catch (e) { failed.push(`${cl.repo} (${e.message})`); }
    finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  for (const cmd of ['new-project', 'new-feature', 'edit-design', 'doctor', 'build']) {
    try {
      const src = path.join(args.source, `templates/commands/${cmd}.md`);
      // Slash-commands typables pour tous : Cursor → .cursor/commands/, Claude → .claude/commands/, Codex → docs/commands/.
      copyIfAbsent(src, path.join(projectDir, assets.commandsDir, `${cmd}.md`), opt);
      done.push(`${assets.commandsDir}/${cmd}.md`);
    } catch (e) { failed.push(`commande ${cmd} (${e.message})`); }
  }
  try { copyDirIfAbsent(path.join(args.source, 'templates/memory'), path.join(projectDir, 'docs/memory'), opt); done.push('docs/memory/'); }
  catch (e) { failed.push(`docs/memory (${e.message})`); }
  try {
    copyIfAbsent(path.join(args.source, 'templates/dream/dream.yml'), path.join(projectDir, '.github/workflows/dream.yml'), opt);
    copyIfAbsent(path.join(args.source, 'templates/dream/DREAM.md'), path.join(projectDir, 'docs/DREAM.md'), opt);
    done.push('dream (.github/workflows + docs/DREAM.md)');
  } catch (e) { failed.push(`dream (${e.message})`); }

  if (args.assistant === 'cursor') {
    try {
      copyIfAbsent(path.join(args.source, 'templates/cursor/hooks.json'), path.join(projectDir, '.cursor/hooks.json'), opt);
      copyDirIfAbsent(path.join(args.source, 'templates/cursor/hooks'), path.join(projectDir, '.cursor/hooks'), opt);
      copyIfAbsent(path.join(args.source, 'templates/cursor/cursorignore'), path.join(projectDir, '.cursorignore'), opt);
      copyIfAbsent(path.join(args.source, 'templates/cursor/rules/00-project.mdc'), path.join(projectDir, '.cursor/rules/00-project.mdc'), opt);
      copyDirIfAbsent(path.join(args.source, `templates/cursor/rules/${args.stack}`), path.join(projectDir, '.cursor/rules'), opt);
      done.push('.cursor/rules/ (00-project + règles typées par framework)');
    } catch (e) { failed.push(`cursor extras (${e.message})`); }
  }

  // Sécurité (tous assistants) : .env.example par stack + scan de secrets gitleaks.
  try { copyIfAbsent(path.join(args.source, `templates/env/${args.stack}.env.example`), path.join(projectDir, '.env.example'), opt); done.push('.env.example'); }
  catch (e) { failed.push(`.env.example (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, 'templates/security/secrets.yml'), path.join(projectDir, '.github/workflows/secrets.yml'), opt); done.push('scan secrets (gitleaks)'); }
  catch (e) { failed.push(`secrets (${e.message})`); }

  // CI par stack + onboarding (tous assistants).
  try { copyIfAbsent(path.join(args.source, `templates/ci/${args.stack}.yml`), path.join(projectDir, '.github/workflows/ci.yml'), opt); done.push('.github/workflows/ci.yml'); }
  catch (e) { failed.push(`ci (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, 'templates/ONBOARDING.md'), path.join(projectDir, 'docs/ONBOARDING.md'), opt); done.push('docs/ONBOARDING.md'); }
  catch (e) { failed.push(`onboarding (${e.message})`); }

  try { copyIfAbsent(path.join(args.source, 'templates/roadmap/ROADMAP.md'), path.join(projectDir, 'docs/ROADMAP.md'), opt); done.push('docs/ROADMAP.md (squelette)'); }
  catch (e) { failed.push(`roadmap (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, `templates/run/${args.stack}.md`), path.join(projectDir, 'docs/RUN.md'), opt); done.push('docs/RUN.md'); }
  catch (e) { failed.push(`run (${e.message})`); }

  try {
    const note = renderBackendNote(args.stack, args.backend);
    const runPath = path.join(projectDir, 'docs/RUN.md');
    const cur = fs.existsSync(runPath) ? fs.readFileSync(runPath, 'utf8') : '';
    // Idempotent : ne préfixe la note que si elle n'est pas déjà là (re-run sans --force).
    if (note && !cur.includes('Backend en local')) {
      fs.writeFileSync(runPath, note + '\n' + cur);
      done.push('docs/RUN.md (note backend local)');
    }
  } catch (e) { failed.push(`backend note (${e.message})`); }

  try { copyDirIfAbsent(path.join(args.source, 'templates/agents/subagents'), path.join(projectDir, '.claude/agents'), opt); done.push('.claude/agents/ (code-reviewer + security-reviewer)'); }
  catch (e) { failed.push(`agents (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, `templates/gitignore/${args.stack}.gitignore`), path.join(projectDir, '.gitignore'), opt); done.push('.gitignore'); }
  catch (e) { failed.push(`.gitignore (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, 'templates/memory-consolidate/consolidate.yml'), path.join(projectDir, '.github/workflows/memory-consolidate.yml'), opt); done.push('consolidation mémoire (hebdo)'); }
  catch (e) { failed.push(`memory-consolidate (${e.message})`); }
  try {
    const hook = path.join(projectDir, '.githooks/pre-commit');
    copyIfAbsent(path.join(args.source, 'templates/hooks/pre-commit'), hook, opt);
    if (fs.existsSync(hook)) fs.chmodSync(hook, 0o755);
    done.push('.githooks/pre-commit');
  } catch (e) { failed.push(`pre-commit (${e.message})`); }

  try {
    const env = writeStackEnvironment({ projectDir, source: args.source, stack: args.stack, assistant: args.assistant });
    done.push(...env.done);
    failed.push(...env.failed);
  } catch (e) { failed.push(`environnement (${e.message})`); }

  try { copyIfAbsent(path.join(args.source, `templates/examples/${args.stack}.md`), path.join(projectDir, 'docs/examples/feature-exemple.md'), opt); done.push('docs/examples/feature-exemple.md'); }
  catch (e) { failed.push(`exemple (${e.message})`); }

  if (args.caveman) {
    try { installCaveman(); done.push('caveman (réduction des coûts)'); }
    catch (e) { failed.push(`caveman (${e.message})`); }
  }

  if (!args.noSkills) {
    console.log('\nInstallation des skills design (npx skills add — peut prendre ~1 min)…');
    try {
      const skl = installSkills(DESIGN_SKILL_SPECS, args.assistant);
      done.push(...skl.done.map((d) => `skill design : ${d}`));
      failed.push(...skl.failed.map((f) => `skill design : ${f}`));
    } catch (e) { failed.push(`skills design (${e.message})`); }
  }

  console.log(formatReport({ project: args.project, stack: args.stack, assistant: args.assistant, done, inAssistant: assets.inAssistant, skipped: assets.skipped, failed }));
  if (fromWizard) {
    console.log('\n' + ok('Config prête. Ouvre ton assistant IA dans le dossier du projet.', on));
    console.log('\n— Colle ce prompt dans ton assistant —\n');
    console.log([
      "Finalise l'install et démarre :",
      '1. Ouvre docs/SETUP-AI.md → installe les plugins + skills stack, et autorise les MCP (/mcp).',
      `2. Boucle superpowers : ${SUPERPOWERS[args.assistant]}`,
      '3. /doctor pour vérifier.',
      '4. /new-project (PRD + tech spec + design), puis /build.',
    ].join('\n'));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e?.message || e); process.exit(1); });
