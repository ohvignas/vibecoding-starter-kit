# Plan 4 — Installeur interactif (wizard node stylé) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `node scripts/setup.mjs` sans flags dans un terminal lance un **wizard stylé zéro-dépendance** qui pose les questions (stack, assistant, nom, Convex cloud/local, caveman) puis installe l'environnement — l'IA ne devine plus la config (corrige le bug « lancé sur Convex sans demander »).

**Architecture :** Style pur (`ui.mjs`, ANSI zéro-dép) + logique wizard pure/injectable (`wizard.mjs`, testée avec un `ask` factice) + fin glue dans `setup.mjs` (branche wizard vs `--flags`, note backend sur `docs/RUN.md`). Le mode `--flags` existant reste intact.

**Tech Stack :** Node.js ESM, `node:readline/promises`, `node --test` (zéro dépendance externe).

## Global Constraints

- Node ≥ 20.12 ; ESM ; **zéro dépendance externe** (pas d'inquirer/@clack ; tests `node:test` + `node:assert/strict`).
- L'installeur doit tourner **sans `npm install` préalable** (c'est lui qui installe) → aucune lib.
- Le binaire `node` du shell peut être un wrapper nvm cassé (`_nvm_lazy_load`/`FUNCNEST`). En cas d'échec, utiliser `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`. Lancer la suite via `node --test` (racine), pas la forme répertoire.
- Style : fichiers courts, français dans messages/commentaires, identifiers anglais.
- Couleurs **désactivées** si non-TTY ou variable `NO_COLOR`. Menus **numérotés** (pas de sélection fléchée).
- Rétrocompat : `parseArgs`/`validateArgs`/`buildRunPlan`/`writeStackEnvironment` inchangés côté comportement ; le wizard ne se déclenche que **sans flags et en TTY**.
- **MANDATORY avant chaque commit** : suite complète `node --test` verte, coller la fin (`# tests N`) dans le rapport.
- Interfaces existantes : `parseArgs(argv)`/`validateArgs(args)` (args.mjs, objet `{stack,assistant,project,mockup,source,dryRun,force,caveman}`, regex projet `/^[\w./~-]+$/`) ; `main()` dans setup.mjs (ligne 22, invoqué ligne 150) ; copie `docs/RUN.md` dans setup.mjs (lignes 117-118).

---

### Task 1 : Style terminal zéro-dép (`ui.mjs`)

**Files:**
- Create: `scripts/lib/ui.mjs`
- Test: `scripts/lib/ui.test.mjs`

**Interfaces:**
- Produces: `supportsColor(stream, env) → bool` · `paint(on) → {cyan,green,red,yellow,dim,bold}` (chacune `str→str`) · `heading(title, on) → string` · `menu(question, options, on) → string` (options = `[{label, hint?}]`) · `ok(text, on) → string` · `hint(text, on) → string`.
- Consumes: rien.

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/ui.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsColor, paint, heading, menu, ok, hint } from './ui.mjs';

test('supportsColor : TTY vrai + pas de NO_COLOR', () => {
  assert.equal(supportsColor({ isTTY: true }, {}), true);
  assert.equal(supportsColor({ isTTY: false }, {}), false);
  assert.equal(supportsColor({ isTTY: true }, { NO_COLOR: '1' }), false);
  assert.equal(supportsColor(undefined, {}), false);
});

