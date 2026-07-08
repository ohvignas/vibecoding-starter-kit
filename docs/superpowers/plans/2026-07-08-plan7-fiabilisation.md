# Fiabilisation Wizard + Windows + CI + Sécu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le wizard fait ce qu'il promet (git init + hooks actifs, rapport honnête à 3 états, jamais d'écrasement), marche sous Windows (npx.cmd, message PowerShell, expansion du ~), et la CI le prouve (matrice 3 OS × 2 Node + smoke E2E en Node pur).

**Architecture:** Chaque correctif est une fonction pure injectable (`buildRunCommand`, `expandHome`, `resolveProjectDir`, `needsWizard`, `initProjectGit`…) testée en isolation, puis câblée dans `scripts/setup.mjs`. Les effets système (git, npx) passent par un paramètre `run` injectable pour tester sans Windows ni réseau. La CI ajoute un smoke E2E (`scripts/smoke-e2e.mjs`) qui joue le vrai installeur dans un tmpdir et vérifie les promesses du kit.

**Tech Stack:** Node.js ≥ 20.12, ESM (`.mjs`), `node:test` + `node:assert/strict`, GitHub Actions. Zéro dépendance npm.

## Global Constraints

- Node ESM zéro dépendance npm (aucun `npm install`, jamais).
- Tests : `node --test` lancé depuis la racine du repo (`/Users/antoinevigneau/best_practices_vibecoding`).
- Binaire node = `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node` (le wrapper nvm `node` est cassé — utilise TOUJOURS le chemin absolu).
- Tout en français : docs, messages console, commentaires, messages d'erreur.
- Copies non destructives (`copyIfAbsent`) — le kit n'écrase JAMAIS un fichier existant sans `--force`.
- Le kit ne doit PAS parler de « formation » ou « accompagnement » dans les templates générés.
- Jamais de secret écrit dans un fichier du projet ; toute « clé » dans un test est clairement factice (motifs répétés).
- Les tâches s'exécutent DANS L'ORDRE : les blocs « ACTUEL » d'une tâche supposent les tâches précédentes appliquées.
- Baseline avant la tâche 1 : `node --test` → 129 tests, 0 fail. Chaque tâche laisse la suite entière verte.
- Compatibilité Windows visée : tout nouveau test doit passer sous win32 (utilise `path.join`/`path.resolve`, `os.tmpdir()`, jamais de chemin POSIX en dur dans une assertion fs).

---

### Tâche 1 : `buildRunCommand` — npx Windows-safe (T1)

**Files:**
- Modify: `scripts/lib/external.mjs`
- Test: `scripts/lib/external.test.mjs`

**Interfaces:**
- Consumes: rien de nouveau (module autonome).
- Produces: `export function buildRunCommand(cmd, platform = process.platform)` → retourne `{ cmd: string, options: object }` ; sur `platform === 'win32'` et `cmd === 'npx'` → `{ cmd: 'npx.cmd', options: { shell: true } }` ; sinon `{ cmd, options: {} }`. `defaultRun` (interne, non exporté) l'utilise. Les tâches suivantes ne consomment PAS `buildRunCommand` directement.

- [ ] **Étape 1 : Écris les tests qui échouent**

Ajoute à la fin de `scripts/lib/external.test.mjs` :

```js
test('buildRunCommand : npx → npx.cmd + shell sur win32 uniquement', () => {
  assert.deepEqual(buildRunCommand('npx', 'win32'), { cmd: 'npx.cmd', options: { shell: true } });
  assert.deepEqual(buildRunCommand('npx', 'darwin'), { cmd: 'npx', options: {} });
  assert.deepEqual(buildRunCommand('npx', 'linux'), { cmd: 'npx', options: {} });
});

test('buildRunCommand : git inchangé sur toutes les plateformes', () => {
  assert.deepEqual(buildRunCommand('git', 'win32'), { cmd: 'git', options: {} });
  assert.deepEqual(buildRunCommand('git', 'darwin'), { cmd: 'git', options: {} });
});
```

Et modifie la ligne d'import du même fichier.

ACTUEL :
```js
import { selectByTags, pickFromClone, installCaveman, buildSkillAddArgs, installSkills } from './external.mjs';
```

REMPLACÉ :
```js
import { selectByTags, pickFromClone, installCaveman, buildSkillAddArgs, installSkills, buildRunCommand } from './external.mjs';
```

- [ ] **Étape 2 : Lance, vérifie l'échec**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/external.test.mjs
```

Attendu : ÉCHEC — `SyntaxError: The requested module './external.mjs' does not provide an export named 'buildRunCommand'` (le fichier de test ne charge pas, `fail 1`).

- [ ] **Étape 3 : Implémente**

Dans `scripts/lib/external.mjs`.

ACTUEL :
```js
const defaultRun = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
```

REMPLACÉ :
```js
// Windows : `npx` est un script .cmd — depuis Node 20.12 (correctif CVE-2024-27980), execFileSync
// exige le nom exact `npx.cmd` ET `shell: true` pour le lancer (sinon ENOENT/EINVAL).
// `git` est un vrai .exe : inchangé sur toutes les plateformes.
export function buildRunCommand(cmd, platform = process.platform) {
  if (platform === 'win32' && cmd === 'npx') return { cmd: 'npx.cmd', options: { shell: true } };
  return { cmd, options: {} };
}

const defaultRun = (cmd, args) => {
  const rc = buildRunCommand(cmd);
  return execFileSync(rc.cmd, args, { stdio: 'inherit', ...rc.options });
};
```

- [ ] **Étape 4 : Lance, vérifie que ça passe**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/external.test.mjs
```

Attendu : tous les tests du fichier passent (`fail 0`).

- [ ] **Étape 5 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add scripts/lib/external.mjs scripts/lib/external.test.mjs && git commit -m "fix(windows): npx → npx.cmd + shell sur win32 (execFileSync Node ≥ 20.12)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Tâche 2 : `expandHome` + `resolveProjectDir` + `--yes` + source différée (T2c/T2e — fonctions pures)

**Files:**
- Modify: `scripts/lib/args.mjs`
- Test: `scripts/lib/args.test.mjs`

**Interfaces:**
- Consumes: rien.
- Produces (consommés par les tâches 3 et 4) :
  - `export function expandHome(p, home)` → si `p` commence par `~` (formes `~`, `~/reste`, `~\reste`) retourne `path.join(home, reste)`, sinon retourne `p` inchangé (y compris `null`).
  - `export function resolveProjectDir(project, kitRoot)` → chemin ABSOLU : nom nu (sans `/` ni `\` ni absolu) → `path.resolve(kitRoot, '..', project)` ; sinon `path.resolve(project)`.
  - `parseArgs(argv)` accepte `--yes` (→ `args.yes = true`, défaut `false`) et le défaut de `source` devient `null` (au lieu de `'.'`) — `null` signifie « non fourni, setup.mjs y mettra la racine du kit ».

- [ ] **Étape 1 : Écris les tests qui échouent**

Dans `scripts/lib/args.test.mjs`, modifie l'import et l'assertion du défaut `source`, puis ajoute les nouveaux tests à la fin.

ACTUEL :
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, validateArgs } from './args.mjs';
```

REMPLACÉ :
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseArgs, validateArgs, expandHome, resolveProjectDir } from './args.mjs';
```

ACTUEL :
```js
  assert.equal(a.source, '.'); // défaut
```

REMPLACÉ :
```js
  assert.equal(a.source, null); // défaut : null = setup.mjs y mettra la racine du kit
