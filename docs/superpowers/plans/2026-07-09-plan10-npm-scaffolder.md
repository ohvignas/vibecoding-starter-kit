# Paquet npm « npm create vibecoding » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le kit installable **en une seule commande** — `npm create vibecoding@latest` (ou `npx create-vibecoding`) — sans `git clone`, comme `create-next-app`. Le publish final (`npm publish`) reste un geste manuel d'Antoine (compte npm).

**Architecture:** Le kit est déjà un installeur Node ESM zéro dépendance avec `scripts/setup.mjs` (shebang `#!/usr/bin/env node`). On le transforme en **paquet npm exécutable** : `package.json` avec `bin` + whitelist `files`. Deux ajustements de comportement suffisent : (1) en mode installé (npx, `kitRoot` dans `node_modules`), le projet se crée dans le **cwd** de l'utilisateur, pas à côté du cache npm ; (2) un **nom de projet positionnel** (`npm create vibecoding mon-app`) est accepté.

**Tech Stack:** Node.js ≥ 20.12, ESM (`.mjs`), `node:test`, npm (pack/publish). Zéro dépendance runtime.

## Global Constraints

- **Node ESM zéro dépendance npm** (aucun `dependencies`) ; `type: module`.
- Tests : `node --test` depuis la racine ; binaire node = `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node` (le wrapper nvm `node` est cassé).
- Tout en français (messages, docs, commentaires).
- Copies non destructives (`copyIfAbsent`) ; jamais de secret écrit ; pas de « formation »/« accompagnement » dans les templates générés.
- **Le paquet ne doit embarquer QUE ce que `setup.mjs` lit au runtime** : `scripts/`, `templates/`, `stacks/`, `ai-context/`, plus `guides/` (référencés dans les messages), `README.md`, `LICENSE`. PAS `docs/`, `formateur/`, `playbook/`, `.superpowers/`.
- Les tâches s'exécutent DANS L'ORDRE.

---

## Tâche 1 : `package.json` publiable + `bin` + `files`

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/package.json`
- Create: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/package-publish.test.mjs`

**Interfaces:**
- Produces : `package.json` avec `name: "create-vibecoding"`, `bin: { "create-vibecoding": "scripts/setup.mjs" }`, `files` whitelist, `engines.node`, sans `private`. (`npm create vibecoding` résout le paquet `create-vibecoding` ; `npx create-vibecoding` aussi.)

- [ ] **Étape 1 : Écris le test qui échoue** — `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/package-publish.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('package.json est publiable en scaffolder npm', () => {
  assert.equal(pkg.name, 'create-vibecoding');           // `npm create vibecoding`
  assert.equal(pkg.private, undefined, 'pas de private:true (sinon npm publish refuse)');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.bin['create-vibecoding'], 'scripts/setup.mjs');
  assert.ok(pkg.engines && pkg.engines.node, 'engines.node présent');
  // La whitelist embarque ce que setup lit au runtime, et RIEN de superflu.
  for (const d of ['scripts', 'templates', 'stacks', 'ai-context']) assert.ok(pkg.files.includes(d), `files doit inclure ${d}`);
  for (const d of ['docs', 'formateur', '.superpowers']) assert.ok(!pkg.files.includes(d), `files ne doit PAS inclure ${d}`);
});

test('le bin pointe un fichier réel avec shebang node', () => {
  const bin = fs.readFileSync(new URL('../../scripts/setup.mjs', import.meta.url), 'utf8');
  assert.match(bin.split('\n')[0], /^#!.*node/);
});
```

- [ ] **Étape 2 : Lance, vérifie l'échec** — `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/package-publish.test.mjs` → FAIL (`pkg.name` vaut `vibe-stack`, pas de `bin`).

- [ ] **Étape 3 : Remplace `package.json`**

ACTUEL (fichier entier) :
```json
{
  "name": "vibe-stack",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": { "test": "node --test" }
}
```

REMPLACÉ (fichier entier) :
```json
{
  "name": "create-vibecoding",
  "version": "0.2.0",
  "description": "Générateur d'environnement de dev IA pour débutants (Cursor, Claude Code, Codex) — une commande, zéro dépendance.",
  "type": "module",
  "license": "MIT",
  "bin": { "create-vibecoding": "scripts/setup.mjs" },
  "files": ["scripts", "templates", "stacks", "ai-context", "guides", "README.md", "LICENSE"],
  "engines": { "node": ">=20.12" },
  "repository": { "type": "git", "url": "https://github.com/ohvignas/vibecoding-starter-kit.git" },
  "homepage": "https://github.com/ohvignas/vibecoding-starter-kit#readme",
  "keywords": ["vibecoding", "scaffold", "cursor", "claude-code", "convex", "expo", "electron", "starter"],
  "scripts": { "test": "node --test" }
}
```

