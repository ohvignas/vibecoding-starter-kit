# Code d'accès (licence entonnoir) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le wizard demande un **code d'accès** (`? Code d'accès ›`), distribué par email via la landing, pour capturer les emails — sans jamais bloquer un élève (mode doux).

**Architecture:** Un code **unique partagé** au format licence (`VIBE-XXXX-XXXX-XXXX`), validé **hors-ligne** par comparaison de chaîne normalisée. Nouvelle lib pure `scripts/lib/license.mjs` (normalize + check). Le wizard ajoute une question ; le flag `--license` couvre le mode non-interactif. `setup.mjs` affiche un statut (validé / non reconnu) mais **continue toujours** (doux). Aucun serveur, aucune télémétrie, rien de stocké.

**Tech Stack:** Node ESM, zéro dépendance, `node --test`.

## Global Constraints

- Node ESM, **zéro dépendance runtime**. Tests via `node --test`.
- **Mode doux, NON négociable** : la présence/absence/erreur de code ne fait **jamais** `exit ≠ 0` ni ne bloque le scaffold. `setup.mjs` garde son code de sortie actuel (0 si tout va bien, 1 seulement sur échec de copies).
- **Code unique partagé** : constante `EXPECTED_LICENSE = 'VIBE-7K4Q-9F2P-XR31'` dans `license.mjs`. Format faker `VIBE-XXXX-XXXX-XXXX`.
- **Validation = entonnoir, pas verrou** : le paquet est public/open-source ; assumer que c'est contournable. But = forcer l'email pour les gens normaux.
- **Normalisation** : majuscules + on ne garde que `[A-Z0-9]` (tirets/espaces/casse ignorés). `vibe7k4q9f2pxr31` doit matcher.
- `--yes` **et** terminal non-interactif → **aucune question** posée (cohorte/CI lancent une commande unique). Le flag `--license` reste lu partout.
- Copie utilisateur en **français**, sans les mots « formation »/« accompagnement » dans les fichiers générés.
- Aucun stockage : ne pas écrire le code dans `.vibecoding.json` ni ailleurs.
- Bump `package.json` en **0.3.0** ; suite `node --test` verte avant tout republish.

---

### Task 1: Lib pure `license.mjs` (normalize + check)

**Files:**
- Create: `scripts/lib/license.mjs`
- Test: `scripts/lib/license.test.mjs`

**Interfaces:**
- Produces :
  - `EXPECTED_LICENSE: string` — le code attendu.
  - `normalizeLicense(s: unknown) => string` — majuscules, `[A-Z0-9]` uniquement.
  - `checkLicense(input: unknown, expected?: string) => boolean` — vrai si non-vide et égal après normalisation.

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/license.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLicense, checkLicense, EXPECTED_LICENSE } from './license.mjs';

test('normalizeLicense : majuscules, ne garde que A-Z0-9', () => {
  assert.equal(normalizeLicense('vibe-7k4q-9f2p-xr31'), 'VIBE7K4Q9F2PXR31');
  assert.equal(normalizeLicense('  VIBE 7K4Q '), 'VIBE7K4Q');
  assert.equal(normalizeLicense(null), '');
  assert.equal(normalizeLicense(undefined), '');
});