test('paint : on enveloppe en ANSI, off renvoie brut', () => {
  assert.match(paint(true).green('x'), /\x1b\[32m/);
  assert.equal(paint(false).green('x'), 'x');
});

test('heading/menu/ok/hint contiennent le texte fourni', () => {
  assert.match(heading('Config', false), /Config/);
  const m = menu('Quoi ?', [{ label: 'SaaS', hint: 'web' }, { label: 'Mobile' }], false);
  assert.match(m, /Quoi \?/);
  assert.match(m, /1\) SaaS/);
  assert.match(m, /web/);
  assert.match(m, /2\) Mobile/);
  assert.match(ok('fait', false), /✓ fait/);
  assert.match(hint('astuce', false), /astuce/);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/ui.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter `scripts/lib/ui.mjs`**

```js
// Style terminal zéro-dépendance. Couleurs ANSI, désactivées hors TTY ou si NO_COLOR.
const CODES = { cyan: 36, green: 32, red: 31, yellow: 33, dim: 2, bold: 1 };

export function supportsColor(stream, env) {
  return Boolean(stream && stream.isTTY) && !(env && env.NO_COLOR);
}

export function paint(on) {
  const wrap = (code) => (s) => (on ? `\x1b[${code}m${s}\x1b[0m` : String(s));
  const out = {};
  for (const [name, code] of Object.entries(CODES)) out[name] = wrap(code);
  return out;
}

export function heading(title, on) {
  return paint(on).cyan(`┌─ ${title} ─┐`);
}

export function menu(question, options, on) {
  const c = paint(on);
  const lines = [c.bold(question)];
  options.forEach((o, i) => {
    const num = c.cyan(`${i + 1})`);
    lines.push(`  ${num} ${o.label}${o.hint ? '  ' + c.dim(o.hint) : ''}`);
  });
  return lines.join('\n');
}

export function ok(text, on) { return `${paint(on).green('✓')} ${text}`; }
export function hint(text, on) { return paint(on).dim(text); }
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/ui.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add scripts/lib/ui.mjs scripts/lib/ui.test.mjs
git commit -m "feat(ui): style terminal zéro-dép (ANSI, NO_COLOR, cadres/menus/✓)"
```

---

### Task 2 : Logique du wizard (`wizard.mjs`)

**Files:**
- Create: `scripts/lib/wizard.mjs`
- Test: `scripts/lib/wizard.test.mjs`

**Interfaces:**
- Consumes: `validateArgs` (args.mjs) ; `heading`/`menu`/`ok`/`hint` (ui.mjs).
- Produces:
  - `needsWizard(argv, isTTY) → bool`
  - `buildArgsFromAnswers(answers) → args` (throw si invalide ; `answers = {stack, assistant, project, backend?, caveman?}`)
  - `renderBackendNote(stack, backend) → string` (bloc note si `saas`+`local`, sinon `''`)
  - `async runWizard(ask, on, out=process.stdout) → answers` (`ask(prompt)→Promise<string>` injecté ; `out.write` pour l'affichage)

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/wizard.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard } from './wizard.mjs';

const NULL_OUT = { write() {} };
const scripted = (answers) => { let i = 0; return async () => answers[i++]; };

test('needsWizard : sans flags ET TTY seulement', () => {
  assert.equal(needsWizard([], true), true);
  assert.equal(needsWizard([], false), false);
  assert.equal(needsWizard(['--stack', 'saas'], true), false);
});

test('buildArgsFromAnswers : mappe + défauts + validation', () => {
  const a = buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local', caveman: true });
  assert.equal(a.stack, 'saas');
  assert.equal(a.source, '.');
  assert.equal(a.backend, 'local');
  assert.equal(a.caveman, true);
  assert.equal(a.dryRun, false);
});

test('buildArgsFromAnswers : rejette une entrée invalide', () => {
  assert.throws(() => buildArgsFromAnswers({ stack: 'flutter', assistant: 'claude-code', project: 'x' }), /stack/);
  assert.throws(() => buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'nom invalide!' }), /project/);
});

test('renderBackendNote : saas+local seulement', () => {
  assert.match(renderBackendNote('saas', 'local'), /convex deployment select local/);
  assert.equal(renderBackendNote('saas', 'cloud'), '');
  assert.equal(renderBackendNote('desktop', 'local'), '');
});

test('runWizard : saas → demande le backend, produit les bons args', async () => {
  const ask = scripted(['1', '2', 'mon-app', '2', 'o']); // saas, claude-code, nom, backend local, caveman oui
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local', caveman: true });
});

test('runWizard : redemande sur choix invalide (mobile → pas de backend)', async () => {
  const ask = scripted(['9', '2', '1', 'app', 'n']); // stack 9 invalide→2 mobile ; assistant 1 cursor ; nom ; caveman non
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'mobile', assistant: 'cursor', project: 'app', backend: 'cloud', caveman: false });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/wizard.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter `scripts/lib/wizard.mjs`**