```

Ajoute à la fin du fichier :

```js
test('--yes : drapeau lu (mode non-interactif)', () => {
  assert.equal(parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x', '--yes']).yes, true);
  assert.equal(parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x']).yes, false);
});

test('expandHome : ~ et ~/… étendus, le reste intact', () => {
  const home = path.join(path.sep, 'home', 'eleve');
  assert.equal(expandHome('~/mon-app', home), path.join(home, 'mon-app'));
  assert.equal(expandHome('~', home), home);
  assert.equal(expandHome('mon-app', home), 'mon-app');
  assert.equal(expandHome('./mon-app', home), './mon-app');
  assert.equal(expandHome(null, home), null);
});

test('resolveProjectDir : nom nu → ../<nom> à côté du kit ; chemins explicites respectés', () => {
  const kit = path.join(path.sep, 'tmp', 'kit');
  assert.equal(resolveProjectDir('mon-app', kit), path.resolve(kit, '..', 'mon-app'));
  assert.equal(resolveProjectDir('apps/mon-app', kit), path.resolve('apps/mon-app'));
  const abs = path.resolve(path.sep, 'ailleurs', 'app');
  assert.equal(resolveProjectDir(abs, kit), abs);
});
```

- [ ] **Étape 2 : Lance, vérifie l'échec**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/args.test.mjs
```

Attendu : ÉCHEC — `SyntaxError: The requested module './args.mjs' does not provide an export named 'expandHome'`.

- [ ] **Étape 3 : Implémente**

Dans `scripts/lib/args.mjs`.

ACTUEL :
```js
const STACKS = ['saas', 'mobile', 'desktop'];
const ASSISTANTS = ['cursor', 'claude-code', 'codex'];

export function parseArgs(argv) {
  const args = { stack: null, assistant: null, project: null, mockup: null, source: '.', dryRun: false, force: false, caveman: false };
```

REMPLACÉ :
```js
import path from 'node:path';

const STACKS = ['saas', 'mobile', 'desktop'];
const ASSISTANTS = ['cursor', 'claude-code', 'codex'];

export function parseArgs(argv) {
  // source: null = « non fourni » → setup.mjs y mettra la racine du kit (dérivée de import.meta.url).
  const args = { stack: null, assistant: null, project: null, mockup: null, source: null, dryRun: false, force: false, caveman: false, yes: false };
```

ACTUEL :
```js
      case '--no-skills': args.noSkills = true; break;
      default: throw new Error(`Argument inconnu : ${a}`);
```

REMPLACÉ :
```js
      case '--no-skills': args.noSkills = true; break;
      case '--yes': args.yes = true; break;
      default: throw new Error(`Argument inconnu : ${a}`);
```

ACTUEL :
```js
export const KNOWN = { STACKS, ASSISTANTS };
```

REMPLACÉ :
```js
export const KNOWN = { STACKS, ASSISTANTS };

// Étend ~ vers le dossier personnel : le shell ne le fait pas quand la valeur vient du wizard
// ou d'un drapeau quoté ("~/mon-app"). Sans ça, un dossier littéral « ~ » est créé dans le projet.
export function expandHome(p, home) {
  if (typeof p !== 'string' || !p.startsWith('~')) return p;
  if (p === '~') return home;
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(home, p.slice(2));
  return p; // formes ~autre-utilisateur : non gérées, renvoyées telles quelles
}

// Un nom nu (sans séparateur) atterrit EN DEHORS du clone du kit : ../<nom> par rapport à la
// racine du kit. Un chemin explicite (relatif avec séparateur, ou absolu) est respecté tel quel.
export function resolveProjectDir(project, kitRoot) {
  if (path.isAbsolute(project)) return path.resolve(project);
  if (project.includes('/') || project.includes('\\')) return path.resolve(project);
  return path.resolve(kitRoot, '..', project);
}
```

- [ ] **Étape 4 : Lance, vérifie que ça passe**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/args.test.mjs
```

Attendu : `fail 0`.

- [ ] **Étape 5 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add scripts/lib/args.mjs scripts/lib/args.test.mjs && git commit -m "feat(args): expandHome + resolveProjectDir + --yes, source par défaut différée

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Tâche 3 : wizard — mode non-interactif complet, Ctrl+C propre, aide non-TTY (T2b/T2f/T2g)

**Files:**
- Modify: `scripts/lib/wizard.mjs`
- Test: `scripts/lib/wizard.test.mjs`

**Interfaces:**
- Consumes: `validateArgs` (existant, inchangé).
- Produces (consommés par la tâche 4) :
  - `export function needsWizard(argv, isTTY)` → `true` seulement si `isTTY === true` ET `--yes` absent ET les trois drapeaux `--stack`, `--assistant`, `--project` ne sont pas TOUS présents.
  - `export function buildArgsFromAnswers(a, base = {})` → comme avant, mais conserve les drapeaux CLI déjà passés : `mockup: base.mockup ?? null`, `source: base.source ?? null`, `dryRun: Boolean(base.dryRun)`, `force: Boolean(base.force)`, `noSkills: Boolean(base.noSkills)`, `yes: Boolean(base.yes)`.
  - `export function wireSigint(rl, exit = process.exit, err = console.error)` → branche `rl.on('SIGINT', …)` : message court en français + `exit(130)` ; retourne `rl`.
  - `export function renderNonTtyHelp()` → string d'aide (mentionne les drapeaux, PowerShell et Git Bash/MinTTY).

- [ ] **Étape 1 : Écris les tests qui échouent**

Dans `scripts/lib/wizard.test.mjs`.

ACTUEL :
```js
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard } from './wizard.mjs';
```

REMPLACÉ :
```js
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard, wireSigint, renderNonTtyHelp } from './wizard.mjs';
```

ACTUEL :
```js
test('needsWizard : sans flags ET TTY seulement', () => {
  assert.equal(needsWizard([], true), true);
  assert.equal(needsWizard([], false), false);
  assert.equal(needsWizard(['--stack', 'saas'], true), false);
});
```

REMPLACÉ :
```js
test('needsWizard : TTY + config incomplète (le wizard complète) ; --yes = jamais de questions', () => {
  assert.equal(needsWizard([], true), true);
  assert.equal(needsWizard([], false), false);
  assert.equal(needsWizard(['--stack', 'saas'], true), true); // incomplet + TTY → le wizard complète
  assert.equal(needsWizard(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x'], true), false);
  assert.equal(needsWizard(['--stack', 'saas'], false), false);
  assert.equal(needsWizard(['--yes'], true), false);
});
```

ACTUEL :
```js
test('buildArgsFromAnswers : mappe + défauts + validation', () => {
  const a = buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local', caveman: true });
  assert.equal(a.stack, 'saas');
  assert.equal(a.source, '.');
  assert.equal(a.backend, 'local');
  assert.equal(a.caveman, true);
  assert.equal(a.dryRun, false);
});
```

REMPLACÉ :
```js
test('buildArgsFromAnswers : mappe + défauts + validation', () => {
  const a = buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local', caveman: true });
  assert.equal(a.stack, 'saas');
  assert.equal(a.source, null); // null = setup.mjs y mettra la racine du kit
  assert.equal(a.backend, 'local');
  assert.equal(a.caveman, true);
  assert.equal(a.dryRun, false);
});

test('buildArgsFromAnswers : conserve les drapeaux CLI déjà passés (base)', () => {
  const base = { source: '../kit', noSkills: true, force: true, dryRun: false, yes: false, mockup: null };
  const a = buildArgsFromAnswers({ stack: 'mobile', assistant: 'cursor', project: 'app' }, base);
  assert.equal(a.source, '../kit');
  assert.equal(a.noSkills, true);
  assert.equal(a.force, true);
});
```

Ajoute à la fin du fichier :

```js
test('wireSigint : Ctrl+C → message + exit 130', () => {
  const handlers = {};
  const rl = { on(evt, cb) { handlers[evt] = cb; } };
  const codes = [], msgs = [];
  wireSigint(rl, (c) => codes.push(c), (m) => msgs.push(m));
  handlers.SIGINT();
  assert.deepEqual(codes, [130]);
  assert.match(msgs[0], /annulée/);
});

test('renderNonTtyHelp : mentionne les drapeaux, PowerShell et Git Bash', () => {
  const h = renderNonTtyHelp();
  assert.match(h, /--stack/);
  assert.match(h, /--assistant/);
  assert.match(h, /--project/);
  assert.match(h, /PowerShell/);
  assert.match(h, /Git Bash/);
});
```

- [ ] **Étape 2 : Lance, vérifie l'échec**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/wizard.test.mjs
```

Attendu : ÉCHEC — `SyntaxError: The requested module './wizard.mjs' does not provide an export named 'renderNonTtyHelp'`.

- [ ] **Étape 3 : Implémente**

Dans `scripts/lib/wizard.mjs`.

ACTUEL :
```js
export function needsWizard(argv, isTTY) {
  return argv.length === 0 && isTTY === true;
}

export function buildArgsFromAnswers(a) {
  const args = {
    stack: a.stack, assistant: a.assistant, project: a.project,
    mockup: null, source: '.', dryRun: false, force: false,
    caveman: Boolean(a.caveman), backend: a.backend || 'cloud',
  };
  const errs = validateArgs(args);
  if (errs.length) throw new Error(errs.join(' ; '));
  return args;
}
```

REMPLACÉ :
```js
// Wizard seulement si terminal interactif ET config incomplète. --yes force le mode non-interactif
// (une cohorte lance UNE commande avec tous les drapeaux, jamais de question posée).
export function needsWizard(argv, isTTY) {
  if (isTTY !== true) return false;
  if (argv.includes('--yes')) return false;
  return !['--stack', '--assistant', '--project'].every((f) => argv.includes(f));
}

// base = drapeaux déjà passés en CLI (--source, --force, --no-skills…) : conservés.
// Les réponses du wizard priment pour stack/assistant/projet/backend/caveman.
export function buildArgsFromAnswers(a, base = {}) {
  const args = {
    stack: a.stack, assistant: a.assistant, project: a.project,
    mockup: base.mockup ?? null, source: base.source ?? null, dryRun: Boolean(base.dryRun), force: Boolean(base.force),
    caveman: Boolean(a.caveman), backend: a.backend || 'cloud',
    noSkills: Boolean(base.noSkills), yes: Boolean(base.yes),
  };
  const errs = validateArgs(args);
  if (errs.length) throw new Error(errs.join(' ; '));
  return args;
}

// Ctrl+C pendant une question readline : sans handler dédié, le wizard gèle. 130 = 128 + SIGINT(2).
export function wireSigint(rl, exit = process.exit, err = console.error) {
  rl.on('SIGINT', () => {
    err('\nInstallation annulée (Ctrl+C). Rien n\'a été cassé — relance quand tu veux.');
    exit(130);
  });
  return rl;
}

export function renderNonTtyHelp() {
  return [
    'Terminal non interactif : le wizard ne peut pas poser ses questions ici.',
    'Deux options :',
    '  1. Passe tout en drapeaux : node scripts/setup.mjs --stack saas|mobile|desktop --assistant cursor|claude-code|codex --project ../mon-app',
    '  2. Relance depuis un vrai terminal. Sous Windows, lance depuis PowerShell, pas Git Bash (MinTTY n\'est pas vu comme un terminal interactif).',
  ].join('\n');
}
```

ACTUEL :
```js
    project = (await ask('  Nom du projet (dossier) : ')).trim();
```

REMPLACÉ :
```js
    project = (await ask('  Nom du projet (dossier — créé à côté du kit) : ')).trim();
```

- [ ] **Étape 4 : Lance, vérifie que ça passe**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/wizard.test.mjs
```

Attendu : `fail 0`.

- [ ] **Étape 5 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add scripts/lib/wizard.mjs scripts/lib/wizard.test.mjs && git commit -m "feat(wizard): mode non-interactif complet (--yes), Ctrl+C propre (130), aide non-TTY PowerShell

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Tâche 4 : `main()` robuste — prérequis d'abord, racine du kit auto, projet hors du clone, prompt final partout (T2a/T2c/T2d/T2e/T2f/T2g)

**Files:**
- Modify: `scripts/setup.mjs`
- Test: `scripts/setup.test.mjs` (réécrit en entier)

**Interfaces:**
- Consumes: `expandHome(p, home)` et `resolveProjectDir(project, kitRoot)` (tâche 2) ; `needsWizard(argv, isTTY)`, `buildArgsFromAnswers(a, base)`, `wireSigint(rl)`, `renderNonTtyHelp()` (tâche 3).
- Produces (consommés par les tests et la tâche 8) :
  - `export function kitRootFromModuleUrl(moduleUrl)` → chemin absolu du dossier parent de `scripts/` (racine du kit).
  - `export function buildRunPlan(args, kitRoot = process.cwd())` → `{ assets, projectDir }` avec `projectDir = resolveProjectDir(args.project, kitRoot)`.
  - Comportement CLI : prérequis Node/git vérifiés EN PREMIER ; `--source` par défaut = racine du kit ; `~` étendu ; le prompt final « colle ça dans ton IA » s'affiche dans TOUS les modes (sauf `--dry-run`) ; non-TTY sans drapeaux valides → erreurs + `renderNonTtyHelp()` + exit 1.

- [ ] **Étape 1 : Écris les tests qui échouent**

Remplace TOUT le contenu de `scripts/setup.test.mjs` par :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRunPlan, kitRootFromModuleUrl } from './setup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('kitRootFromModuleUrl : racine du kit = dossier parent de scripts/', () => {
  assert.equal(kitRootFromModuleUrl(import.meta.url), ROOT);
});

test('buildRunPlan : nom nu → projet créé À CÔTÉ du kit (../<nom>)', () => {
  const { assets, projectDir } = buildRunPlan({ stack: 'saas', assistant: 'cursor', project: 'mon-app' }, path.join(path.sep, 'tmp', 'kit'));
  assert.equal(assets.commandsDir, '.cursor/commands');
  assert.equal(projectDir, path.resolve(path.join(path.sep, 'tmp', 'kit'), '..', 'mon-app'));
});

test('buildRunPlan : chemin explicite (relatif avec séparateur, ou absolu) respecté', () => {
  const kit = path.join(path.sep, 'tmp', 'kit');
  assert.equal(buildRunPlan({ stack: 'saas', assistant: 'cursor', project: 'apps/mon-app' }, kit).projectDir, path.resolve('apps/mon-app'));
  const abs = path.join(os.tmpdir(), 'ailleurs-app');
  assert.equal(buildRunPlan({ stack: 'saas', assistant: 'cursor', project: abs }, kit).projectDir, path.resolve(abs));
});

test('non-TTY sans drapeaux : erreurs + aide PowerShell + exit 1', () => {
  let code = 0, err = '';
  try { execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'setup.mjs')], { stdio: 'pipe' }); }
  catch (e) { code = e.status ?? 1; err = String(e.stderr); }
  assert.equal(code, 1);
  assert.match(err, /--stack/);
  assert.match(err, /PowerShell/);
});

test('lancé depuis un autre dossier : --dry-run résout le projet hors du clone du kit', () => {
  const out = execFileSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'setup.mjs'), '--stack', 'saas', '--assistant', 'cursor', '--project', 'demo-hors-kit', '--dry-run'],
    { cwd: os.tmpdir(), encoding: 'utf8' },
  );
  const plan = JSON.parse(out);
  assert.equal(plan.projectDir, path.resolve(ROOT, '..', 'demo-hors-kit'));
});
```

- [ ] **Étape 2 : Lance, vérifie l'échec**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/setup.test.mjs
```

Attendu : ÉCHEC — `SyntaxError: The requested module './setup.mjs' does not provide an export named 'kitRootFromModuleUrl'`.

- [ ] **Étape 3 : Implémente (4 modifications dans `scripts/setup.mjs`)**

Modification 3a — imports :

ACTUEL :
```js
import { pathToFileURL } from 'node:url';
import { parseArgs, validateArgs } from './lib/args.mjs';
```

REMPLACÉ :
```js
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs, validateArgs, expandHome, resolveProjectDir } from './lib/args.mjs';
```

Modification 3b — readline en import dynamique (le check Node doit s'exécuter même sur un vieux Node où `node:readline/promises` n'existe pas) :

ACTUEL :
```js
import readline from 'node:readline/promises';
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard } from './lib/wizard.mjs';
```

REMPLACÉ :
```js
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard, wireSigint, renderNonTtyHelp } from './lib/wizard.mjs';
```

Modification 3c — `kitRootFromModuleUrl` + nouvelle signature de `buildRunPlan` :

ACTUEL :
```js
export function buildRunPlan(args) {
  const assets = resolveAssets(args.stack, args.assistant);
  const projectDir = path.resolve(args.project);
  return { assets, projectDir };
}
```

REMPLACÉ :
```js
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
```

Modification 3d — tête de `main()` :

ACTUEL :
```js
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
```

REMPLACÉ :
```js
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
```

Modification 3e — rapport + prompt final dans TOUS les modes (fin de `main()`) :

ACTUEL :
```js
  console.log(formatReport({ project: args.project, stack: args.stack, assistant: args.assistant, done, inAssistant: assets.inAssistant, skipped: assets.skipped, failed }));
  if (fromWizard) {
    console.log('\n' + ok('Config prête. Ouvre ton assistant IA dans le dossier du projet.', on));
    console.log('\n— Colle ce prompt dans ton assistant —\n');
    console.log([
      "Finalise l'install et démarre :",
      '1. Ouvre docs/SETUP-AI.md → installe les plugins et autorise les MCP (/mcp). (Les skills — design + stack — sont déjà installés par le wizard.)',
      `2. Boucle superpowers : ${SUPERPOWERS[args.assistant]}`,
      '3. /doctor pour vérifier.',
      '4. /new-project (PRD + tech spec + design), puis /build.',
    ].join('\n'));
  }
}
```

REMPLACÉ :
```js
  console.log(formatReport({ project: projectDir, stack: args.stack, assistant: args.assistant, done, inAssistant: assets.inAssistant, skipped: assets.skipped, failed }));
  console.log('\n' + ok(`Config prête. Projet créé dans : ${projectDir}`, on));
  console.log('\n— Colle ce prompt dans ton assistant —\n');
  console.log([
    "Finalise l'install et démarre :",
    '1. Ouvre docs/SETUP-AI.md → installe les plugins et autorise les MCP (/mcp). (Les skills — design + stack — sont déjà installés par le wizard.)',
    `2. Boucle superpowers : ${SUPERPOWERS[args.assistant]}`,
    '3. /doctor pour vérifier.',
    '4. /new-project (PRD + tech spec + design), puis /build.',
  ].join('\n'));
}
```

- [ ] **Étape 4 : Lance, vérifie que ça passe**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/setup.test.mjs
```

