#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { isCliEntry } from './lib/cli-entry.mjs';
import { parseArgs, validateArgs, expandHome, resolveProjectDir, projectBaseDir } from './lib/args.mjs';
import { readVibecodingManifest, refreshProject } from './lib/refresh.mjs';
import { AGENTS_DIR, CREW } from './lib/kit-owned.mjs';
import { COMMANDS, cheminRunbook, cheminEtape, etapesDuRunbook, runbookConcatene } from './lib/commands-list.mjs';
import { resolveAssets, resolveStackManifest, DESIGN_SKILL_SPECS, AGENT_SKILL_SPECS } from './lib/matrix.mjs';
import { estAdopte, STACK_AUCUNE, entreesDuProjet, renderInventaire, peutDemanderAdoption, erreursAdoption, erreursAdoptionNonInteractive, runAdoptWizard } from './lib/adoption.mjs';
import { renderColleMoi } from './lib/colle-moi.mjs';
import { toCursorMdc } from './lib/templates.mjs';
import { toCursorAgent } from './lib/agent-frontmatter.mjs';
import { renderAgentsFile } from './lib/agents-file.mjs';
import { ensureDir, copyIfAbsent, copyDirIfAbsent, writeIfAbsent } from './lib/fsops.mjs';
import { cloneRepo, pickFromClone, summarizeClone, installCaveman, installSkills } from './lib/external.mjs';
import { initProjectGit } from './lib/gitinit.mjs';
import { formatReport } from './lib/report.mjs';
import { meetsNode, ensureGit } from './lib/prereqs.mjs';
import { writeStackEnvironment } from './lib/environment.mjs';
import { choisirMode, buildArgsFromAnswers, runWizard, wireSigint, renderNonTtyHelp } from './lib/wizard.mjs';
import { renderRunDoc, renderRunDocObserve } from './lib/run-doc.mjs';
import { mergeManagedSection } from './lib/managed-section.mjs';
import { supportsColor, ok } from './lib/ui.mjs';

// Racine du kit = dossier parent de scripts/ — fiable quel que soit le cwd de lancement
// (fini les 22 ENOENT silencieux quand on lance le script depuis un autre dossier).
export function kitRootFromModuleUrl(moduleUrl) {
  return path.resolve(path.dirname(fileURLToPath(moduleUrl)), '..');
}