```js
import { validateArgs } from './args.mjs';
import { heading, menu, ok, hint } from './ui.mjs';

const STACKS = [
  { key: 'saas', label: 'SaaS web', hint: 'Convex + TanStack Start + Better Auth' },
  { key: 'mobile', label: 'Mobile', hint: 'React Native (Expo) + Convex' },
  { key: 'desktop', label: 'Desktop', hint: 'Electron' },
];
const ASSISTANTS = [
  { key: 'cursor', label: 'Cursor' },
  { key: 'claude-code', label: 'Claude Code' },
  { key: 'codex', label: 'Codex' },
];
const BACKENDS = [
  { key: 'cloud', label: 'Cloud Convex', hint: 'compte gratuit, en ligne' },
  { key: 'local', label: 'Local', hint: 'zéro Docker, zéro compte, données dans .convex/' },
];

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

export function renderBackendNote(stack, backend) {
  if (stack !== 'saas' || backend !== 'local') return '';
  return [
    '> **Backend en local (zéro Docker, zéro compte)**',
    '> Avant `npm run dev` : `npx convex deployment select local` puis `npx convex dev`',
    '> (le backend tourne en sous-processus, état dans `.convex/`).',
    '> Repasser au cloud : `npx convex deployment select dev`.',
    '',
  ].join('\n');
}

// Question à choix numérotés : redemande jusqu'à un choix valide, renvoie la clé.
async function pickOne(ask, on, out, question, options) {
  for (;;) {
    out.write(menu(question, options, on) + '\n');
    const idx = Number.parseInt((await ask('  › ')).trim(), 10);
    if (idx >= 1 && idx <= options.length) {
      const chosen = options[idx - 1];
      out.write(ok(chosen.label, on) + '\n\n');
      return chosen.key;
    }
    out.write(hint(`  Réponds par un nombre entre 1 et ${options.length}.`, on) + '\n');
  }
}

export async function runWizard(ask, on, out = process.stdout) {
  out.write('\n' + heading('Vibecoding Starter Kit · configuration', on) + '\n\n');
  const stack = await pickOne(ask, on, out, 'Que veux-tu construire ?', STACKS);
  const assistant = await pickOne(ask, on, out, 'Quel assistant IA utilises-tu ?', ASSISTANTS);

  let project = '';
  for (;;) {
    project = (await ask('  Nom du projet (dossier) : ')).trim();
    if (/^[\w./~-]+$/.test(project)) { out.write(ok(project, on) + '\n\n'); break; }
    out.write(hint('  Nom invalide (lettres, chiffres, . / _ - ~).', on) + '\n');
  }

  let backend = 'cloud';
  if (stack === 'saas') backend = await pickOne(ask, on, out, 'Backend Convex ?', BACKENDS);

  const raw = (await ask('  Réduire les coûts IA (caveman) ? [o/N] : ')).trim().toLowerCase();
  const caveman = raw === 'o' || raw === 'oui';
  out.write(ok(caveman ? 'caveman activé' : 'caveman désactivé', on) + '\n\n');

  return { stack, assistant, project, backend, caveman };
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/wizard.test.mjs`
Expected: PASS (6 tests, sortie propre — `out` factice).

- [ ] **Step 5 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add scripts/lib/wizard.mjs scripts/lib/wizard.test.mjs
git commit -m "feat(wizard): logique du wizard (needsWizard/buildArgs/runWizard/backend-note)"
```

---

### Task 3 : `--backend` + branchement `setup.mjs`

**Files:**
- Modify: `scripts/lib/args.mjs` (case `--backend` + validation optionnelle)
- Modify: `scripts/setup.mjs` (imports ; `main` async ; branche wizard vs flags ; note backend sur `docs/RUN.md` ; ligne finale)
- Test: `scripts/lib/args.test.mjs` (ajouter des cas `--backend`)

**Interfaces:**
- Consumes: `needsWizard`, `buildArgsFromAnswers`, `renderBackendNote`, `runWizard` (wizard.mjs) ; `supportsColor`, `ok` (ui.mjs).

- [ ] **Step 1 : Ajouter des tests `--backend` dans `scripts/lib/args.test.mjs`** (les ajouter, ne rien retirer) :

```js
test('--backend : parsé et validé (cloud|local)', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x', '--backend', 'local']);
  assert.equal(a.backend, 'local');
  assert.deepEqual(validateArgs(a), []);
});
test('--backend invalide → erreur', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x', '--backend', 'nope']);
  assert.ok(validateArgs(a).some((e) => /backend/.test(e)));
});
```

(Si le fichier n'importe pas déjà `test`/`assert`/`parseArgs`/`validateArgs`, réutilise les imports existants en tête de fichier — ne les duplique pas.)

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test scripts/lib/args.test.mjs`
Expected: FAIL (`--backend` inconnu → `parseArgs` throw « Argument inconnu », et pas de validation backend).

- [ ] **Step 3 : Ajouter `--backend` dans `scripts/lib/args.mjs`** — dans le `switch` de `parseArgs`, après la ligne `case '--caveman': args.caveman = true; break;`, ajouter :

```js
      case '--backend': args.backend = argv[++i]; break;
```

Puis dans `validateArgs`, avant le `return errors;`, ajouter :

```js
  if (args.backend !== undefined && !['cloud', 'local'].includes(args.backend)) errors.push('--backend doit valoir cloud|local');
```