Attendu : `fail 0`.

- [ ] **Étape 5 : Lance la suite entière**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test
```

Attendu : `fail 0` (le test d'idempotence passe toujours : il fournit `--source .` explicitement et un chemin de projet absolu).

- [ ] **Étape 6 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add scripts/setup.mjs scripts/setup.test.mjs && git commit -m "feat(setup): prérequis en premier, racine du kit auto, projet hors du clone, prompt final partout

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Tâche 5 : `git init` + hooks réels + commit initial dans le projet généré (T3)

**Files:**
- Create: `scripts/lib/gitinit.mjs`
- Modify: `scripts/setup.mjs`, `templates/ONBOARDING.md`, `scripts/lib/setup-idempotent.test.mjs`
- Test: `scripts/lib/gitinit.test.mjs`

**Interfaces:**
- Consumes: rien des tâches précédentes (module autonome).
- Produces (consommé par `scripts/setup.mjs` et le smoke de la tâche 10) :
  - `export function initProjectGit({ projectDir, run = defaultRun })` → `{ done: string[], failed: string[] }`. Si `projectDir` est déjà dans un dépôt git : ne touche à rien (`{ done: [], failed: [] }`). Sinon : `git init -b main` + `git config core.hooksPath .githooks` + `git add -A` + `git commit --no-verify -m "chore: environnement vibecoding initial"`. Sorties silencieuses (`stdio: 'pipe'`), échec non-fatal (message français dans `failed`).
  - Le commit initial passe `--no-verify` : le contenu vient du kit et des dépôts clonés (déjà scannés) ; le hook pre-commit protège les commits SUIVANTS de l'élève (sinon la regex élargie de la tâche 8 pourrait bloquer un fichier tiers cloné et rendre l'install flaky).

- [ ] **Étape 1 : Écris les tests qui échouent**

Crée `scripts/lib/gitinit.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initProjectGit } from './gitinit.mjs';

test('initProjectGit : séquence complète quand pas de dépôt', () => {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, ...args]);
    if (args.includes('rev-parse')) throw new Error('pas un dépôt');
  };
  const res = initProjectGit({ projectDir: '/p', run });
  assert.deepEqual(calls, [
    ['git', '-C', '/p', 'rev-parse', '--is-inside-work-tree'],
    ['git', '-C', '/p', 'init', '-b', 'main'],
    ['git', '-C', '/p', 'config', 'core.hooksPath', '.githooks'],
    ['git', '-C', '/p', 'add', '-A'],
    ['git', '-C', '/p', 'commit', '--no-verify', '-m', 'chore: environnement vibecoding initial'],
  ]);
  assert.equal(res.done.length, 1);
  assert.deepEqual(res.failed, []);
});

test('initProjectGit : dépôt déjà présent → ne touche à rien', () => {
  const calls = [];
  const run = (cmd, args) => { calls.push([cmd, ...args]); }; // rev-parse réussit
  const res = initProjectGit({ projectDir: '/p', run });
  assert.equal(calls.length, 1);
  assert.deepEqual(res.done, []);
  assert.deepEqual(res.failed, []);
});

test('initProjectGit : échec git → failed[] en français, pas de throw', () => {
  const run = (cmd, args) => {
    if (args.includes('rev-parse')) throw new Error('pas un dépôt');
    if (args.includes('commit')) throw new Error('empty ident name');
  };
  const res = initProjectGit({ projectDir: '/p', run });
  assert.deepEqual(res.done, []);
  assert.equal(res.failed.length, 1);
  assert.match(res.failed[0], /git config --global user\.name/);
});

