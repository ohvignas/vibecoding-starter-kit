#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs, validateArgs, expandHome, resolveProjectDir } from './lib/args.mjs';
import { resolveAssets, resolveStackManifest, DESIGN_SKILL_SPECS, SUPERPOWERS } from './lib/matrix.mjs';
import { renderProjectAgentsMd, toCursorMdc } from './lib/templates.mjs';
import { ensureDir, copyIfAbsent, copyDirIfAbsent } from './lib/fsops.mjs';
import { cloneRepo, pickFromClone, installCaveman, installSkills } from './lib/external.mjs';
import { initProjectGit } from './lib/gitinit.mjs';
import { formatReport } from './lib/report.mjs';
import { meetsNode, ensureGit } from './lib/prereqs.mjs';
import { writeStackEnvironment } from './lib/environment.mjs';
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard, wireSigint, renderNonTtyHelp } from './lib/wizard.mjs';
import { supportsColor, ok } from './lib/ui.mjs';

// Racine du kit = dossier parent de scripts/ — fiable quel que soit le cwd de lancement
// (fini les 22 ENOENT silencieux quand on lance le script depuis un autre dossier).
export function kitRootFromModuleUrl(moduleUrl) {
  return path.resolve(path.dirname(fileURLToPath(moduleUrl)), '..');
}

export function buildRunPlan(args, kitRoot = process.cwd()) {
  const assets = resolveAssets(args.stack, args.assistant);
  const projectDir = resolveProjectDir(args.project, kitRoot);
  return { assets, projectDir };
}