export function buildRunPlan(args, baseDir = process.cwd()) {
  const assets = resolveAssets(args.stack, args.assistant);
  const projectDir = resolveProjectDir(args.project, baseDir);
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

  // Quel mode ? L'ORDRE est dans `choisirMode` (wizard.mjs), pur et donc assertable : --refresh,
  // puis --adopt, puis seulement le wizard du parcours neuf. Hors TTY, `needsWizard` sort à sa
  // première ligne — un test qui lance le CLI par un pipe ne mesure jamais cet ordre-là.
  const mode = choisirMode(argv, isTTY);

  // Mode --refresh : met à jour un projet DÉJÀ généré (règles + fichiers 100% kit), sans scaffolder.
  // Early return AVANT toute la logique wizard/validate/scaffold → le scaffold par défaut est inchangé.
  if (mode === 'refresh') {
    const a = parseArgs(argv);
    a.source = a.source ?? kitRoot;
    const baseDir = projectBaseDir(kitRoot, process.cwd());
    const projectDir = resolveProjectDir(expandHome(a.project ?? '.', os.homedir()), baseDir);
    const manifest = readVibecodingManifest(projectDir);
    const { changed, migrated } = refreshProject({ source: a.source, projectDir, manifest, dryRun: a.dryRun });
    console.log(a.dryRun ? '[dry-run] Régénérerait :' : 'Régénéré (kit) :');
    for (const c of changed) console.log(`  ~ ${c}`);
    if (!changed.length) console.log('  (déjà à jour)');
    if (migrated.length) console.log(`\n⚠️ Ancienne version détectée : nouvelles règles ajoutées en haut de ${migrated.join(', ')} — supprime l'ancien bloc en double sous « vibecoding:end ».`);
    console.log('\nsrc/, docs/ (PRD/design/mémoire), ta zone perso : NON touchés.');
    return;
  }
  let args;
  // Mode --adopt : installe la MÉTHODE dans un projet qui existe déjà. Passe AVANT le wizard du
  // parcours neuf (voir `choisirMode`), qui commencerait par demander une stack — celle qu'on
  // refuse précisément de revendiquer ici. Le parcours neuf ne voit jamais ce bloc : il ne bouge pas.
  if (mode === 'adopt') {
    const base = parseArgs(argv); // drapeaux partiels (--no-skills, --source, --force…) conservés
    // `--adopt --stack saas` est une contradiction, pas un défaut à corriger en silence.
    if (base.stack && !estAdopte(base.stack)) {
      console.error(`--adopt installe la méthode dans un projet qui existe déjà : sa stack est « ${STACK_AUCUNE} », il n'y a pas de --stack à choisir (reçu : ${base.stack}).`);
      process.exit(1);
    }
    // Les drapeaux sont jugés par la MÊME fonction que le parcours neuf, et AVANT la moindre
    // question : échouer sur `--backend nawak` après avoir fait répondre l'utilisateur lui ferait
    // perdre ses réponses. Après les questions, la seule valeur neuve est l'assistant — sortie de
    // `pickOne`, donc valide par construction : ce contrôle-ci est complet.
    const errsDrapeaux = erreursAdoption(base);
    if (errsDrapeaux.length) { console.error(errsDrapeaux.join('\n')); process.exit(1); }
    // Par défaut, le dossier COURANT : `--adopt` se lance depuis le projet à adopter.
    const projectDir = resolveProjectDir(expandHome(base.project ?? '.', os.homedir()), projectBaseDir(kitRoot, process.cwd()));
    const entrees = entreesDuProjet(projectDir);
    let reponses;
    if (peutDemanderAdoption(isTTY, argv)) {
      const readline = await import('node:readline/promises');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      wireSigint(rl);
      try { reponses = await runAdoptWizard((q) => rl.question(q), on, process.stdout, { projectDir, entrees, assistant: base.assistant }); }
      finally { rl.close(); }
      if (!reponses) return; // refus : le parcours l'a dit, et rien n'a été touché
    } else {
      // Les réponses viennent des drapeaux — mais on MONTRE quand même ce qu'on a trouvé : c'est
      // la seule preuve que le kit vise le bon dossier, et elle ne coûte rien.
      console.log(renderInventaire(projectDir, entrees, on));
      const errs = erreursAdoptionNonInteractive(base, entrees, projectDir);
      if (errs.length) { console.error('\n' + errs.join('\n')); process.exit(1); }
      reponses = { assistant: base.assistant };
    }
    args = { ...base, stack: STACK_AUCUNE, assistant: reponses.assistant, project: projectDir };
  } else if (mode === 'wizard') {
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
  const baseDir = projectBaseDir(kitRoot, process.cwd());

  const { assets, projectDir } = buildRunPlan(args, baseDir);
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
  const agents = renderAgentsFile({ source: args.source, stack: args.stack, assistant: args.assistant, commandsDir: assets.commandsDir, learning: args.learning });
  // Toujours produire les DEUX (AGENTS.md pour Cursor/Codex, CLAUDE.md pour Claude Code) — projet portable.
  // Jamais écraser un fichier existant : la nouvelle version part en .new, signalée dans le rapport.
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const dest = path.join(projectDir, name);
    // ── PARCOURS ADOPTÉ : ON FUSIONNE, ON NE DÉPOSE PAS À CÔTÉ ────────────────────────────────
    //
    // ⛔ LE TROU QUI VIDAIT LE PARCOURS DE SON SENS. Sur un projet existant — le SEUL cas où
    // `--adopt` sert — il y a presque toujours un `AGENTS.md`. La branche `.new` ci-dessous le
    // conservait et déposait la méthode dans `AGENTS.md.new`, un fichier que rien n'ouvre et
    // qu'aucun assistant ne lit. Le kit s'installait, le rapport disait « conservé », et la
    // méthode n'arrivait JAMAIS dans le fichier relu à chaque message.
    //
    // La fusion remplace le bloc ENTRE MARQUEURS et ne touche à rien d'autre : c'est la même
    // opération que `--refresh` fait depuis toujours, et elle tient la promesse écrite dans la
    // question de consentement (« rien ne sera écrasé »). Un fichier ABSENT tombe dans le `else`
    // plus bas et est CRÉÉ — c'est ce qui bouche le trou de `CLAUDE.md` (refresh.mjs le SAUTE
    // quand il est absent, alors que Claude Code le lit en priorité).
    //
    // POURQUOI MÊME SOUS `--force` : sur ce parcours, la fusion est strictement moins destructrice
    // que l'écrasement, et « rien ne sera écrasé » n'est pas une promesse à drapeau. `--force`
    // garde son sens partout ailleurs.
    if (estAdopte(args.stack) && fs.existsSync(dest)) {
      try {
        // Jette sur des marqueurs dépareillés (perte de texte mesurée — managed-section.mjs).
        // Le refus porte sur CE fichier : l'autre continue, et le rapport sort en exit 1.
        fs.writeFileSync(dest, mergeManagedSection(fs.readFileSync(dest, 'utf8'), agents, name));
        done.push(`${name} (bloc du kit fusionné — ton texte hors marqueurs est intact)`);
      } catch (e) { failed.push(`${name} — NON installé : ${e.message}`); }
      continue;
    }
    if (fs.existsSync(dest) && args.force) {
      // --force écrase, mais JAMAIS sans filet : l'ancien fichier (et les règles perso qu'il
      // contient) est sauvegardé à côté avant d'être remplacé.
      fs.writeFileSync(`${dest}.bak`, fs.readFileSync(dest, 'utf8'));
      kept.push(`💾 ${name} sauvegardé avant écrasement (${name}.bak)`);
    }
    if (fs.existsSync(dest) && !args.force) {
      fs.writeFileSync(`${dest}.new`, agents);
      kept.push(`⚠️ ${name} existant conservé (nouvelle version : ${name}.new)`);
    } else {
      fs.writeFileSync(dest, agents);
      done.push(name);
    }
  }
  // Un `maquette/` vide, sur un projet adopté, ferait croire à l'IA qu'une maquette existe.
  if (!estAdopte(args.stack)) ensureDir(path.join(projectDir, 'maquette'));

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

  // Les clones sont des guidelines EXTERNES optionnelles (ex. karpathy) : un échec (réseau coupé,
  // github down) ne doit PAS marquer l'install comme ratée. → rangé en « Sauté » (non-bloquant),
  // jamais en « Échec » (l'essentiel — fichiers, git, config — a déjà réussi).
  const cloneSkipped = [];
  for (const cl of assets.clones) {
    let tmp;
    try {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-clone-'));
      cloneRepo(cl.repo, tmp);
      // Le clone réussi ne prouve rien : ce qui compte est ce qu'on en a PRÉLEVÉ (E5).
      const s = summarizeClone(cl.repo, cl.picks ? pickFromClone(tmp, cl.picks, projectDir) : []);
      if (s.ok) done.push(cl.repo);
      else cloneSkipped.push({ name: cl.repo, reason: s.reason });
    } catch { cloneSkipped.push({ name: cl.repo, reason: 'non récupéré (réseau ?) — optionnel, relance plus tard' }); }
    finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  for (const cmd of COMMANDS) {
    try {
      const src = path.join(args.source, cheminRunbook(cmd));
      const dest = path.join(projectDir, assets.commandsDir, `${cmd}.md`);
      // Slash-commands typables pour tous : Cursor → .cursor/commands/, Claude → .claude/commands/, Codex → docs/commands/.
      // Codex n'exécute aucun de ces runbooks : chez lui ce sont des FICHIERS qu'on ouvre. Un
      // runbook découpé lui ferait ouvrir l'entrée puis chaque étape à la main, dans l'ordre —
      // il reçoit donc l'entrée SUIVIE de ses étapes, en un seul fichier. Sans étape, c'est
      // l'entrée à l'octet près (`collerRunbook`).
      track(`${assets.commandsDir}/${cmd}.md`, args.assistant === 'codex'
        ? writeIfAbsent(dest, runbookConcatene(args.source, cmd), opt)
        : copyIfAbsent(src, dest, opt));
      // Les ÉTAPES, dans le dossier natif de l'assistant — jamais dans celui d'un autre
      // (`parcours.test.mjs` G8). Rien n'est livré tant que le runbook n'est pas découpé.
      const etapes = etapesDuRunbook(args.source, cmd);
      if (etapes.length) {
        trackDir(`${assets.commandsDir}/${cmd}/ (${etapes.length} étape${etapes.length > 1 ? 's' : ''})`, etapes.map((e) =>
          copyIfAbsent(path.join(args.source, cheminEtape(cmd, e)), path.join(projectDir, assets.commandsDir, cmd, e), opt)));
      }
    } catch (e) { failed.push(`commande ${cmd} (${e.message})`); }
  }
  try { trackDir('docs/memory/', copyDirIfAbsent(path.join(args.source, 'templates/memory'), path.join(projectDir, 'docs/memory'), opt)); }
  catch (e) { failed.push(`docs/memory (${e.message})`); }

  // Le carnet d'apprentissage. SEMÉ UNE FOIS, comme la mémoire, et jamais régénéré : l'IA
  // l'alimente leçon par leçon, et ce qu'il contient appartient à l'utilisateur — c'est sa
  // formation, écrite pendant qu'il construisait. Un `--refresh` qui l'écraserait détruirait
  // exactement ce qu'on lui promet de garder. Il n'est donc NI dans `kitOwnedFiles`, NI dans
  // `kitOwnedGenerated` : `copyDirIfAbsent` ne le pose que s'il n'existe pas.
  if (args.learning !== false) {
    try { trackDir('docs/', copyDirIfAbsent(path.join(args.source, 'templates/apprentissage'), path.join(projectDir, 'docs'), opt)); }
    catch (e) { failed.push(`docs/APPRENTISSAGE.md (${e.message})`); }
  }

  // L'ÉTAT DES LIEUX — la première page de la mémoire d'un projet adopté.
  //
  // ⛔ Il n'est pas optionnel : le rendu `AGENTS.md` d'un projet adopté le CITE (agents-file.mjs,
  // SUBSTITUTIONS_ADOPTE, entrée verifyRule : « lance l'app (voir `docs/ETAT-DES-LIEUX.md`) »).
  // Sans ce bloc, cette phrase est un renvoi mort relu à chaque message — mesuré, et exactement la
  // classe de défaut que le parcours adopté existe pour supprimer.
  //
  // Même modèle que le carnet d'apprentissage ci-dessus : semé UNE FOIS par `copyDirIfAbsent`,
  // NI dans `kitOwnedFiles` NI dans `kitOwnedGenerated`. Ce que l'IA y écrit (et ce que
  // l'utilisateur y corrige) est le compte rendu de SON projet : un `--refresh` qui le régénérerait
  // remettrait des « À DÉTERMINER » par-dessus des réponses.
  //
  // ⛔ INSENSIBLE À `--force` — ET C'EST LA PROMESSE ELLE-MÊME QUI L'EXIGE. Le gabarit écrit noir
  // sur blanc « le kit ne régénère jamais ce fichier ». Mesuré avant ce garde : l'utilisateur
  // répondait aux « À DÉTERMINER », relançait `--adopt --force`, et ses réponses étaient écrasées —
  // sans `.bak`, avec un « ✅ » au rapport, PENDANT que `docs/A-FAIRE.md` était protégé par un
  // `.new` au même instant. L'inversion était le défaut : sous `--force`, les fichiers du KIT
  // étaient ménagés et le travail écrit À LA MAIN était détruit.
  // On passe donc `{}` et non `opt` : `--force` ne gouverne pas ce fichier. Qui veut repartir du
  // gabarit le supprime — c'est un geste, pas un effet de bord.
  if (estAdopte(args.stack)) {
    try { trackDir('docs/ETAT-DES-LIEUX.md (à remplir par l\'IA, en premier)', copyDirIfAbsent(path.join(args.source, 'templates/adoption'), path.join(projectDir, 'docs'), {})); }
    catch (e) { failed.push(`docs/ETAT-DES-LIEUX.md (${e.message})`); }
  }

  // Templates que /new-project OUVRE au lieu de les recopier dans son propre texte (Lot D9) :
  // le runbook les cite par ces chemins-là, ils doivent donc exister dans le projet généré.
  try {
    trackDir('docs/templates/ (PRD + architecture)', [
      copyIfAbsent(path.join(args.source, 'templates/prd/PRD.md'), path.join(projectDir, 'docs/templates/PRD.md'), opt),
      copyIfAbsent(path.join(args.source, 'templates/specs/architecture.md'), path.join(projectDir, 'docs/templates/architecture.md'), opt),
    ]);
  } catch (e) { failed.push(`docs/templates (${e.message})`); }

  // Le glossaire, EMBARQUÉ (Lot H7). `guides/` part bien dans le paquet npm mais n'atterrissait
  // dans aucun projet : l'utilisateur qui bloque sur « MCP » ou « jalon » n'avait nulle part où
  // aller — le kit vit dans un cache npx qu'il ne trouvera jamais. Le renvoi depuis
  // `docs/A-FAIRE.md` était l'autre option, et le Lot G l'interdit à raison (parcours.test.mjs
  // G5) : renvoyer vers un fichier absent, c'est le renvoi mort qu'on vient de retirer. On crée
  // donc le fichier, et `/help` (l'entrée) y mène.
  try { track('docs/glossaire.md (le vocabulaire, hors ligne)', copyIfAbsent(path.join(args.source, 'guides/glossaire.md'), path.join(projectDir, 'docs/glossaire.md'), opt)); }
  catch (e) { failed.push(`docs/glossaire.md (${e.message})`); }

  if (args.assistant === 'cursor') {
    try {
      trackDir('.cursor/hooks.json + .cursorignore (mémoire auto)', [
        copyIfAbsent(path.join(args.source, 'templates/cursor/hooks.json'), path.join(projectDir, '.cursor/hooks.json'), opt),
        ...copyDirIfAbsent(path.join(args.source, 'templates/cursor/hooks'), path.join(projectDir, '.cursor/hooks'), opt),
        copyIfAbsent(path.join(args.source, 'templates/cursor/cursorignore'), path.join(projectDir, '.cursorignore'), opt),
      ]);
      // Les deux premiers fichiers sont génériques (toute stack, y compris `aucune`) ; le dossier
      // de règles TYPÉES par framework (`templates/cursor/rules/${stack}`) n'existe que pour les
      // 4 stacks offertes — pas de variante `aucune` (même logique que les 6 chemins ci-dessus,
      // trouvée en exerçant `--assistant cursor` : `scandir` ENOENT sinon).
      trackDir('.cursor/rules/ (00-project + règles typées par framework)', [
        copyIfAbsent(path.join(args.source, 'templates/cursor/rules/00-project.mdc'), path.join(projectDir, '.cursor/rules/00-project.mdc'), opt),
        // `10-css-maquette.mdc` traduit `css-maquette-rule.md` pour Cursor. Sur un projet adopté,
        // cette règle est RETIRÉE d'AGENTS.md (aucune `maquette/` livrée) : la copier quand même
        // laissait la version Cursor seule à porter une consigne que les deux autres assistants ne
        // reçoivent plus — l'asymétrie exacte que `promesses-livrees.test.mjs` interdit entre une
        // règle source et sa traduction.
        ...(estAdopte(args.stack) ? [] : [copyIfAbsent(path.join(args.source, 'templates/cursor/rules/10-css-maquette.mdc'), path.join(projectDir, '.cursor/rules/10-css-maquette.mdc'), opt)]),
        ...(estAdopte(args.stack) ? [] : copyDirIfAbsent(path.join(args.source, `templates/cursor/rules/${args.stack}`), path.join(projectDir, '.cursor/rules'), opt)),
      ]);
      // Même chose pour `.cursor/environment.json` : `templates/cursor/environment/${stack}.json`
      // n'a pas de variante `aucune` — BUGBOT.md et cursorindexingignore restent génériques.
      trackDir('.cursor/BUGBOT.md + .cursor/environment.json + .cursorindexingignore', [
        copyIfAbsent(path.join(args.source, 'templates/cursor/BUGBOT.md'), path.join(projectDir, '.cursor/BUGBOT.md'), opt),
        ...(estAdopte(args.stack) ? [] : [copyIfAbsent(path.join(args.source, `templates/cursor/environment/${args.stack}.json`), path.join(projectDir, '.cursor/environment.json'), opt)]),
        copyIfAbsent(path.join(args.source, 'templates/cursor/cursorindexingignore'), path.join(projectDir, '.cursorindexingignore'), opt),
      ]);
    } catch (e) { failed.push(`cursor extras (${e.message})`); }
  }

  // Hooks Claude Code (format Claude : stdin `tool_input`, blocage par exit 2) — copiés seulement
  // pour Claude Code, comme les hooks Cursor ne le sont que pour Cursor. Les deux jeux sont
  // incompatibles : même intention, protocoles différents.
  if (args.assistant === 'claude-code') {
    try {
      trackDir('.claude/hooks/ (mémoire au démarrage + garde-shell)', copyDirIfAbsent(path.join(args.source, 'templates/claude/hooks'), path.join(projectDir, '.claude/hooks'), opt));
    } catch (e) { failed.push(`claude hooks (${e.message})`); }
  }

  // Sécurité (tous assistants) : .env.example par stack + scan de secrets gitleaks.
  // Sur `aucune`, aucun modèle `templates/env/aucune.env.example` n'existe — et n'en aurait pas
  // le sens : un projet adopté a déjà (ou pas) son .env, ce n'est pas au kit de le poser.
  if (!estAdopte(args.stack)) {
    try { track('.env.example', copyIfAbsent(path.join(args.source, `templates/env/${args.stack}.env.example`), path.join(projectDir, '.env.example'), opt)); }
    catch (e) { failed.push(`.env.example (${e.message})`); }
  }
  try { track('scan secrets (gitleaks)', copyIfAbsent(path.join(args.source, 'templates/security/secrets.yml'), path.join(projectDir, '.github/workflows/secrets.yml'), opt)); }
  catch (e) { failed.push(`secrets (${e.message})`); }

  // CI par stack (tous assistants). La checklist d'install, c'est docs/A-FAIRE.md — un seul fichier.
  // Pas de `templates/ci/aucune.yml` : le kit ne connaît ni le build ni les tests d'un projet adopté.
  if (!estAdopte(args.stack)) {
    try { track('.github/workflows/ci.yml', copyIfAbsent(path.join(args.source, `templates/ci/${args.stack}.yml`), path.join(projectDir, '.github/workflows/ci.yml'), opt)); }
    catch (e) { failed.push(`ci (${e.message})`); }
  }

  // Squelette de plan — jamais sur `aucune` : `/build` l'exécuterait comme un vrai plan.
  if (!estAdopte(args.stack)) {
    try { track('docs/ROADMAP.md (squelette)', copyIfAbsent(path.join(args.source, 'templates/roadmap/ROADMAP.md'), path.join(projectDir, 'docs/ROADMAP.md'), opt)); }
    catch (e) { failed.push(`roadmap (${e.message})`); }
  }
  // docs/RUN.md est RENDU (modèle de la stack + notes backend/Codex) par une source unique —
  // la même que `--refresh` réutilise, sinon le refresh ne saurait pas reproduire ce qu'on écrit ici.
  //
  // SUR UN PROJET ADOPTÉ, IL EST ÉCRIT D'OBSERVATION — jamais d'un modèle de stack.
  // ⛔ Mesuré (spec, décision 4) : `templates/run/<stack>.md` a produit « Lancer l'app — SaaS
  // (Convex + TanStack Start) · `npx convex dev` » dans un projet qui n'avait ni l'un ni l'autre.
  // Le seul fichier qu'un débutant ouvre pour lancer son app lui mentait, avec l'autorité du kit.
  // Ce qu'on écrit ici est donc RELEVÉ dans son `package.json` (et son lockfile) ; ce qui n'a pas
  // pu l'être est dit tel quel, jamais remplacé par une supposition (`renderRunDocObserve`).
  // Comme l'état des lieux, il n'est PAS régénérable (kit-owned.mjs) : c'est une observation que
  // l'utilisateur corrige, pas un rendu du kit.
  try {
    const runPath = path.join(projectDir, 'docs/RUN.md');
    // `--force` régénère ce fichier SUR LES 4 STACKS OFFERTES (c'est un rendu du kit, il ne promet
    // rien), mais JAMAIS sur un projet adopté : là, il porte « c'est ton fichier : le kit ne le
    // régénère jamais » et les réponses que l'utilisateur a écrites sous « ce que le kit n'a PAS pu
    // déterminer ». Mesuré avant ce garde : `--adopt --force` les effaçait sans `.bak`.
    if (!fs.existsSync(runPath) || (args.force && !estAdopte(args.stack))) {
      ensureDir(path.dirname(runPath));
      let contenu;
      if (estAdopte(args.stack)) {
        // La lecture est ici (le rendu, lui, est pur) : un `package.json` illisible ou absent est
        // un CAS, pas une panne — `renderRunDocObserve` sait le dire.
        let pkg = null;
        try { pkg = fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'); } catch { pkg = null; }
        contenu = renderRunDocObserve({ pkg, fichiers: entreesDuProjet(projectDir) });
      } else {
        contenu = renderRunDoc({
          template: fs.readFileSync(path.join(args.source, `templates/run/${args.stack}.md`), 'utf8'),
          stack: args.stack, assistant: args.assistant, backend: args.backend,
        });
      }
      fs.writeFileSync(runPath, contenu);
      done.push(estAdopte(args.stack) ? 'docs/RUN.md (relevé dans ton package.json)' : 'docs/RUN.md');
    } else kept.push('docs/RUN.md');
  } catch (e) { failed.push(`run (${e.message})`); }

  // Parité : chaque assistant reçoit les 7 agents dans SON dossier natif.
  // Cursor ne comprend que name/description/model/readonly → frontmatter transformé (toCursorAgent).
  // Codex n'a pas de dossier d'agents → docs/agents/crew/ (la Règle sous-agents y renvoie).
  try {
    // La liste vient de CREW (kit-owned.mjs), jamais du contenu du dossier : c'est la même que
    // celle du `--refresh`. Un agent listé mais absent du dossier échoue ici, bruyamment — un
    // agent présent mais non listé était copié au scaffold et jamais régénéré ensuite.
    const agentsSrc = path.join(args.source, 'templates/agents/subagents');
    const agentsDir = AGENTS_DIR[args.assistant];
    const results = [];
    ensureDir(path.join(projectDir, agentsDir));
    for (const a of CREW) {
      const dest = path.join(projectDir, agentsDir, `${a}.md`);
      if (fs.existsSync(dest) && !args.force) { results.push({ status: 'kept' }); continue; }
      const brut = fs.readFileSync(path.join(agentsSrc, `${a}.md`), 'utf8');
      // Cursor ne comprend que name/description/model/readonly → frontmatter transformé.
      fs.writeFileSync(dest, args.assistant === 'cursor' ? toCursorAgent(brut) : brut);
      results.push({ status: 'copied' });
    }
    trackDir(`${agentsDir}/ (agents du crew (${CREW.length}))`, results);
  } catch (e) { failed.push(`agents (${e.message})`); }
  // Pas de `templates/gitignore/aucune.gitignore` : un projet adopté a déjà le sien (ou pas),
  // ce n'est pas au kit de lui en imposer un générique par stack.
  if (!estAdopte(args.stack)) {
    try { track('.gitignore', copyIfAbsent(path.join(args.source, `templates/gitignore/${args.stack}.gitignore`), path.join(projectDir, '.gitignore'), opt)); }
    catch (e) { failed.push(`.gitignore (${e.message})`); }
  }
  // Fins de ligne : sur Windows, sans ça, les hooks bash du projet sont checkoutés en CRLF et
  // échouent sur « bad interpreter: ^M » — le scan de secrets ne tourne plus, sans rien dire.
  try { track('.gitattributes', copyIfAbsent(path.join(args.source, 'templates/gitattributes'), path.join(projectDir, '.gitattributes'), opt)); }
  catch (e) { failed.push(`.gitattributes (${e.message})`); }
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

  // Pas de `templates/examples/aucune.md` : l'exemple de feature est écrit pour une stack connue.
  if (!estAdopte(args.stack)) {
    try { track('docs/examples/feature-exemple.md', copyIfAbsent(path.join(args.source, `templates/examples/${args.stack}.md`), path.join(projectDir, 'docs/examples/feature-exemple.md'), opt)); }
    catch (e) { failed.push(`exemple (${e.message})`); }
  }

  // Manifeste : mémorise stack+assistant (+ version du kit) pour que `scripts/update.mjs` puisse récupérer les nouveaux fichiers du kit.
  // `learning` et `backend` y sont AUSSI : ce sont deux choix de l'utilisateur, et `--refresh`
  // régénère à partir du seul manifeste. Non mémorisés, ils étaient silencieusement remis au
  // défaut (mode apprentissage réactivé, note « backend en local » perdue).
  try {
    const mf = path.join(projectDir, '.vibecoding.json');
    let kitVersion; try { kitVersion = JSON.parse(fs.readFileSync(path.join(args.source, 'package.json'), 'utf8')).version; } catch { /* source sans package.json */ }
    if (!fs.existsSync(mf) || args.force) { fs.writeFileSync(mf, JSON.stringify({ stack: args.stack, assistant: args.assistant, learning: args.learning !== false, ...(args.backend ? { backend: args.backend } : {}), generatedBy: 'vibecoding-starter-kit', ...(kitVersion ? { kitVersion } : {}) }, null, 2) + '\n'); done.push('.vibecoding.json'); }
    else kept.push('.vibecoding.json');
  } catch (e) { failed.push(`.vibecoding.json (${e.message})`); }

  if (args.caveman) {
    try { installCaveman(); done.push('caveman (réduction des coûts)'); }
    catch (e) { failed.push(`caveman (${e.message})`); }
  }

  // Dépôt git réel : hooks pre-commit actifs immédiatement + premier point de retour arrière.
  // Ce que le kit n'a pas pu activer (dépôt parent, core.hooksPath déjà pris) part en « Sauté »,
  // avec la commande pour rattraper — jamais en ✅ silencieux.
  const g = initProjectGit({ projectDir });
  done.push(...g.done);
  failed.push(...g.failed);
  cloneSkipped.push(...g.skipped);

  if (!args.noSkills) {
    console.log('\nInstallation des skills (npx skills add — peut prendre ~1-2 min)…');
    try {
      const skl = installSkills(DESIGN_SKILL_SPECS, args.assistant, undefined, projectDir);
      done.push(...skl.done.map((d) => `skill design : ${d}`));
      failed.push(...skl.failed.map((f) => `skill design : ${f}`));
    } catch (e) { failed.push(`skills design (${e.message})`); }
    // Skills du crew : un dépôt indisponible (réseau, renommage) ne doit PAS faire sortir un
    // scaffold réussi en exit 1 → rangé en « Sauté » (non bloquant), comme les clones.
    try {
      const skl = installSkills(AGENT_SKILL_SPECS, args.assistant, undefined, projectDir);
      done.push(...skl.done.map((d) => `skill crew : ${d}`));
      cloneSkipped.push(...skl.failed.map((f) => ({ name: `skill crew : ${f}`, reason: 'non installé — optionnel, relance la commande de docs/A-FAIRE.md' })));
    } catch (e) { cloneSkipped.push({ name: 'skills crew', reason: `non installés (${e.message}) — relance la commande de docs/A-FAIRE.md` }); }
    try {
      const stackSkills = resolveStackManifest(args.stack, args.assistant).skills;
      if (stackSkills.length) {
        const skl = installSkills(stackSkills, args.assistant, undefined, projectDir);
        done.push(...skl.done.map((d) => `skill stack : ${d}`));
        failed.push(...skl.failed.map((f) => `skill stack : ${f}`));
      }
    } catch (e) { failed.push(`skills stack (${e.message})`); }
  }

  console.log(formatReport({ project: projectDir, stack: args.stack, assistant: args.assistant, done, kept, inAssistant: assets.inAssistant, skipped: cloneSkipped, failed }));
  if (failed.length) process.exitCode = 1; // rapport honnête : l'échec est visible aussi dans le code de sortie
  console.log('\n' + ok(`Config prête. Projet créé dans : ${projectDir}`, on));
  const promptLines = renderColleMoi({ assistant: args.assistant, skillsInstalled: !args.noSkills });
  // Le prompt survit au terminal : écrit à la racine du projet, dans tous les modes.
  fs.writeFileSync(path.join(projectDir, 'COLLE-MOI-DANS-L-IA.md'), ['# À coller dans ton assistant IA', '', ...promptLines, ''].join('\n'));
  console.log('\n— Colle ce prompt dans ton assistant (aussi sauvé dans COLLE-MOI-DANS-L-IA.md) —\n');
  console.log(promptLines.join('\n'));
}

// Entrée CLI (garde partagé : voir lib/cli-entry.mjs — `npm create`/`npx` passent par un symlink).
if (isCliEntry(import.meta.url)) main().catch((e) => { console.error(e?.message || e); process.exit(1); });