test('checkLicense : insensible casse/tirets/espaces, refuse vide et faux', () => {
  assert.equal(checkLicense(EXPECTED_LICENSE), true);
  assert.equal(checkLicense('vibe7k4q9f2pxr31'), true);       // sans tirets, minuscules
  assert.equal(checkLicense(' VIBE-7K4Q-9F2P-XR31 '), true);  // espaces
  assert.equal(checkLicense(''), false);
  assert.equal(checkLicense('WRONG-CODE'), false);
  assert.equal(checkLicense(null), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/license.test.mjs`
Expected: FAIL — `Cannot find module './license.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/license.mjs
// Code d'accès UNIQUE partagé, distribué par email via la landing.
// Entonnoir (force l'email), PAS un verrou : le paquet est public/open-source → contournable.
export const EXPECTED_LICENSE = 'VIBE-7K4Q-9F2P-XR31';

// Normalise : majuscules, on ne garde que [A-Z0-9] → tirets/espaces/casse ignorés.
export function normalizeLicense(s) {
  return String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Vrai si le code (normalisé) est non vide ET égal au code attendu.
export function checkLicense(input, expected = EXPECTED_LICENSE) {
  const n = normalizeLicense(input);
  return n.length > 0 && n === normalizeLicense(expected);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/license.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/license.mjs scripts/lib/license.test.mjs
git commit -m "feat(license): lib pure code d'accès (normalize + check)"
```

---

### Task 2: Parse `--license` dans `args.mjs`

**Files:**
- Modify: `scripts/lib/args.mjs` (objet `args` par défaut ligne 8 ; `switch` du `parseArgs`)
- Test: `scripts/lib/args.test.mjs`

**Interfaces:**
- Consumes : rien de nouveau.
- Produces : `parseArgs(argv).license: string | null` (défaut `null`).

- [ ] **Step 1: Write the failing test** (ajouter dans `scripts/lib/args.test.mjs`)

```js
test('parseArgs : --license capturé, défaut null', () => {
  assert.equal(parseArgs(['--stack','saas','--assistant','cursor','--project','x']).license, null);
  assert.equal(parseArgs(['--project','x','--license','VIBE-7K4Q-9F2P-XR31']).license, 'VIBE-7K4Q-9F2P-XR31');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/args.test.mjs`
Expected: FAIL — `license` vaut `undefined`, pas `null`.

- [ ] **Step 3: Write minimal implementation**

Dans `scripts/lib/args.mjs`, ajouter `license: null` à l'objet par défaut (ligne 8) :

```js
  const args = { stack: null, assistant: null, project: null, mockup: null, source: null, dryRun: false, force: false, caveman: false, yes: false, learning: true, license: null };
```

Et un `case` dans le `switch` (près de `--mockup`) :

```js
      case '--license': args.license = argv[++i]; break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/args.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/args.mjs scripts/lib/args.test.mjs
git commit -m "feat(license): flag --license dans parseArgs"
```

---

### Task 3: Question wizard + report dans `buildArgsFromAnswers`

**Files:**
- Modify: `scripts/lib/wizard.mjs` (`runWizard` ; `buildArgsFromAnswers`)
- Test: `scripts/lib/wizard.test.mjs`

**Interfaces:**
- Consumes : `parseArgs(...).license` via `base` (drapeaux CLI conservés).
- Produces :
  - `runWizard(...)` renvoie un objet avec `license: string` (chaîne vide si l'élève passe).
  - `buildArgsFromAnswers(a, base)` renvoie `args.license` (réponse wizard, sinon `base.license`, sinon `null`).

- [ ] **Step 1: Write the failing test** (ajouter dans `scripts/lib/wizard.test.mjs`)

```js
test('buildArgsFromAnswers : porte le code d\'accès (wizard, sinon base, sinon null)', () => {
  const a = { stack: 'saas', assistant: 'cursor', project: 'app', license: 'VIBE-7K4Q-9F2P-XR31' };
  assert.equal(buildArgsFromAnswers(a, {}).license, 'VIBE-7K4Q-9F2P-XR31');
  assert.equal(buildArgsFromAnswers({ stack: 'saas', assistant: 'cursor', project: 'app' }, { license: 'X' }).license, 'X');
  assert.equal(buildArgsFromAnswers({ stack: 'saas', assistant: 'cursor', project: 'app' }, {}).license, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/wizard.test.mjs`
Expected: FAIL — `license` absent de l'objet retourné (`undefined`).

- [ ] **Step 3: Write minimal implementation**

Dans `buildArgsFromAnswers` (`scripts/lib/wizard.mjs`), ajouter au littéral `args` :

```js
    license: a.license ?? base.license ?? null,
```

Dans `runWizard`, après la question « Mode apprentissage » (juste avant le `return`), ajouter :

```js
  const license = (await ask('  Code d\'accès (format VIBE-XXXX-XXXX-XXXX, reçu par email) — Entrée pour passer : ')).trim();
```

et inclure `license` dans l'objet retourné :

```js
  return { stack, assistant, project, backend, caveman, learning, license };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/wizard.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/wizard.mjs scripts/lib/wizard.test.mjs
git commit -m "feat(license): question wizard code d'accès + report dans buildArgsFromAnswers"
```

---

### Task 4: Statut licence dans `setup.mjs` (mode doux) + test d'intégration

**Files:**
- Modify: `scripts/setup.mjs` (imports ; dans `main()`, après résolution des `args`, avant le scaffold)
- Test: `scripts/lib/license-flow.test.mjs`

**Interfaces:**
- Consumes : `checkLicense` (Task 1), `args.license` (Tasks 2-3), `ok` (déjà importé depuis `./lib/ui.mjs`).
- Produces : une ligne stdout — `Licence validée` si code bon, sinon `mode doux` — **sans jamais** changer le code de sortie.

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/license-flow.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url'; // PAS new URL(...).pathname (cassé sous Windows)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};
const run = (license) => execFileSync(
  process.execPath,
  ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'cursor',
   '--project', path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vs-lic-')), 'app'),
   '--no-skills', '--yes', '--license', license],
  { cwd: ROOT, encoding: 'utf8', env: GIT_ENV },
);

test('code valide → « Licence validée », exit 0', () => {
  const out = run('vibe-7k4q-9f2p-xr31'); // minuscules + tirets → doit matcher
  assert.match(out, /Licence validée/);
});

test('code faux → mention « mode doux », exit 0 (jamais bloquant)', () => {
  const out = run('MAUVAIS-CODE'); // n'throw pas = exit 0
  assert.match(out, /mode doux/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/license-flow.test.mjs`
Expected: FAIL — aucune ligne « Licence validée » / « mode doux » émise par `setup.mjs`.

- [ ] **Step 3: Write minimal implementation**

Dans `scripts/setup.mjs`, ajouter l'import (près des autres `./lib/…`) :

```js
import { checkLicense } from './lib/license.mjs';
```

Dans `main()`, après `const baseDir = projectBaseDir(kitRoot, process.cwd());` (et avant `buildRunPlan`), ajouter :

```js
  // Code d'accès (entonnoir email) — mode DOUX : on informe, on ne bloque JAMAIS.
  if (args.license && String(args.license).trim()) {
    console.log(checkLicense(args.license)
      ? ok('Licence validée — merci !', on)
      : "Code d'accès non reconnu — on continue quand même (mode doux).");
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/license-flow.test.mjs`
Expected: PASS (2 tests). Vérifier aussi la suite complète : `node --test`.

- [ ] **Step 5: Commit**

```bash
git add scripts/setup.mjs scripts/lib/license-flow.test.mjs
git commit -m "feat(license): statut code d'accès dans setup (mode doux, jamais bloquant)"
```

---

### Task 5: Bump 0.3.0 + note README

**Files:**
- Modify: `package.json` (`version`)
- Modify: `README.md` (quickstart — mention du code d'accès optionnel)

**Interfaces:** aucune (doc + version).

- [ ] **Step 1: Write the failing test** (ajouter dans `scripts/lib/package-publish.test.mjs`)

```js
test('version bumpée pour la release licence', () => {
  const [maj, min] = pkg.version.split('.').map(Number);
  assert.ok(maj > 0 || min >= 3, `version ${pkg.version} attendue ≥ 0.3.0`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/package-publish.test.mjs`
Expected: FAIL — version encore `0.2.1`.

- [ ] **Step 3: Write minimal implementation**

Dans `package.json` : `"version": "0.3.0"`.

Dans `README.md`, sous le bloc « Option A » du quickstart, ajouter une ligne :

```markdown
> Le wizard peut demander un **code d'accès** (reçu par email via la page d'inscription) — appuie sur **Entrée** pour passer, il n'est jamais bloquant.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS (toute la suite).

- [ ] **Step 5: Commit**

```bash
git add package.json README.md scripts/lib/package-publish.test.mjs
git commit -m "chore(license): bump 0.3.0 + note README code d'accès"
```

---

## Republish (ops — manuel, hors TDD)

1. `node --test` **vert** (obligatoire).
2. Bump déjà fait (0.3.0).
3. `npm publish` — via token bypass-2FA (supprimé/roté après) OU depuis ton terminal (validation clé « antoine »). Voir `PUBLISH.md`.
4. **Vérifier le vrai chemin** : dossier vide → `npx create-vibecoding-kit@latest demo --stack saas --assistant cursor --yes --no-skills --license vibe-7k4q-9f2p-xr31` → attendu : « Licence validée ».

## Hors périmètre de CE plan (ops séparées, à planifier à part si besoin)

- **Brevo** : liste de contacts + automation « inscription → email contenant `VIBE-7K4Q-9F2P-XR31` ». (MCP Brevo.)
- **Hébergement landing** : mettre `landing.html` en ligne (Hostinger) + brancher le `<form>` sur Brevo (form embed ou API). Le prototype Artifact ne poste pas (CSP).
- Ces deux points ne sont pas du code du dépôt et n'ont pas de cycle TDD — à traiter comme une checklist ops.

## Self-Review

- **Couverture spec** : code unique partagé (Task 1), format faker (constante), mode doux jamais bloquant (Task 4 + test « exit 0 »), `--license` non-interactif (Task 2) + question wizard (Task 3), `--yes`/non-TTY ne posent pas la question (inchangé — `needsWizard` non touché), bump + doc (Task 5). ✅
- **Placeholders** : aucun — chaque step porte le code réel.
- **Cohérence des types** : `license: string | null` de bout en bout ; `checkLicense`/`normalizeLicense` signatures stables entre Task 1 (def) et Task 4 (usage) ; `ok(msg, on)` déjà utilisé ailleurs dans `setup.mjs`. ✅
- **Piège Windows évité** : le test d'intégration (Task 4) utilise `fileURLToPath`, pas `new URL(...).pathname`.