- [ ] **Étape 4 : Rends `setup.mjs` exécutable** (bit +x pour le `bin`)

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && chmod +x scripts/setup.mjs && git update-index --chmod=+x scripts/setup.mjs
```

- [ ] **Étape 5 : Lance, vérifie que ça passe** — `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/package-publish.test.mjs` → PASS. Puis suite entière `... --test` → `# fail 0`.

- [ ] **Étape 6 : Commit**
```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add package.json scripts/lib/package-publish.test.mjs scripts/setup.mjs && git commit -m "feat(npm): package.json publiable (create-vibecoding) + bin + files whitelist

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Tâche 2 : base du projet en mode npx (cwd) vs clone (`../`) + nom positionnel

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/args.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/args.test.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.test.mjs`

**Interfaces:**
- Consumes: `resolveProjectDir` (existant), `buildRunPlan(args, baseDir)`, `kitRootFromModuleUrl`.
- Produces:
  - `export function projectBaseDir(kitRoot, cwd)` → `cwd` si `kitRoot` contient `node_modules` (installé via npm/npx), sinon `path.join(kitRoot, '..')` (clone : projet à côté du kit, jamais dedans).
  - `resolveProjectDir(project, baseDir)` → nom nu résolu contre **`baseDir`** (au lieu de `kitRoot/..` en dur).
  - `parseArgs` accepte un **argument positionnel** (sans `--`) comme nom de projet : `npm create vibecoding mon-app`.

- [ ] **Étape 1 : Écris/adapte les tests** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/args.test.mjs`.

Ligne d'import ACTUELLE :
```js
import { parseArgs, validateArgs, expandHome, resolveProjectDir } from './args.mjs';
```
REMPLACÉE :
```js
import { parseArgs, validateArgs, expandHome, resolveProjectDir, projectBaseDir } from './args.mjs';
```

Test ACTUEL :
```js
test('resolveProjectDir : nom nu → ../<nom> à côté du kit ; chemins explicites respectés', () => {
  const kit = path.join(path.sep, 'tmp', 'kit');
  assert.equal(resolveProjectDir('mon-app', kit), path.resolve(kit, '..', 'mon-app'));
  assert.equal(resolveProjectDir('apps/mon-app', kit), path.resolve('apps/mon-app'));
  const abs = path.resolve(path.sep, 'ailleurs', 'app');
  assert.equal(resolveProjectDir(abs, kit), abs);
});
```
REMPLACÉ :
```js
test('resolveProjectDir : nom nu résolu contre baseDir ; chemins explicites respectés', () => {
  const base = path.join(path.sep, 'tmp');
  assert.equal(resolveProjectDir('mon-app', base), path.resolve(base, 'mon-app'));
  assert.equal(resolveProjectDir('apps/mon-app', base), path.resolve('apps/mon-app'));
  const abs = path.resolve(path.sep, 'ailleurs', 'app');
  assert.equal(resolveProjectDir(abs, base), abs);
});

test('projectBaseDir : cwd si installé (node_modules), sinon à côté du clone', () => {
  const cwd = path.join(path.sep, 'home', 'eleve', 'projets');
  // Clone : /home/eleve/vibecoding-starter-kit → projet dans /home/eleve
  assert.equal(projectBaseDir(path.join(path.sep, 'home', 'eleve', 'vibecoding-starter-kit'), cwd), path.join(path.sep, 'home', 'eleve'));
  // Installé via npx : kitRoot dans node_modules → projet dans le cwd de l'utilisateur
  assert.equal(projectBaseDir(path.join(path.sep, 'home', 'eleve', '.npm', '_npx', 'abc', 'node_modules', 'create-vibecoding'), cwd), cwd);
});

test('parseArgs : nom de projet positionnel (npm create vibecoding mon-app)', () => {
  assert.equal(parseArgs(['mon-app', '--stack', 'saas']).project, 'mon-app');
  assert.equal(parseArgs(['--stack', 'saas', '--project', 'x']).project, 'x'); // --project explicite marche toujours
});
```

- [ ] **Étape 2 : Lance, vérifie l'échec** — `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/args.test.mjs` → FAIL (`projectBaseDir` non exporté ; le positionnel jette « Argument inconnu »).

- [ ] **Étape 3 : Implémente dans `scripts/lib/args.mjs`**

Bloc ACTUEL (le `default` du switch) :
```js
      case '--no-learning': args.learning = false; break;
      case '--yes': args.yes = true; break;
      default: throw new Error(`Argument inconnu : ${a}`);
```
Bloc REMPLACÉ :
```js
      case '--no-learning': args.learning = false; break;
      case '--yes': args.yes = true; break;
      default:
        // Nom de projet positionnel (npm create vibecoding mon-app). --project reste prioritaire.
        if (!a.startsWith('-') && args.project === null) { args.project = a; break; }
        throw new Error(`Argument inconnu : ${a}`);