test('initProjectGit : vrai git dans un tmpdir (intégration)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-gitinit-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'contenu de test');
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
  };
  const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe', env });
  const res = initProjectGit({ projectDir: dir, run });
  assert.deepEqual(res.failed, []);
  assert.ok(fs.existsSync(path.join(dir, '.git')), '.git créé');
  assert.equal(execFileSync('git', ['-C', dir, 'config', 'core.hooksPath'], { encoding: 'utf8' }).trim(), '.githooks');
  assert.match(execFileSync('git', ['-C', dir, 'log', '--oneline'], { encoding: 'utf8', env }), /environnement vibecoding initial/);
});
```

- [ ] **Étape 2 : Lance, vérifie l'échec**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/gitinit.test.mjs
```

Attendu : ÉCHEC — `Cannot find module '…/scripts/lib/gitinit.mjs'` (ERR_MODULE_NOT_FOUND).

- [ ] **Étape 3 : Implémente `scripts/lib/gitinit.mjs`**

Crée le fichier avec exactement :

```js
// scripts/lib/gitinit.mjs — dépôt git réel dans le projet généré : les hooks (.githooks) sont
// actifs dès la première minute et l'élève a un premier point de retour arrière.
import { execFileSync } from 'node:child_process';

const defaultRun = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe' });

// Si projectDir n'est pas déjà dans un dépôt : init -b main + hooksPath + add + commit initial.
// --no-verify sur le commit initial : le contenu vient du kit (déjà scanné) ; le hook pre-commit
// protège les commits SUIVANTS de l'élève. Échec non-fatal : failed[] en français, l'installeur continue.
export function initProjectGit({ projectDir, run = defaultRun }) {
  const done = [], failed = [];
  let isRepo = true;
  try { run('git', ['-C', projectDir, 'rev-parse', '--is-inside-work-tree']); }
  catch { isRepo = false; }
  if (isRepo) return { done, failed }; // dépôt existant (ou projet dans un dépôt parent) : on ne touche à rien
  try {
    run('git', ['-C', projectDir, 'init', '-b', 'main']);
    run('git', ['-C', projectDir, 'config', 'core.hooksPath', '.githooks']);
    run('git', ['-C', projectDir, 'add', '-A']);
    run('git', ['-C', projectDir, 'commit', '--no-verify', '-m', 'chore: environnement vibecoding initial']);
    done.push('dépôt git (init + hooks pre-commit actifs + commit initial)');
  } catch (e) {
    failed.push(`git init (${String(e.message).split('\n')[0]}) — configure ton identité git (git config --global user.name "Ton Nom" && git config --global user.email "toi@exemple.fr") puis relance le script`);
  }
  return { done, failed };
}
```