async function main() {
  // Prérequis d'abord : échouer AVANT de poser 5 questions, pas après.
  if (!meetsNode(process.version)) { console.error('Node ≥ 20.12 requis (voir guides/02-installer-les-outils.md)'); process.exit(1); }
  if (!ensureGit()) { console.error('git requis (voir guides/02-installer-les-outils.md)'); process.exit(1); }

  const argv = process.argv.slice(2);
  const on = supportsColor(process.stdout, process.env);
  const isTTY = Boolean(process.stdin.isTTY);
  const kitRoot = kitRootFromModuleUrl(import.meta.url);
  let args;
  if (needsWizard(argv, isTTY)) {
    const base = parseArgs(argv); // drapeaux partiels (--no-skills, --source…) conservés
    const readline = await import('node:readline/promises'); // dynamique : le check Node ci-dessus tourne même sur Node 16
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    wireSigint(rl);
    try { args = buildArgsFromAnswers(await runWizard((q) => rl.question(q), on), base); }
    finally { rl.close(); }
  } else {
    args = parseArgs(argv);
    const errs = validateArgs(args);
    if (errs.length) {
      console.error(errs.join('\n'));
      if (!isTTY) console.error('\n' + renderNonTtyHelp());
      process.exit(1);
    }
  }
  args.source = args.source ?? kitRoot;
  args.project = expandHome(args.project, os.homedir());

  const { assets, projectDir } = buildRunPlan(args, kitRoot);
  if (args.dryRun) { console.log(JSON.stringify({ projectDir, caveman: args.caveman, ...assets }, null, 2)); return; }

  const done = [], kept = [], failed = [];
  const opt = { force: args.force };
  // 3 états honnêtes : créé (done) / conservé (kept, déjà présent, jamais écrasé) / échec (failed).
  const track = (label, res) => { (res.status === 'copied' ? done : kept).push(label); };
  const trackDir = (label, results) => {
    const copied = results.filter((r) => r.status === 'copied').length;
    if (results.length > 0 && copied === 0) kept.push(label);
    else done.push(label);
  };

  ensureDir(projectDir);
  const snip = (f) => { try { return fs.readFileSync(path.join(args.source, `templates/agents/${f}`), 'utf8'); } catch { return ''; } };
  const agents = renderProjectAgentsMd({ ...args, commandsDir: assets.commandsDir, loopSection: snip('loop-section.md'), designRule: snip('design-rule.md'), memoryRules: snip('memory-rules.md') });
  // Toujours produire les DEUX (AGENTS.md pour Cursor/Codex, CLAUDE.md pour Claude Code) — projet portable.
  // Jamais écraser un fichier existant : la nouvelle version part en .new, signalée dans le rapport.
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const dest = path.join(projectDir, name);
    if (fs.existsSync(dest) && !args.force) {
      fs.writeFileSync(`${dest}.new`, agents);
      kept.push(`⚠️ ${name} existant conservé (nouvelle version : ${name}.new)`);
    } else {
      fs.writeFileSync(dest, agents);
      done.push(name);
    }
  }
  ensureDir(path.join(projectDir, 'maquette'));

  for (const c of assets.copies) {
    try {
      const src = path.join(args.source, c.from);
      const dest = path.join(projectDir, c.to);
      if (c.transform === 'dir') trackDir(c.to, copyDirIfAbsent(src, dest, opt));
      else if (c.transform === 'mdc') {
        ensureDir(path.dirname(dest));
        if (!fs.existsSync(dest) || args.force) { fs.writeFileSync(dest, toCursorMdc({ description: c.description, body: fs.readFileSync(src, 'utf8'), alwaysApply: c.alwaysApply !== false })); done.push(c.to); }
        else kept.push(c.to);
      } else track(c.to, copyIfAbsent(src, dest, opt));
    } catch (e) { failed.push(`${c.to} (${e.message})`); }
  }

  for (const cl of assets.clones) {
    let tmp;
    try {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-clone-'));
      cloneRepo(cl.repo, tmp);
      if (cl.picks) pickFromClone(tmp, cl.picks, projectDir);
      done.push(cl.repo);
    } catch (e) { failed.push(`${cl.repo} (${e.message})`); }
    finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  for (const cmd of ['new-project', 'new-feature', 'edit-design', 'doctor', 'build']) {
    try {
      const src = path.join(args.source, `templates/commands/${cmd}.md`);
      // Slash-commands typables pour tous : Cursor → .cursor/commands/, Claude → .claude/commands/, Codex → docs/commands/.
      track(`${assets.commandsDir}/${cmd}.md`, copyIfAbsent(src, path.join(projectDir, assets.commandsDir, `${cmd}.md`), opt));
    } catch (e) { failed.push(`commande ${cmd} (${e.message})`); }
  }
  try { trackDir('docs/memory/', copyDirIfAbsent(path.join(args.source, 'templates/memory'), path.join(projectDir, 'docs/memory'), opt)); }
  catch (e) { failed.push(`docs/memory (${e.message})`); }
  try {
    trackDir('dream (.github/workflows + docs/DREAM.md)', [
      copyIfAbsent(path.join(args.source, 'templates/dream/dream.yml'), path.join(projectDir, '.github/workflows/dream.yml'), opt),
      copyIfAbsent(path.join(args.source, 'templates/dream/DREAM.md'), path.join(projectDir, 'docs/DREAM.md'), opt),
    ]);
  } catch (e) { failed.push(`dream (${e.message})`); }

  if (args.assistant === 'cursor') {
    try {
      trackDir('.cursor/hooks.json + .cursorignore (mémoire auto)', [
        copyIfAbsent(path.join(args.source, 'templates/cursor/hooks.json'), path.join(projectDir, '.cursor/hooks.json'), opt),
        ...copyDirIfAbsent(path.join(args.source, 'templates/cursor/hooks'), path.join(projectDir, '.cursor/hooks'), opt),
        copyIfAbsent(path.join(args.source, 'templates/cursor/cursorignore'), path.join(projectDir, '.cursorignore'), opt),
      ]);
      trackDir('.cursor/rules/ (00-project + règles typées par framework)', [
        copyIfAbsent(path.join(args.source, 'templates/cursor/rules/00-project.mdc'), path.join(projectDir, '.cursor/rules/00-project.mdc'), opt),
        ...copyDirIfAbsent(path.join(args.source, `templates/cursor/rules/${args.stack}`), path.join(projectDir, '.cursor/rules'), opt),
      ]);
      trackDir('.cursor/BUGBOT.md + .cursor/environment.json + .cursorindexingignore', [
        copyIfAbsent(path.join(args.source, 'templates/cursor/BUGBOT.md'), path.join(projectDir, '.cursor/BUGBOT.md'), opt),
        copyIfAbsent(path.join(args.source, `templates/cursor/environment/${args.stack}.json`), path.join(projectDir, '.cursor/environment.json'), opt),
        copyIfAbsent(path.join(args.source, 'templates/cursor/cursorindexingignore'), path.join(projectDir, '.cursorindexingignore'), opt),
      ]);
    } catch (e) { failed.push(`cursor extras (${e.message})`); }
  }

  // Sécurité (tous assistants) : .env.example par stack + scan de secrets gitleaks.
  try { track('.env.example', copyIfAbsent(path.join(args.source, `templates/env/${args.stack}.env.example`), path.join(projectDir, '.env.example'), opt)); }
  catch (e) { failed.push(`.env.example (${e.message})`); }
  try { track('scan secrets (gitleaks)', copyIfAbsent(path.join(args.source, 'templates/security/secrets.yml'), path.join(projectDir, '.github/workflows/secrets.yml'), opt)); }
  catch (e) { failed.push(`secrets (${e.message})`); }

  // CI par stack + onboarding (tous assistants).
  try { track('.github/workflows/ci.yml', copyIfAbsent(path.join(args.source, `templates/ci/${args.stack}.yml`), path.join(projectDir, '.github/workflows/ci.yml'), opt)); }
  catch (e) { failed.push(`ci (${e.message})`); }
  try { track('docs/ONBOARDING.md', copyIfAbsent(path.join(args.source, 'templates/ONBOARDING.md'), path.join(projectDir, 'docs/ONBOARDING.md'), opt)); }
  catch (e) { failed.push(`onboarding (${e.message})`); }

  try { track('docs/ROADMAP.md (squelette)', copyIfAbsent(path.join(args.source, 'templates/roadmap/ROADMAP.md'), path.join(projectDir, 'docs/ROADMAP.md'), opt)); }
  catch (e) { failed.push(`roadmap (${e.message})`); }
  try { track('docs/RUN.md', copyIfAbsent(path.join(args.source, `templates/run/${args.stack}.md`), path.join(projectDir, 'docs/RUN.md'), opt)); }
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

  try { trackDir('.claude/agents/ (code-reviewer + security-reviewer)', copyDirIfAbsent(path.join(args.source, 'templates/agents/subagents'), path.join(projectDir, '.claude/agents'), opt)); }
  catch (e) { failed.push(`agents (${e.message})`); }
  try { track('.gitignore', copyIfAbsent(path.join(args.source, `templates/gitignore/${args.stack}.gitignore`), path.join(projectDir, '.gitignore'), opt)); }
  catch (e) { failed.push(`.gitignore (${e.message})`); }
  try { track('consolidation mémoire (hebdo)', copyIfAbsent(path.join(args.source, 'templates/memory-consolidate/consolidate.yml'), path.join(projectDir, '.github/workflows/memory-consolidate.yml'), opt)); }
  catch (e) { failed.push(`memory-consolidate (${e.message})`); }
  try {
    const hook = path.join(projectDir, '.githooks/pre-commit');
    track('.githooks/pre-commit', copyIfAbsent(path.join(args.source, 'templates/hooks/pre-commit'), hook, opt));
    if (fs.existsSync(hook)) fs.chmodSync(hook, 0o755);
  } catch (e) { failed.push(`pre-commit (${e.message})`); }

  try {
    const env = writeStackEnvironment({ projectDir, source: args.source, stack: args.stack, assistant: args.assistant, skillsInstalled: !args.noSkills });
    done.push(...env.done);
    failed.push(...env.failed);
  } catch (e) { failed.push(`environnement (${e.message})`); }

  try { track('docs/examples/feature-exemple.md', copyIfAbsent(path.join(args.source, `templates/examples/${args.stack}.md`), path.join(projectDir, 'docs/examples/feature-exemple.md'), opt)); }
  catch (e) { failed.push(`exemple (${e.message})`); }

  if (args.caveman) {
    try { installCaveman(); done.push('caveman (réduction des coûts)'); }
    catch (e) { failed.push(`caveman (${e.message})`); }
  }

  // Dépôt git réel : hooks pre-commit actifs immédiatement + premier point de retour arrière.
  const g = initProjectGit({ projectDir });
  done.push(...g.done);
  failed.push(...g.failed);

  if (!args.noSkills) {
    console.log('\nInstallation des skills (npx skills add — peut prendre ~1-2 min)…');
    try {
      const skl = installSkills(DESIGN_SKILL_SPECS, args.assistant);
      done.push(...skl.done.map((d) => `skill design : ${d}`));
      failed.push(...skl.failed.map((f) => `skill design : ${f}`));
    } catch (e) { failed.push(`skills design (${e.message})`); }
    try {
      const stackSkills = resolveStackManifest(args.stack, args.assistant).skills;
      if (stackSkills.length) {
        const skl = installSkills(stackSkills, args.assistant);
        done.push(...skl.done.map((d) => `skill stack : ${d}`));
        failed.push(...skl.failed.map((f) => `skill stack : ${f}`));
      }
    } catch (e) { failed.push(`skills stack (${e.message})`); }
  }

  console.log(formatReport({ project: projectDir, stack: args.stack, assistant: args.assistant, done, kept, inAssistant: assets.inAssistant, skipped: assets.skipped, failed }));
  if (failed.length) process.exitCode = 1; // rapport honnête : l'échec est visible aussi dans le code de sortie
  console.log('\n' + ok(`Config prête. Projet créé dans : ${projectDir}`, on));
  const promptLines = [
    "Finalise l'install et démarre :",
    args.noSkills
      ? '1. Ouvre docs/SETUP-AI.md → installe les plugins, lance les commandes de skills listées (sections 2 et 5), autorise les MCP (/mcp).'
      : '1. Ouvre docs/SETUP-AI.md → installe les plugins et autorise les MCP (/mcp). (Les skills — design + stack — sont déjà installés par le wizard.)',
    `2. Boucle superpowers : ${SUPERPOWERS[args.assistant]}`,
    '3. /doctor pour vérifier.',
    '4. /new-project (PRD + tech spec + design), puis /build.',
  ];
  // Le prompt survit au terminal : écrit à la racine du projet, dans tous les modes.
  fs.writeFileSync(path.join(projectDir, 'COLLE-MOI-DANS-L-IA.md'), ['# À coller dans ton assistant IA', '', ...promptLines, ''].join('\n'));
  console.log('\n— Colle ce prompt dans ton assistant (aussi sauvé dans COLLE-MOI-DANS-L-IA.md) —\n');
  console.log(promptLines.join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e?.message || e); process.exit(1); });