```

Bloc ACTUEL (`resolveProjectDir`) :
```js
export function resolveProjectDir(project, kitRoot) {
  if (path.isAbsolute(project)) return path.resolve(project);
  if (project.includes('/') || project.includes('\\')) return path.resolve(project);
  return path.resolve(kitRoot, '..', project);
}
```
Bloc REMPLACÉ :
```js
// Dossier de base où créer le projet, calculé par l'appelant (voir projectBaseDir).
export function resolveProjectDir(project, baseDir) {
  if (path.isAbsolute(project)) return path.resolve(project);
  if (project.includes('/') || project.includes('\\')) return path.resolve(project);
  return path.resolve(baseDir, project);
}

// Où créer le projet par défaut :
// - clone du kit → à CÔTÉ du clone (kitRoot/..), pour ne pas polluer le dépôt du kit ;
// - installé via npm/npx (kitRoot dans node_modules) → dans le cwd de l'utilisateur.
export function projectBaseDir(kitRoot, cwd) {
  return kitRoot.includes(`${path.sep}node_modules${path.sep}`) || kitRoot.includes('node_modules') ? cwd : path.join(kitRoot, '..');
}
```

- [ ] **Étape 4 : Câble dans `scripts/setup.mjs`**

Ligne d'import ACTUELLE :
```js
import { parseArgs, validateArgs, expandHome, resolveProjectDir } from './lib/args.mjs';
```
REMPLACÉE :
```js
import { parseArgs, validateArgs, expandHome, resolveProjectDir, projectBaseDir } from './lib/args.mjs';
```

Bloc ACTUEL (dans `main`) :
```js
  args.source = args.source ?? kitRoot;
  args.project = expandHome(args.project, os.homedir());

  const { assets, projectDir } = buildRunPlan(args, kitRoot);
```
Bloc REMPLACÉ :
```js
  args.source = args.source ?? kitRoot;
  args.project = expandHome(args.project, os.homedir());
  const baseDir = projectBaseDir(kitRoot, process.cwd());

  const { assets, projectDir } = buildRunPlan(args, baseDir);
```

Bloc ACTUEL (`buildRunPlan`) :
```js
export function buildRunPlan(args, kitRoot = process.cwd()) {
  const assets = resolveAssets(args.stack, args.assistant);
  const projectDir = resolveProjectDir(args.project, kitRoot);
  return { assets, projectDir };
}
```
Bloc REMPLACÉ :
```js
export function buildRunPlan(args, baseDir = process.cwd()) {
  const assets = resolveAssets(args.stack, args.assistant);
  const projectDir = resolveProjectDir(args.project, baseDir);
  return { assets, projectDir };
}
```

- [ ] **Étape 5 : Adapte `scripts/setup.test.mjs`** (la 2e valeur de `buildRunPlan` est maintenant le baseDir, pas le kitRoot).

Test ACTUEL :
```js
test('buildRunPlan : nom nu → projet créé À CÔTÉ du kit (../<nom>)', () => {
  const { assets, projectDir } = buildRunPlan({ stack: 'saas', assistant: 'cursor', project: 'mon-app' }, path.join(path.sep, 'tmp', 'kit'));
  assert.equal(assets.commandsDir, '.cursor/commands');
  assert.equal(projectDir, path.resolve(path.join(path.sep, 'tmp', 'kit'), '..', 'mon-app'));
});
```
REMPLACÉ :
```js
test('buildRunPlan : nom nu → projet créé dans le baseDir fourni', () => {
  const { assets, projectDir } = buildRunPlan({ stack: 'saas', assistant: 'cursor', project: 'mon-app' }, path.join(path.sep, 'tmp', 'base'));
  assert.equal(assets.commandsDir, '.cursor/commands');
  assert.equal(projectDir, path.resolve(path.join(path.sep, 'tmp', 'base'), 'mon-app'));
});
```
(Les autres tests de `setup.test.mjs` restent valides : le test `--dry-run` lancé depuis un autre dossier passe par le vrai CLI où `kitRoot` = le dépôt cloné, donc `projectBaseDir` renvoie `kitRoot/..` → `path.resolve(ROOT, '..', 'demo-hors-kit')` inchangé.)

- [ ] **Étape 6 : Lance la suite** — `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test` → `# fail 0`. Puis le smoke E2E : `... scripts/smoke-e2e.mjs` → « tout est vert ».