- [ ] **Étape 4 : Lance, vérifie que ça passe**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/gitinit.test.mjs
```

Attendu : 4 tests, `fail 0`.

- [ ] **Étape 5 : Câble dans `scripts/setup.mjs`**

Modification 5a — import :

ACTUEL :
```js
import { cloneRepo, pickFromClone, selectByTags, installCaveman, installSkills } from './lib/external.mjs';
```

REMPLACÉ :
```js
import { cloneRepo, pickFromClone, selectByTags, installCaveman, installSkills } from './lib/external.mjs';
import { initProjectGit } from './lib/gitinit.mjs';
```

Modification 5b — appel (après le bloc caveman, avant l'installation des skills : le commit couvre tous les fichiers du projet et n'attend pas le réseau) :

ACTUEL :
```js
  if (args.caveman) {
    try { installCaveman(); done.push('caveman (réduction des coûts)'); }
    catch (e) { failed.push(`caveman (${e.message})`); }
  }

  if (!args.noSkills) {
```

REMPLACÉ :
```js
  if (args.caveman) {
    try { installCaveman(); done.push('caveman (réduction des coûts)'); }
    catch (e) { failed.push(`caveman (${e.message})`); }
  }

  // Dépôt git réel : hooks pre-commit actifs immédiatement + premier point de retour arrière.
  const g = initProjectGit({ projectDir });
  done.push(...g.done);
  failed.push(...g.failed);

  if (!args.noSkills) {
```

- [ ] **Étape 6 : Retire l'étape manuelle de `templates/ONBOARDING.md` (devenue automatique)**

ACTUEL :
```md
## Git — activer le hook pre-commit
`git config core.hooksPath .githooks` (bloque les secrets évidents + linte avant chaque commit).
```

REMPLACÉ :
```md
## Git — hook pre-commit
Déjà actif : l'installeur a fait `git init` et `git config core.hooksPath .githooks` pour toi. À chaque commit, il bloque les secrets évidents et lance le linter.
```

- [ ] **Étape 7 : Mets à jour le test d'idempotence (le setup fait maintenant un commit → identité git explicite pour la CI)**

Dans `scripts/lib/setup-idempotent.test.mjs`.

ACTUEL :
```js
test('re-run sans --force : la note backend local reste unique', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-idem-'));
  const run = () => execFileSync(
    process.execPath,
    ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'claude-code', '--project', dir, '--backend', 'local', '--no-skills'],
    { stdio: 'ignore' },
  );
```

REMPLACÉ :
```js
test('re-run sans --force : la note backend local reste unique', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-idem-'));
  // Identité git explicite : le setup fait maintenant un commit initial (CI sans user.name global).
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
  };
  const run = () => execFileSync(
    process.execPath,
    ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'claude-code', '--project', dir, '--backend', 'local', '--no-skills'],
    { stdio: 'ignore', env },
  );
```

- [ ] **Étape 8 : Lance la suite entière**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test
```

Attendu : `fail 0`.

- [ ] **Étape 9 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add scripts/lib/gitinit.mjs scripts/lib/gitinit.test.mjs scripts/setup.mjs templates/ONBOARDING.md scripts/lib/setup-idempotent.test.mjs && git commit -m "feat(git): dépôt initialisé + hooks actifs + commit initial dans le projet généré

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Tâche 6 : rendus honnêtes — `formatReport` à 3 états + `renderSetupAi` avec `skillsInstalled` (T4b partiel + T4d)

**Files:**
- Modify: `scripts/lib/report.mjs`, `scripts/lib/setup-ai.mjs`, `scripts/lib/environment.mjs`
- Test: `scripts/lib/report.test.mjs`, `scripts/lib/setup-ai.test.mjs`

**Interfaces:**
- Consumes: `buildSkillAddArgs(spec, assistant)` (existant), `DESIGN_SKILL_SPECS` (existant dans `matrix.mjs`).
- Produces (consommés par la tâche 7) :
  - `export function formatReport({ project, stack, assistant, done, kept = [], inAssistant, skipped, failed })` → section « Créé : » (✅), section « Conservé (déjà présent…) : » (•) si `kept` non vide, puis Échecs/À lancer/Sauté comme avant. Rétro-compatible : `kept` optionnel.
  - `export function renderSetupAi({ stack, assistant, manifest, superpowersCmd, shadcnNote, skillsInstalled = true })` → si `skillsInstalled === false`, les sections 2 (skills stack) et 5 (design + Stitch) ne disent PLUS « ✅ déjà installés par le wizard » mais listent les commandes `npx … skills add …` à lancer (cases à cocher).
  - `export function writeStackEnvironment({ projectDir, source, stack, assistant, skillsInstalled = true })` → passe `skillsInstalled` à `renderSetupAi`. Rétro-compatible.

- [ ] **Étape 1 : Écris les tests qui échouent**

Ajoute à la fin de `scripts/lib/report.test.mjs` :

```js
test('le rapport affiche les fichiers conservés (jamais écrasés)', () => {
  const out = formatReport({
    project: '/abs/mon-app', stack: 'saas', assistant: 'cursor',
    done: [], kept: ['docs/ONBOARDING.md', '⚠️ AGENTS.md existant conservé (nouvelle version : AGENTS.md.new)'],
    inAssistant: [], skipped: [], failed: [],
  });
  assert.match(out, /Conservé/);
  assert.match(out, /AGENTS\.md\.new/);
  assert.match(out, /docs\/ONBOARDING\.md/);
});
```

Ajoute à la fin de `scripts/lib/setup-ai.test.mjs` :

```js
test('SETUP-AI --no-skills : liste les commandes à lancer, ne ment pas', () => {
  const md = renderSetupAi({
    stack: 'saas', assistant: 'claude-code', manifest: resolveStackManifest('saas', 'claude-code'),
    superpowersCmd: SUPERPOWERS['claude-code'], shadcnNote: SHADCN_NOTE, skillsInstalled: false,
  });
  assert.ok(!md.includes('déjà installés par le wizard'), 'aucun faux ✅');
  assert.match(md, /PAS installés/);
  assert.match(md, /\[ \] `npx -y skills add better-auth\/skills/);          // skills stack en cases à cocher
  assert.match(md, /\[ \] `npx -y skills add github\.com\/anthropics\/skills/); // skills design en cases à cocher
});
```

- [ ] **Étape 2 : Lance, vérifie l'échec**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/report.test.mjs scripts/lib/setup-ai.test.mjs
```

Attendu : ÉCHEC — le test rapport échoue sur `/Conservé/` (AssertionError), le test SETUP-AI échoue sur « aucun faux ✅ ».

- [ ] **Étape 3 : Implémente `scripts/lib/report.mjs`**

ACTUEL (fichier entier) :
```js
export function formatReport({ project, stack, assistant, done, inAssistant, skipped, failed }) {
  const L = [];
  L.push(`\n=== vibe-stack : ${project} (${stack} / ${assistant}) ===`);
  L.push('\nInstallé :');
  for (const d of done) L.push(`  ✅ ${d}`);
  if (failed.length) { L.push('\nÉchecs (relance le script) :'); for (const f of failed) L.push(`  ❌ ${f}`); }
  if (inAssistant.length) { L.push('\nÀ lancer DANS ton assistant IA :'); for (const s of inAssistant) L.push(`  ▸ ${s.name} : ${s.command}`); }
  if (skipped.length) { L.push('\nSauté :'); for (const s of skipped) L.push(`  – ${s.name} (${s.reason})`); }
  L.push('\nProchaine étape : lance /new-project (fondation), puis /new-feature pour chaque feature.');
  return L.join('\n');
}
```

REMPLACÉ (fichier entier) :
```js
// Rapport à 3 états : créé (✅) / conservé (•, déjà présent — jamais écrasé) / échec (❌).
export function formatReport({ project, stack, assistant, done, kept = [], inAssistant, skipped, failed }) {
  const L = [];
  L.push(`\n=== vibe-stack : ${project} (${stack} / ${assistant}) ===`);
  L.push('\nCréé :');
  for (const d of done) L.push(`  ✅ ${d}`);
  if (kept.length) { L.push('\nConservé (déjà présent — le kit n\'écrase jamais tes fichiers) :'); for (const k of kept) L.push(`  • ${k}`); }
  if (failed.length) { L.push('\nÉchecs (relance le script) :'); for (const f of failed) L.push(`  ❌ ${f}`); }
  if (inAssistant.length) { L.push('\nÀ lancer DANS ton assistant IA :'); for (const s of inAssistant) L.push(`  ▸ ${s.name} : ${s.command}`); }
  if (skipped.length) { L.push('\nSauté :'); for (const s of skipped) L.push(`  – ${s.name} (${s.reason})`); }
  L.push('\nProchaine étape : lance /new-project (fondation), puis /new-feature pour chaque feature.');
  return L.join('\n');
}
```

- [ ] **Étape 4 : Implémente `scripts/lib/setup-ai.mjs`**

Modification 4a — import + signature :

ACTUEL :
```js
import { buildSkillAddArgs } from './external.mjs';
import { STITCH } from './matrix.mjs';

export function renderSetupAi({ stack, assistant, manifest, superpowersCmd, shadcnNote }) {
```

REMPLACÉ :
```js
import { buildSkillAddArgs } from './external.mjs';
import { DESIGN_SKILL_SPECS, STITCH } from './matrix.mjs';

// skillsInstalled=false (wizard lancé avec --no-skills) : on liste les commandes au lieu d'un faux ✅.
export function renderSetupAi({ stack, assistant, manifest, superpowersCmd, shadcnNote, skillsInstalled = true }) {
```

Modification 4b — section 2 :

ACTUEL :
```js
  L.push('## 2. Skills portables (stack)');
  if (manifest.skills.length) {
    L.push(`- ✅ déjà installés par le wizard : ${manifest.skills.map((s) => s.label).join(', ')}`);
    L.push('- (si un install a échoué — réseau — relance à la main :)');
    for (const s of manifest.skills) L.push(`  - \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  } else L.push('- [ ] (aucun)');
```

REMPLACÉ :
```js
  L.push('## 2. Skills portables (stack)');
  if (manifest.skills.length) {
    if (skillsInstalled) {
      L.push(`- ✅ déjà installés par le wizard : ${manifest.skills.map((s) => s.label).join(', ')}`);
      L.push('- (si un install a échoué — réseau — relance à la main :)');
    } else {
      L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
    }
    for (const s of manifest.skills) L.push(`  - ${skillsInstalled ? '' : '[ ] '}\`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  } else L.push('- [ ] (aucun)');
```

Modification 4c — section 5 :

ACTUEL :
```js
  L.push('## 5. Design');
  L.push('- ✅ déjà installés par le wizard : frontend-design, brand-guidelines, web-design-guidelines, ui-ux-pro-max');
  L.push(`- [ ] ${shadcnNote.replace('<assistant>', assistant)}`);
  L.push('');
  L.push('### Maquette IA — Stitch (si tu n\'as pas de design à fournir)');
  L.push('- ✅ skills Stitch déjà installés par le wizard (generate-design · extract-html · loop · design-md).');
```

REMPLACÉ :
```js
  L.push('## 5. Design');
  if (skillsInstalled) {
    L.push('- ✅ déjà installés par le wizard : frontend-design, brand-guidelines, web-design-guidelines, ui-ux-pro-max');
  } else {
    L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
    for (const s of DESIGN_SKILL_SPECS) L.push(`  - [ ] \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  }
  L.push(`- [ ] ${shadcnNote.replace('<assistant>', assistant)}`);
  L.push('');
  L.push('### Maquette IA — Stitch (si tu n\'as pas de design à fournir)');
  L.push(skillsInstalled
    ? '- ✅ skills Stitch déjà installés par le wizard (generate-design · extract-html · loop · design-md).'
    : '- ⚠️ skills Stitch PAS installés : couverts par les commandes de la section 2 ci-dessus (spec « stitch »).');
```

- [ ] **Étape 5 : Implémente `scripts/lib/environment.mjs` (pass-through)**

ACTUEL :
```js
export function writeStackEnvironment({ projectDir, source, stack, assistant }) {
```

REMPLACÉ :
```js
export function writeStackEnvironment({ projectDir, source, stack, assistant, skillsInstalled = true }) {
```

ACTUEL :
```js
  try { write('docs/SETUP-AI.md', renderSetupAi({ stack, assistant, manifest, superpowersCmd: SUPERPOWERS[assistant], shadcnNote: SHADCN_NOTE })); done.push('docs/SETUP-AI.md'); }
```

REMPLACÉ :
```js
  try { write('docs/SETUP-AI.md', renderSetupAi({ stack, assistant, manifest, superpowersCmd: SUPERPOWERS[assistant], shadcnNote: SHADCN_NOTE, skillsInstalled })); done.push('docs/SETUP-AI.md'); }
```

- [ ] **Étape 6 : Lance, vérifie que ça passe**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/report.test.mjs scripts/lib/setup-ai.test.mjs scripts/lib/environment.test.mjs
```

Attendu : `fail 0` (les tests environnement existants passent : `skillsInstalled` a un défaut rétro-compatible).

- [ ] **Étape 7 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add scripts/lib/report.mjs scripts/lib/report.test.mjs scripts/lib/setup-ai.mjs scripts/lib/setup-ai.test.mjs scripts/lib/environment.mjs && git commit -m "feat(rapport): état « conservé » + SETUP-AI honnête avec --no-skills

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Tâche 7 : setup.mjs honnête — 3 états partout, AGENTS.md.new, exit 1 si échec (T4a/T4b/T4c/T4d)

**Files:**
- Modify: `scripts/setup.mjs`
- Test: `scripts/lib/setup-rerun.test.mjs` (nouveau)

**Interfaces:**
- Consumes: `formatReport(... kept ...)`, `writeStackEnvironment(... skillsInstalled ...)` (tâche 6) ; `copyIfAbsent`/`copyDirIfAbsent` retournent déjà `{ dest, status: 'copied' | 'skipped-exists' }` et `[{…}]` (AUCUNE modification de `scripts/lib/fsops.mjs` n'est nécessaire — seuls les appels changent).
- Produces : comportement CLI final —
  - chaque copie alimente `done` (créé) ou `kept` (déjà présent) via deux helpers locaux `track(label, res)` et `trackDir(label, results)` ;
  - `AGENTS.md`/`CLAUDE.md` existants ne sont JAMAIS écrasés (sans `--force`) : la nouvelle version part dans `AGENTS.md.new`/`CLAUDE.md.new` + entrée kept « ⚠️ AGENTS.md existant conservé (nouvelle version : AGENTS.md.new) » ;
  - `process.exitCode = 1` si `failed.length > 0` (le rapport et le prompt s'affichent quand même) ;
  - le prompt final ne prétend plus que les skills sont installés quand `--no-skills`.

- [ ] **Étape 1 : Écris le test d'intégration qui échoue**

Crée `scripts/lib/setup-rerun.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};

function runSetup(projectDir) {
  return execFileSync(
    process.execPath,
    ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'claude-code', '--project', projectDir, '--no-skills', '--yes'],
    { encoding: 'utf8', env: GIT_ENV },
  );
}

test('re-run : rapport 3 états + AGENTS.md.new + exit 0 quand tout va bien', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-rerun-'));
  runSetup(dir);
  const out2 = runSetup(dir); // 2e run : rien n'est écrasé
  assert.match(out2, /Conservé/);
  assert.match(out2, /⚠️ AGENTS\.md existant conservé \(nouvelle version : AGENTS\.md\.new\)/);
  assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md.new')), 'AGENTS.md.new écrit');
  assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md.new')), 'CLAUDE.md.new écrit');
});

test('échecs de copies (source vide) → exit ≠ 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-fail-'));
  const sourceVide = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-vide-'));
  let code = 0;
  try {
    execFileSync(
      process.execPath,
      ['scripts/setup.mjs', '--source', sourceVide, '--stack', 'saas', '--assistant', 'claude-code', '--project', dir, '--no-skills', '--yes'],
      { stdio: 'pipe', env: GIT_ENV },
    );
  } catch (e) { code = e.status ?? 1; }
  assert.notEqual(code, 0, 'exit 1 attendu quand failed[] non vide');
});
```

- [ ] **Étape 2 : Lance, vérifie l'échec**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/setup-rerun.test.mjs
```

Attendu : ÉCHEC — AssertionError sur `/Conservé/` (le 2e run affiche encore des ✅ menteurs) et sur `exit ≠ 0` (aujourd'hui exit 0 malgré les échecs). Nécessite le réseau (clone karpathy).

- [ ] **Étape 3 : Implémente — 12 modifications dans `scripts/setup.mjs` (dans l'ordre du fichier)**

Modification 3a — helpers + AGENTS.md.new :

ACTUEL :
```js
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
```

REMPLACÉ :
```js
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
```

Modification 3b — boucle des copies (le bloc des clones qui suit reste INCHANGÉ : cloner est une action re-jouée à chaque run) :

ACTUEL :
```js
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
```

REMPLACÉ :
```js
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
```

Modification 3c — boucle des commandes :

ACTUEL :
```js
      copyIfAbsent(src, path.join(projectDir, assets.commandsDir, `${cmd}.md`), opt);
      done.push(`${assets.commandsDir}/${cmd}.md`);
```

REMPLACÉ :
```js
      track(`${assets.commandsDir}/${cmd}.md`, copyIfAbsent(src, path.join(projectDir, assets.commandsDir, `${cmd}.md`), opt));
```

Modification 3d — mémoire + dream :

ACTUEL :
```js
  try { copyDirIfAbsent(path.join(args.source, 'templates/memory'), path.join(projectDir, 'docs/memory'), opt); done.push('docs/memory/'); }
  catch (e) { failed.push(`docs/memory (${e.message})`); }
  try {
    copyIfAbsent(path.join(args.source, 'templates/dream/dream.yml'), path.join(projectDir, '.github/workflows/dream.yml'), opt);
    copyIfAbsent(path.join(args.source, 'templates/dream/DREAM.md'), path.join(projectDir, 'docs/DREAM.md'), opt);
    done.push('dream (.github/workflows + docs/DREAM.md)');
  } catch (e) { failed.push(`dream (${e.message})`); }
```

REMPLACÉ :
```js
  try { trackDir('docs/memory/', copyDirIfAbsent(path.join(args.source, 'templates/memory'), path.join(projectDir, 'docs/memory'), opt)); }
  catch (e) { failed.push(`docs/memory (${e.message})`); }
  try {
    trackDir('dream (.github/workflows + docs/DREAM.md)', [
      copyIfAbsent(path.join(args.source, 'templates/dream/dream.yml'), path.join(projectDir, '.github/workflows/dream.yml'), opt),
      copyIfAbsent(path.join(args.source, 'templates/dream/DREAM.md'), path.join(projectDir, 'docs/DREAM.md'), opt),
    ]);
  } catch (e) { failed.push(`dream (${e.message})`); }
```

Modification 3e — extras Cursor :

ACTUEL :
```js
  if (args.assistant === 'cursor') {
    try {
      copyIfAbsent(path.join(args.source, 'templates/cursor/hooks.json'), path.join(projectDir, '.cursor/hooks.json'), opt);
      copyDirIfAbsent(path.join(args.source, 'templates/cursor/hooks'), path.join(projectDir, '.cursor/hooks'), opt);
      copyIfAbsent(path.join(args.source, 'templates/cursor/cursorignore'), path.join(projectDir, '.cursorignore'), opt);
      copyIfAbsent(path.join(args.source, 'templates/cursor/rules/00-project.mdc'), path.join(projectDir, '.cursor/rules/00-project.mdc'), opt);
      copyDirIfAbsent(path.join(args.source, `templates/cursor/rules/${args.stack}`), path.join(projectDir, '.cursor/rules'), opt);
      done.push('.cursor/hooks.json + .cursorignore (mémoire auto)');
      done.push('.cursor/rules/ (00-project + règles typées par framework)');
      copyIfAbsent(path.join(args.source, 'templates/cursor/BUGBOT.md'), path.join(projectDir, '.cursor/BUGBOT.md'), opt);
      copyIfAbsent(path.join(args.source, `templates/cursor/environment/${args.stack}.json`), path.join(projectDir, '.cursor/environment.json'), opt);
      copyIfAbsent(path.join(args.source, 'templates/cursor/cursorindexingignore'), path.join(projectDir, '.cursorindexingignore'), opt);
      done.push('.cursor/BUGBOT.md + .cursor/environment.json + .cursorindexingignore');
    } catch (e) { failed.push(`cursor extras (${e.message})`); }
  }
```

REMPLACÉ :
```js
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
```

Modification 3f — .env.example + secrets :

ACTUEL :
```js
  try { copyIfAbsent(path.join(args.source, `templates/env/${args.stack}.env.example`), path.join(projectDir, '.env.example'), opt); done.push('.env.example'); }
  catch (e) { failed.push(`.env.example (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, 'templates/security/secrets.yml'), path.join(projectDir, '.github/workflows/secrets.yml'), opt); done.push('scan secrets (gitleaks)'); }
  catch (e) { failed.push(`secrets (${e.message})`); }
```

REMPLACÉ :
```js
  try { track('.env.example', copyIfAbsent(path.join(args.source, `templates/env/${args.stack}.env.example`), path.join(projectDir, '.env.example'), opt)); }
  catch (e) { failed.push(`.env.example (${e.message})`); }
  try { track('scan secrets (gitleaks)', copyIfAbsent(path.join(args.source, 'templates/security/secrets.yml'), path.join(projectDir, '.github/workflows/secrets.yml'), opt)); }
  catch (e) { failed.push(`secrets (${e.message})`); }
```

Modification 3g — CI + onboarding :

ACTUEL :
```js
  try { copyIfAbsent(path.join(args.source, `templates/ci/${args.stack}.yml`), path.join(projectDir, '.github/workflows/ci.yml'), opt); done.push('.github/workflows/ci.yml'); }
  catch (e) { failed.push(`ci (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, 'templates/ONBOARDING.md'), path.join(projectDir, 'docs/ONBOARDING.md'), opt); done.push('docs/ONBOARDING.md'); }
  catch (e) { failed.push(`onboarding (${e.message})`); }
```

REMPLACÉ :
```js
  try { track('.github/workflows/ci.yml', copyIfAbsent(path.join(args.source, `templates/ci/${args.stack}.yml`), path.join(projectDir, '.github/workflows/ci.yml'), opt)); }
  catch (e) { failed.push(`ci (${e.message})`); }
  try { track('docs/ONBOARDING.md', copyIfAbsent(path.join(args.source, 'templates/ONBOARDING.md'), path.join(projectDir, 'docs/ONBOARDING.md'), opt)); }
  catch (e) { failed.push(`onboarding (${e.message})`); }
```

Modification 3h — roadmap + run (le bloc « note backend » qui suit reste INCHANGÉ : il est déjà idempotent) :

ACTUEL :
```js
  try { copyIfAbsent(path.join(args.source, 'templates/roadmap/ROADMAP.md'), path.join(projectDir, 'docs/ROADMAP.md'), opt); done.push('docs/ROADMAP.md (squelette)'); }
  catch (e) { failed.push(`roadmap (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, `templates/run/${args.stack}.md`), path.join(projectDir, 'docs/RUN.md'), opt); done.push('docs/RUN.md'); }
  catch (e) { failed.push(`run (${e.message})`); }
```

REMPLACÉ :
```js
  try { track('docs/ROADMAP.md (squelette)', copyIfAbsent(path.join(args.source, 'templates/roadmap/ROADMAP.md'), path.join(projectDir, 'docs/ROADMAP.md'), opt)); }
  catch (e) { failed.push(`roadmap (${e.message})`); }
  try { track('docs/RUN.md', copyIfAbsent(path.join(args.source, `templates/run/${args.stack}.md`), path.join(projectDir, 'docs/RUN.md'), opt)); }
  catch (e) { failed.push(`run (${e.message})`); }
```

Modification 3i — subagents + gitignore + consolidation :

ACTUEL :
```js
  try { copyDirIfAbsent(path.join(args.source, 'templates/agents/subagents'), path.join(projectDir, '.claude/agents'), opt); done.push('.claude/agents/ (code-reviewer + security-reviewer)'); }
  catch (e) { failed.push(`agents (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, `templates/gitignore/${args.stack}.gitignore`), path.join(projectDir, '.gitignore'), opt); done.push('.gitignore'); }
  catch (e) { failed.push(`.gitignore (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, 'templates/memory-consolidate/consolidate.yml'), path.join(projectDir, '.github/workflows/memory-consolidate.yml'), opt); done.push('consolidation mémoire (hebdo)'); }
  catch (e) { failed.push(`memory-consolidate (${e.message})`); }
```

REMPLACÉ :
```js
  try { trackDir('.claude/agents/ (code-reviewer + security-reviewer)', copyDirIfAbsent(path.join(args.source, 'templates/agents/subagents'), path.join(projectDir, '.claude/agents'), opt)); }
  catch (e) { failed.push(`agents (${e.message})`); }
  try { track('.gitignore', copyIfAbsent(path.join(args.source, `templates/gitignore/${args.stack}.gitignore`), path.join(projectDir, '.gitignore'), opt)); }
  catch (e) { failed.push(`.gitignore (${e.message})`); }
  try { track('consolidation mémoire (hebdo)', copyIfAbsent(path.join(args.source, 'templates/memory-consolidate/consolidate.yml'), path.join(projectDir, '.github/workflows/memory-consolidate.yml'), opt)); }
  catch (e) { failed.push(`memory-consolidate (${e.message})`); }
```

Modification 3j — pre-commit :

ACTUEL :
```js
  try {
    const hook = path.join(projectDir, '.githooks/pre-commit');
    copyIfAbsent(path.join(args.source, 'templates/hooks/pre-commit'), hook, opt);
    if (fs.existsSync(hook)) fs.chmodSync(hook, 0o755);
    done.push('.githooks/pre-commit');
  } catch (e) { failed.push(`pre-commit (${e.message})`); }
```

REMPLACÉ :
```js
  try {
    const hook = path.join(projectDir, '.githooks/pre-commit');
    track('.githooks/pre-commit', copyIfAbsent(path.join(args.source, 'templates/hooks/pre-commit'), hook, opt));
    if (fs.existsSync(hook)) fs.chmodSync(hook, 0o755);
  } catch (e) { failed.push(`pre-commit (${e.message})`); }
```

Modification 3k — environnement (skillsInstalled) + exemple :

ACTUEL :
```js
  try {
    const env = writeStackEnvironment({ projectDir, source: args.source, stack: args.stack, assistant: args.assistant });
    done.push(...env.done);
    failed.push(...env.failed);
  } catch (e) { failed.push(`environnement (${e.message})`); }

  try { copyIfAbsent(path.join(args.source, `templates/examples/${args.stack}.md`), path.join(projectDir, 'docs/examples/feature-exemple.md'), opt); done.push('docs/examples/feature-exemple.md'); }
  catch (e) { failed.push(`exemple (${e.message})`); }
```

REMPLACÉ :
```js
  try {
    const env = writeStackEnvironment({ projectDir, source: args.source, stack: args.stack, assistant: args.assistant, skillsInstalled: !args.noSkills });
    done.push(...env.done);
    failed.push(...env.failed);
  } catch (e) { failed.push(`environnement (${e.message})`); }

  try { track('docs/examples/feature-exemple.md', copyIfAbsent(path.join(args.source, `templates/examples/${args.stack}.md`), path.join(projectDir, 'docs/examples/feature-exemple.md'), opt)); }
  catch (e) { failed.push(`exemple (${e.message})`); }
```

Modification 3l — rapport final (kept + exit 1 + prompt honnête) :

ACTUEL :
```js
  console.log(formatReport({ project: projectDir, stack: args.stack, assistant: args.assistant, done, inAssistant: assets.inAssistant, skipped: assets.skipped, failed }));
  console.log('\n' + ok(`Config prête. Projet créé dans : ${projectDir}`, on));
  console.log('\n— Colle ce prompt dans ton assistant —\n');
  console.log([
    "Finalise l'install et démarre :",
    '1. Ouvre docs/SETUP-AI.md → installe les plugins et autorise les MCP (/mcp). (Les skills — design + stack — sont déjà installés par le wizard.)',
    `2. Boucle superpowers : ${SUPERPOWERS[args.assistant]}`,
    '3. /doctor pour vérifier.',
    '4. /new-project (PRD + tech spec + design), puis /build.',
  ].join('\n'));
}
```

REMPLACÉ :
```js
  console.log(formatReport({ project: projectDir, stack: args.stack, assistant: args.assistant, done, kept, inAssistant: assets.inAssistant, skipped: assets.skipped, failed }));
  if (failed.length) process.exitCode = 1; // rapport honnête : l'échec est visible aussi dans le code de sortie
  console.log('\n' + ok(`Config prête. Projet créé dans : ${projectDir}`, on));
  console.log('\n— Colle ce prompt dans ton assistant —\n');
  console.log([
    "Finalise l'install et démarre :",
    args.noSkills
      ? '1. Ouvre docs/SETUP-AI.md → installe les plugins, lance les commandes de skills listées (sections 2 et 5), autorise les MCP (/mcp).'
      : '1. Ouvre docs/SETUP-AI.md → installe les plugins et autorise les MCP (/mcp). (Les skills — design + stack — sont déjà installés par le wizard.)',
    `2. Boucle superpowers : ${SUPERPOWERS[args.assistant]}`,
    '3. /doctor pour vérifier.',
    '4. /new-project (PRD + tech spec + design), puis /build.',
  ].join('\n'));
}
```

- [ ] **Étape 4 : Lance, vérifie que ça passe**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/setup-rerun.test.mjs
```

Attendu : 2 tests, `fail 0`.

- [ ] **Étape 5 : Lance la suite entière**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test
```

Attendu : `fail 0` (le test d'idempotence passe : ses runs n'ont aucun échec, donc exit 0).

- [ ] **Étape 6 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add scripts/setup.mjs scripts/lib/setup-rerun.test.mjs && git commit -m "feat(setup): rapport 3 états, AGENTS.md.new au lieu d'écraser, exit 1 si échec

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Tâche 8 : regex secrets pre-commit élargie (T5)

**Files:**
- Modify: `templates/hooks/pre-commit`
- Test: `scripts/lib/pre-commit-secrets.test.mjs` (nouveau)

**Interfaces:**
- Consumes: rien.
- Produces: la regex ERE du hook couvre en plus `sk-ant-[A-Za-z0-9_-]{20,}`, `sk-proj-[A-Za-z0-9_-]{20,}`, `sk_live_[A-Za-z0-9]{10,}`, `re_[A-Za-z0-9]{16,}`, `AIza[0-9A-Za-z_-]{35}`, `ghp_[A-Za-z0-9]{36}` (l'existant `sk-…`, `AKIA…`, `PRIVATE KEY` est conservé). Le test extrait la regex du template par un match et la rejoue en JS (sous-ensemble ERE 100 % compatible RegExp).

- [ ] **Étape 1 : Écris le test qui échoue**

Crée `scripts/lib/pre-commit-secrets.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// La regex vit dans le template bash : on l'extrait telle quelle et on la rejoue en JS
// (le motif n'utilise que le sous-ensemble ERE compatible RegExp : alternation, classes, {n,}).
const src = fs.readFileSync(new URL('../../templates/hooks/pre-commit', import.meta.url), 'utf8');
const m = src.match(/grep -Eq '([^']+)'/);
assert.ok(m, 'la ligne grep -Eq du hook doit exister');
const RE = new RegExp(m[1]);

// ⚠️ Toutes les « clés » ci-dessous sont FACTICES (motifs répétés fabriqués pour le test).
const POSITIFS = [
  'ANTHROPIC_API_KEY=sk-ant-api03-' + 'AB12'.repeat(10),
  'OPENAI_API_KEY=sk-proj-' + 'CD34'.repeat(10),
  'const k = "sk-' + 'e5'.repeat(15) + '"',
  'STRIPE_SECRET_KEY=sk_live_' + 'F6'.repeat(10),
  'RESEND_API_KEY=re_' + 'Gh7J'.repeat(5),
  'GOOGLE_KEY=AIza' + 'K'.repeat(35),
  'GITHUB_TOKEN=ghp_' + 'L'.repeat(36),
  'AWS_KEY=AKIA' + 'M'.repeat(16),
  '-----BEGIN RSA PRIVATE KEY-----',
];
const NEGATIFS = [
  'const skin = "sk-court"',
  'resend est configuré dans convex/resend.ts',
  'ghp_tropcourt',
  'AIzaTropCourte',
  'sk_live_x',
  'cp .env.example .env',
  're_run_the_tests_again',
  'un commentaire re_initialisation banal',
];

test('regex pre-commit : détecte les formats de clés que le kit fait manipuler', () => {
  for (const s of POSITIFS) assert.equal(RE.test(s), true, `devrait bloquer : ${s}`);
});

test('regex pre-commit : ne bloque pas le code normal', () => {
  for (const s of NEGATIFS) assert.equal(RE.test(s), false, `ne devrait pas bloquer : ${s}`);
});
```

- [ ] **Étape 2 : Lance, vérifie l'échec**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/pre-commit-secrets.test.mjs
```

Attendu : ÉCHEC — AssertionError « devrait bloquer : ANTHROPIC_API_KEY=sk-ant-… » (la regex actuelle rate sk-ant, sk-proj, sk_live, re_, AIza, ghp_).

- [ ] **Étape 3 : Implémente dans `templates/hooks/pre-commit`**

ACTUEL :
```bash
if git diff --cached -U0 | grep -Eq '(sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'; then
```

REMPLACÉ :
```bash
if git diff --cached -U0 | grep -Eq '(sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|sk-[a-zA-Z0-9]{20,}|sk_live_[A-Za-z0-9]{10,}|re_[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_-]{35}|ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'; then
```

- [ ] **Étape 4 : Lance, vérifie que ça passe**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/pre-commit-secrets.test.mjs
```

Attendu : 2 tests, `fail 0`.

- [ ] **Étape 5 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add templates/hooks/pre-commit scripts/lib/pre-commit-secrets.test.mjs && git commit -m "fix(secu): regex pre-commit élargie (sk-ant, sk-proj, sk_live, re_, AIza, ghp_)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Tâche 9 : guard-shell couvre grep/awk/sed sur .env (T6)

**Files:**
- Modify: `templates/cursor/hooks/guard-shell.mjs`
- Test: `scripts/lib/guard-shell.test.mjs`

**Interfaces:**
- Consumes: rien.
- Produces: `isDangerous(cmd)` (signature inchangée) retourne aussi `true` pour `grep`/`awk`/`sed` lisant `.env` (hors `.env.example`/`.sample`/`.template`).

- [ ] **Étape 1 : Écris les tests qui échouent**

Dans `scripts/lib/guard-shell.test.mjs`.

ACTUEL :
```js
    'cat .env', 'cat .env.local', 'printenv | grep KEY > .env.bak && cat .env',
    'chmod -R 777 .', 'chmod 0777 secret.pem', 'dd if=/dev/zero of=/dev/sda',
  ]) assert.equal(isDangerous(c), true, c);
```

REMPLACÉ :
```js
    'cat .env', 'cat .env.local', 'printenv | grep KEY > .env.bak && cat .env',
    'grep KEY .env', 'grep -r API_KEY .env.local', "awk '{print}' .env", 'sed -n p .env',
    'chmod -R 777 .', 'chmod 0777 secret.pem', 'dd if=/dev/zero of=/dev/sda',
  ]) assert.equal(isDangerous(c), true, c);
```

ACTUEL :
```js
    'cp .env.example .env', 'cat .env.example',
  ]) assert.equal(isDangerous(c), false, c);
```

REMPLACÉ :
```js
    'cp .env.example .env', 'cat .env.example',
    'grep -r TODO src/', "awk '{print $1}' data.csv", "sed -i 's/a/b/' src/config.ts",
    'grep DATABASE_URL .env.example',
  ]) assert.equal(isDangerous(c), false, c);
```

- [ ] **Étape 2 : Lance, vérifie l'échec**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/guard-shell.test.mjs
```

Attendu : ÉCHEC — AssertionError sur `grep KEY .env` (attendu `true`, reçu `false`).

- [ ] **Étape 3 : Implémente dans `templates/cursor/hooks/guard-shell.mjs`**

ACTUEL :
```js
  /\b(cat|less|more|head|tail|printenv|base64|xxd)\b[^\n]*(^|\s|\/)\.env(?!\.example|\.sample|\.template)\b/, // lire/exfiltrer .env (mais pas .env.example)
```

REMPLACÉ :
```js
  /\b(cat|less|more|head|tail|printenv|base64|xxd|grep|awk|sed)\b[^\n]*(^|\s|\/)\.env(?!\.example|\.sample|\.template)\b/, // lire/exfiltrer .env — y compris via grep/awk/sed (mais pas .env.example)
```

- [ ] **Étape 4 : Lance, vérifie que ça passe**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/guard-shell.test.mjs
```

Attendu : 2 tests, `fail 0`.

- [ ] **Étape 5 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add templates/cursor/hooks/guard-shell.mjs scripts/lib/guard-shell.test.mjs && git commit -m "fix(secu): guard-shell bloque aussi grep/awk/sed sur .env

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Tâche 10 : smoke E2E cross-platform + CI matrice 3 OS × 2 Node (T7)

**Files:**
- Create: `scripts/smoke-e2e.mjs`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: le comportement CLI final de `scripts/setup.mjs` (tâches 4, 5, 7) — notamment `--yes` accepté, exit ≠ 0 sur stack invalide, dépôt git initialisé avec `core.hooksPath=.githooks`.
- Produces: `scripts/smoke-e2e.mjs` — script Node pur (zéro bash), exit 0 si toutes les vérifications passent, exit 1 sinon. Nom volontairement SANS `.test.` : il ne doit PAS être ramassé par `node --test` (lent + réseau). La CI du kit devient `matrix { os: [ubuntu-latest, windows-latest, macos-latest], node: ['20.12', '22'] }` avec `node --test` PUIS le smoke.

- [ ] **Étape 1 : Vérifie l'absence du script (état rouge)**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/smoke-e2e.mjs
```

Attendu : ÉCHEC — `Cannot find module '…/scripts/smoke-e2e.mjs'`.

- [ ] **Étape 2 : Crée `scripts/smoke-e2e.mjs`**

Contenu exact :

```js
#!/usr/bin/env node
// Smoke E2E cross-platform (zéro bash) : joue le VRAI setup.mjs dans un dossier temporaire
// et vérifie que le kit tient ses promesses (fichiers clés, dépôt git + hooks, codes de sortie).
// Lancé par la CI après node --test ; utilisable en local : node scripts/smoke-e2e.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const setup = path.join(kitRoot, 'scripts', 'setup.mjs');
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'Vibecoding Smoke',
  GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || 'smoke@vibecoding.local',
  GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'Vibecoding Smoke',
  GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || 'smoke@vibecoding.local',
};

let echecs = 0;
const check = (label, cond) => { console.log(`${cond ? 'OK' : 'KO'}  ${label}`); if (!cond) echecs++; };

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-smoke-'));
const project = path.join(base, 'demo-app');

// 1. Run nominal, non-interactif (sans installation réseau des skills npx)
execFileSync(process.execPath, [setup, '--stack', 'saas', '--assistant', 'cursor', '--project', project, '--no-skills', '--yes'], { stdio: 'inherit', env: gitEnv });

for (const f of [
  'AGENTS.md', 'CLAUDE.md', '.gitignore', '.env.example',
  '.githooks/pre-commit', '.githooks/pre-push',
  '.cursor/rules/00-project.mdc', '.cursor/commands/new-project.md',
  'docs/SETUP-AI.md', 'docs/ONBOARDING.md', 'docs/ROADMAP.md',
]) check(`fichier ${f}`, fs.existsSync(path.join(project, f)));

check('dépôt git initialisé (.git présent)', fs.existsSync(path.join(project, '.git')));
let hooksPath = '';
try { hooksPath = execFileSync('git', ['-C', project, 'config', 'core.hooksPath'], { encoding: 'utf8' }).trim(); } catch {}
check('core.hooksPath = .githooks', hooksPath === '.githooks');
let log = '';
try { log = execFileSync('git', ['-C', project, 'log', '--oneline'], { encoding: 'utf8', env: gitEnv }); } catch {}
check('commit initial présent', /environnement vibecoding initial/.test(log));

// 2. Cas d'échec attendu : stack inconnue → code de sortie ≠ 0 (hors-ligne friendly)
let code = 0;
try { execFileSync(process.execPath, [setup, '--stack', 'inexistante', '--assistant', 'cursor', '--project', path.join(base, 'x'), '--no-skills', '--yes'], { stdio: 'pipe', env: gitEnv }); }
catch (e) { code = e.status ?? 1; }
check('stack invalide → exit ≠ 0', code !== 0);

try { fs.rmSync(base, { recursive: true, force: true }); } catch { /* nettoyage best-effort (fichiers .git en lecture seule sous Windows) */ }
if (echecs > 0) { console.error(`\nSmoke E2E : ${echecs} vérification(s) en échec.`); process.exit(1); }
console.log('\nSmoke E2E : tout est vert.');
```

- [ ] **Étape 3 : Lance le smoke en local, vérifie qu'il est vert**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/smoke-e2e.mjs
```

Attendu : toutes les lignes `OK`, dernière ligne `Smoke E2E : tout est vert.`, exit 0. (Nécessite le réseau : le setup clone karpathy + awesome-cursorrules.)

- [ ] **Étape 4 : Remplace `.github/workflows/ci.yml`**

ACTUEL (fichier entier) :
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: node --test
```

REMPLACÉ (fichier entier) :
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: ['20.12', '22']
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      # Suite unitaire + intégration (les tests fournissent leur identité git via variables d'env)
      - run: node --test
      # Smoke E2E cross-platform en Node pur (pas de bash) : le kit tient-il ses promesses ?
      - run: node scripts/smoke-e2e.mjs
```

- [ ] **Étape 5 : Vérification finale complète**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/smoke-e2e.mjs
```

Attendu : suite entière `fail 0` (≈ 150 tests, ~129 d'origine + les nouveaux), puis `Smoke E2E : tout est vert.` Vérifie aussi que `node --test` n'a PAS exécuté `smoke-e2e.mjs` (aucune ligne le mentionnant : son nom ne matche pas `*.test.mjs`).

- [ ] **Étape 6 : Commit**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add scripts/smoke-e2e.mjs .github/workflows/ci.yml && git commit -m "ci: matrice 3 OS × Node 20.12/22 + smoke E2E cross-platform en Node pur

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Auto-revue finale

- [x] **Couverture du scope** : T1 → Tâche 1 (npx.cmd + shell win32, plateforme injectable, git inchangé) ; T2a → Tâche 4 (checks Node/git en 1re ligne de main + readline dynamique) ; T2b → Tâches 3+4 (wireSigint, exit 130) ; T2c → Tâches 2+4 (expandHome pure, appliquée aux valeurs wizard ET --project) ; T2d → Tâche 4 (kitRootFromModuleUrl, source par défaut) ; T2e → Tâches 2+4 (resolveProjectDir ../<nom> + chemin absolu dans le rapport ET le message final) ; T2f → Tâches 2+3+4 (--yes, needsWizard complet, prompt final dans tous les modes) ; T2g → Tâches 3+4 (renderNonTtyHelp avec PowerShell/Git Bash) ; T3 → Tâche 5 (gitinit.mjs, run espion + intégration vrai git, ONBOARDING nettoyé) ; T4a → Tâche 7 (AGENTS.md.new + entrée ⚠️ exacte) ; T4b → Tâches 6+7 (kept dans formatReport, statuts copyIfAbsent propagés — fsops retourne déjà l'info, aucun changement fsops nécessaire) ; T4c → Tâche 7 (process.exitCode = 1) ; T4d → Tâches 6+7 (skillsInstalled dans renderSetupAi via writeStackEnvironment) ; T5 → Tâche 8 ; T6 → Tâche 9 ; T7 → Tâche 10 (matrice + smoke Node pur + cas exit ≠ 0).
- [x] **Zéro placeholder** : aucun TBD/TODO/« similaire à »/code tronqué ; chaque étape de test et d'implémentation contient le code complet ; chaque Modify cite le bloc ACTUEL exact (vérifié caractère par caractère contre les fichiers réels) puis le bloc REMPLACÉ.
- [x] **Cohérence des signatures entre tâches** : `buildRunCommand(cmd, platform)` → `{cmd, options}` (tâche 1, non consommé ailleurs) ; `expandHome(p, home)` et `resolveProjectDir(project, kitRoot)` définis tâche 2, consommés tâche 4 avec les mêmes noms ; `needsWizard(argv, isTTY)` / `buildArgsFromAnswers(a, base)` / `wireSigint(rl)` / `renderNonTtyHelp()` définis tâche 3, consommés tâche 4 ; `initProjectGit({projectDir, run})` → `{done, failed}` défini tâche 5, consommé tâches 5 (setup) et 10 (smoke vérifie ses effets) ; `formatReport({…, kept = []})` et `writeStackEnvironment({…, skillsInstalled = true})` définis tâche 6, consommés tâche 7 ; message de commit initial `chore: environnement vibecoding initial` identique dans gitinit.mjs, ses tests et le smoke.
- [x] **Tests existants impactés = inclus dans les tâches** : `args.test.mjs` (défaut source), `wizard.test.mjs` (needsWizard, source null), `setup.test.mjs` (réécrit, signature buildRunPlan), `setup-idempotent.test.mjs` (identité git), `guard-shell.test.mjs` (nouveaux cas), `external.test.mjs` (import).
- [x] **Contraintes globales respectées** : zéro dépendance npm ; français partout ; copies non destructives renforcées (AGENTS.md.new) ; aucune mention « formation »/« accompagnement » dans les textes générés ; clés de test clairement factices (motifs `'AB12'.repeat(10)`) ; tests portables Windows (path.join/path.sep/os.tmpdir).
- [x] **Interactions vérifiées en amont** : le commit initial utilise `--no-verify` car la regex élargie (tâche 8) s'appliquerait sinon au contenu tiers cloné (flaky) — les templates du kit ont été scannés : aucun ne matche la nouvelle regex ; l'ordre des tâches garantit que les blocs ACTUEL de la tâche 7 correspondent à l'état post-tâches 4-5.