(Ne pas ajouter `backend` à l'objet par défaut de `parseArgs` — il ne doit exister que si le flag est passé, pour ne pas casser les tests d'égalité existants.)

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `node --test scripts/lib/args.test.mjs`
Expected: PASS.

- [ ] **Step 5 : Brancher le wizard dans `scripts/setup.mjs`**

En tête, après `import { writeStackEnvironment } from './lib/environment.mjs';`, ajouter :
```js
import readline from 'node:readline/promises';
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard } from './lib/wizard.mjs';
import { supportsColor, ok } from './lib/ui.mjs';
```

Remplacer l'en-tête de `main` (les lignes actuelles) :
```js
function main() {
  const args = parseArgs(process.argv.slice(2));
  const errs = validateArgs(args);
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  if (!meetsNode(process.version)) { console.error('Node ≥ 20.12 requis (voir guides/02-installer-les-outils.md)'); process.exit(1); }
```
par :
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
```

- [ ] **Step 6 : Note backend sur `docs/RUN.md`** — juste après le bloc de copie de `docs/RUN.md` (le `try { copyIfAbsent(... 'templates/run/${args.stack}.md' ... 'docs/RUN.md') ... }` qui se termine par `catch (e) { failed.push(\`run (${e.message})\`); }`), insérer :

```js
  try {
    const note = renderBackendNote(args.stack, args.backend);
    if (note) {
      const runPath = path.join(projectDir, 'docs/RUN.md');
      const cur = fs.existsSync(runPath) ? fs.readFileSync(runPath, 'utf8') : '';
      fs.writeFileSync(runPath, note + '\n' + cur);
      done.push('docs/RUN.md (note backend local)');
    }
  } catch (e) { failed.push(`backend note (${e.message})`); }
```

- [ ] **Step 7 : Ligne finale + invocation async** — juste après la ligne `console.log(formatReport({ ... }));`, ajouter :
```js
  if (fromWizard) console.log('\n' + ok('Config prête. Ouvre ton assistant IA dans le dossier du projet et lance /new-project.', on));
```
Et remplacer la dernière ligne du fichier :
```js
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
```
par :
```js
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e?.message || e); process.exit(1); });
```

- [ ] **Step 8 : Smoke (mode flags, note backend)**

Run:
```bash
rm -rf /tmp/vs-bk && node scripts/setup.mjs --source . --stack saas --assistant claude-code --project /tmp/vs-bk --backend local >/dev/null && node -e "const fs=require('fs');const r=fs.readFileSync('/tmp/vs-bk/docs/RUN.md','utf8');if(!/convex deployment select local/.test(r))throw new Error('note backend manquante');console.log('OK backend note')"
rm -rf /tmp/vs-bk2 && node scripts/setup.mjs --source . --stack desktop --assistant claude-code --project /tmp/vs-bk2 >/dev/null && node -e "const fs=require('fs');const r=fs.readFileSync('/tmp/vs-bk2/docs/RUN.md','utf8');if(/convex deployment/.test(r))throw new Error('note backend en trop (desktop)');console.log('OK pas de note desktop')"
```
Expected: `OK backend note` puis `OK pas de note desktop`.

- [ ] **Step 9 : Suite complète + commit**

Run: `node --test` (vert).
```bash
git add scripts/lib/args.mjs scripts/lib/args.test.mjs scripts/setup.mjs
git commit -m "feat(setup): wizard interactif si pas de flags + TTY ; --backend + note RUN.md"
```

---

### Task 4 : Docs — playbook + README (wizard d'abord, note Windows)

**Files:**
- Modify: `playbook/00-START.md`
- Modify: `README.md`

**Interfaces :** aucune (docs). `validatePlaybook`/`validate-commands` restent verts (00-START référencé par `AGENTS.md` ; contenu non contraint au-delà de l'existence).

- [ ] **Step 1 : Réécrire les Étapes 2-4 de `playbook/00-START.md`** — remplacer le bloc actuel des Étapes 2, 3 et 4 par :

```markdown
## Étape 2 — Installer l'environnement (l'élève, dans un terminal)
**Le chemin fiable = le wizard.** Demande à l'élève de lancer, dans le dossier cloné :
`node .vibe-stack-src/scripts/setup.mjs`
Il répond à 4-5 questions (quoi construire, assistant, nom, Convex cloud/local, caveman). **Toi, l'IA, tu ne choisis rien et tu ne scaffoldes rien à ce stade.**

> **Windows** : lance avec **`node`** (jamais un `.sh`). Pour que les hooks Git (`.githooks/*`, en bash) s'exécutent, ouvre un **Git Bash** (installé avec Git for Windows).

## Étape 3 — (fallback) Si c'est toi l'IA qui installes
Seulement si l'élève ne peut pas lancer le wizard. **GATE DUR** : commence par lui poser les mêmes questions, **ne devine JAMAIS la stack**, n'exécute aucun scaffold (`npm create convex`…) avant ses réponses. Puis lance :
`node .vibe-stack-src/scripts/setup.mjs --source .vibe-stack-src --stack <STACK> --assistant <ASSISTANT> --project <NOM>` (`--caveman` seulement si oui ; `--backend local` pour un Convex local).

## Étape 4 — Étapes « dans l'assistant » (SETUP-AI.md)
Ouvre **`docs/SETUP-AI.md`** dans le projet généré et exécute chaque case (plugins, skills, MCP à autoriser). Détails : `playbook/install-tooling.md`.
```

- [ ] **Step 2 : Mettre à jour le « Démarrage rapide » de `README.md`** — remplacer le bloc :

```text
Installe et configure ce projet, puis démarre-le :
github.com/ohvignas/vibecoding-starter-kit — suis playbook/00-START.md
```
par (garde les backticks du bloc `text` existant) :
```text
# 1. Récupère le kit (dans un terminal)
git clone https://github.com/ohvignas/vibecoding-starter-kit && cd vibecoding-starter-kit
# 2. Lance le wizard et réponds aux questions (stack, assistant, nom, Convex cloud/local)
node scripts/setup.mjs
# 3. Ouvre ton assistant IA dans le dossier du projet et tape :  /new-project
```

Puis, juste sous ce bloc, ajouter la ligne :
```markdown
> [!NOTE]
> **Windows** : lance avec `node` (pas de script `.sh`). Les hooks Git tournent sous **Git Bash**. Prérequis : Node.js ≥ 20.12 + git.
```

- [ ] **Step 3 : Vérifier que les validations restent vertes**

Run: `node --test scripts/lib/validate.test.mjs scripts/lib/validate-commands.test.mjs`
Expected: PASS (`AGENTS.md` référence toujours `playbook/00-START.md` ; les runbooks commandes inchangés).

- [ ] **Step 4 : Suite complète + commit**

Run: `node --test` (vert).
```bash
git add playbook/00-START.md README.md
git commit -m "docs: wizard comme chemin d'install principal + gate IA + note Windows"
```

---

## Self-Review

**Spec coverage :**
- Wizard `node scripts/setup.mjs` (no flags + TTY) → Task 2 (`needsWizard`/`runWizard`) + Task 3 (branchement) ✓
- 5 questions (stack/assistant/nom/backend/caveman) avec explications → Task 2 (`runWizard`, hints) ✓
- Style zéro-dép (couleurs/cadres/✓/hints, NO_COLOR/TTY, menus numérotés) → Task 1 (`ui.mjs`) ✓
- Mode `--flags` gardé → Task 3 (branche `else`) ✓
- Convex cloud/local → note `docs/RUN.md` → Task 2 (`renderBackendNote`) + Task 3 (application) ✓
- Ligne finale « ouvre ton assistant → /new-project » → Task 3 étape 7 ✓
- README + playbook repointés + note Windows → Task 4 ✓
- Testabilité (logique pure, `ask`/`out` injectés) → Tasks 1-2 ✓

**Placeholder scan :** aucun TBD/TODO ; code complet ; commandes exactes. La seule instruction conditionnelle (Task 3 étape 1 « réutilise les imports existants ») est un garde-fou DRY, pas un placeholder. ✓

**Type consistency :** `runWizard(ask, on, out)` renvoie `{stack,assistant,project,backend,caveman}` → consommé par `buildArgsFromAnswers` (mêmes clés) → produit un `args` avec les clés de `parseArgs` + `backend`, consommé par `buildRunPlan`/writers inchangés. `supportsColor`/`ok` importés de ui.mjs par setup.mjs. `renderBackendNote(stack, backend)` cohérent Task 2↔3. ✓

## Notes d'exécution

- Ordre : Task 1 → 2 → 3 → 4 (2 dépend de 1 ; 3 de 2 ; 4 = docs).
- Branche : `git checkout -b feat/wizard` depuis `main` avant Task 1.
- Le wizard interactif complet (readline réel) ne se teste pas sans pseudo-TTY : la logique est couverte par `runWizard(fakeAsk)` (Task 2) et le branchement par le smoke `--flags` (Task 3). Ne pas tenter de piper stdin (non-TTY → wizard ne se déclenche pas, par design).