- [ ] **Étape 7 : Vérifie l'usage npx localement (pack + install dans un tmpdir)**

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && \
TARBALL=$(npm pack --silent) && mkdir -p /tmp/vibe-npx && cd /tmp/vibe-npx && \
npm init -y >/dev/null 2>&1 && npm install "/Users/antoinevigneau/best_practices_vibecoding/$TARBALL" >/dev/null 2>&1 && \
GIT_AUTHOR_NAME=T GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=T GIT_COMMITTER_EMAIL=t@t \
node node_modules/create-vibecoding/scripts/setup.mjs mon-app --stack saas --assistant cursor --no-skills --yes && \
test -f /tmp/vibe-npx/mon-app/AGENTS.md && echo "OK: projet créé dans le cwd (mon-app/) via le paquet installé" && \
cd /Users/antoinevigneau/best_practices_vibecoding && rm -rf /tmp/vibe-npx "$TARBALL"
```
Attendu : `OK: projet créé dans le cwd (mon-app/) via le paquet installé`. (Prouve : nom positionnel + base = cwd en mode installé + whitelist `files` suffisante.)

- [ ] **Étape 8 : Commit**
```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add scripts/lib/args.mjs scripts/lib/args.test.mjs scripts/setup.mjs scripts/setup.test.mjs && git commit -m "feat(npm): projet dans le cwd en mode npx + nom de projet positionnel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Tâche 3 : README (npm en tête) + guide + note de publication

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/README.md`
- Create: `/Users/antoinevigneau/best_practices_vibecoding/PUBLISH.md`

**Interfaces:** aucune (docs).

- [ ] **Étape 1 : README — mets `npm create` en tête du Démarrage rapide.** Dans `/Users/antoinevigneau/best_practices_vibecoding/README.md`, localise l'étape « **1. Récupère le kit** » du Démarrage rapide (le bloc ```bash avec `git clone …`). Remplace la **première étape** par la voie npm, en gardant le clone comme alternative :

Insère AVANT l'actuelle « **1. Récupère le kit** » :
```md
**Le plus simple — une commande** (rien à cloner) :

```bash
npm create vibecoding@latest
```

> Ça télécharge le kit et lance le wizard directement. (Nécessite Node.js ≥ 20.12 + git.)

<details>
<summary>Ou : cloner le dépôt (pour bidouiller le kit lui-même)</summary>
```
et referme le `<details>` avec `</details>` après le bloc de clone existant + `node scripts/setup.mjs`. (Garde le contenu existant du clone à l'intérieur du `<details>`.)

- [ ] **Étape 2 : `PUBLISH.md` (pour Antoine)** — `/Users/antoinevigneau/best_practices_vibecoding/PUBLISH.md`

```md
# Publier `create-vibecoding` sur npm

Une seule fois : `npm login` (compte npm).

À chaque version :
1. Bumpe la version : `npm version patch` (ou `minor`).
2. Vérifie le contenu du paquet : `npm pack --dry-run` (doit lister scripts/, templates/, stacks/, ai-context/, guides/ — PAS docs/ ni formateur/).
3. Publie : `npm publish` (le paquet est public ; nom `create-vibecoding`).
4. Teste : dans un dossier vide, `npm create vibecoding@latest`.

Le nom `create-vibecoding` fait fonctionner `npm create vibecoding@latest` (npm mappe `create X` → `create-X`).
```

- [ ] **Étape 3 : Vérifie** — `npm pack --dry-run` liste bien `scripts/`, `templates/`, `stacks/`, `ai-context/`, `guides/`, et **pas** `docs/`, `formateur/`, `.superpowers/`. (Aucun test unitaire ; contrôle manuel.)

```bash
cd /Users/antoinevigneau/best_practices_vibecoding && npm pack --dry-run 2>&1 | grep -E "docs/|formateur/|\.superpowers/" && echo "⚠️ superflu embarqué" || echo "OK: whitelist propre"
```

- [ ] **Étape 4 : Commit**
```bash
cd /Users/antoinevigneau/best_practices_vibecoding && git add README.md PUBLISH.md && git commit -m "docs(npm): README « npm create vibecoding » en tête + PUBLISH.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Auto-revue

- [ ] **Couverture spec** : bin+files+publiable (T1), base cwd/clone + nom positionnel (T2), README+publish (T3). ✅
- [ ] **Placeholders** : aucun ; chaque étape a le code/commande exacts.
- [ ] **Types cohérents** : `projectBaseDir(kitRoot, cwd)` et `resolveProjectDir(project, baseDir)` définis T2, consommés dans `setup.mjs` T2 ; `buildRunPlan(args, baseDir)` cohérent avec `setup.test.mjs`.
- [ ] **Tests impactés inclus** : `args.test.mjs` (resolveProjectDir + projectBaseDir + positionnel), `setup.test.mjs` (buildRunPlan baseDir), `package-publish.test.mjs` (nouveau). Le test `--dry-run` reste valide (clone mode).
- [ ] **Contraintes** : zéro dépendance ; whitelist `files` = uniquement le runtime ; le geste `npm publish` reste manuel (compte d'Antoine).
