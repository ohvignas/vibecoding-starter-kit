# `/new-feature` — Implementation Plan (SP-B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Livrer le runbook `/new-feature` (boucle de livraison : préflight GitHub + worktree → brainstorm → plan → sub-agents → review → test live → sécu → commit → PR → CI → merge dev) + l'extension du validateur.

**Architecture:** Un runbook Markdown `templates/commands/new-feature.md` (qui référence `templates/agents/loop-section.md`, déjà livré en SP-A) + `validateNewFeatureCommand(root)` ajouté à `scripts/lib/validate-commands.mjs`. TDD sur le validateur ; contenu éditorial pour le runbook, garanti par le validateur.

**Tech Stack:** Node ESM, `node --test`, zéro dépendance. Markdown.

## Global Constraints

- Node ≥ 20.12, pure ESM, `node --test`, ZERO dépendance. Copy **français**.
- Le runbook DOIT référencer ces étapes/skills (tokens distinctifs, exacts) : `worktree`, `brainstorming`, `writing-plans`, `subagent-driven-development`, `code-review`, `test live`, `security-review`, `commit-push-pr`, `gh run watch`, `finishing-a-development-branch`, `dev`, et `loop-section.md`.
- Def-of-done = mergé sur `dev` + testé live (gates humains au brainstorm + plan, autonome ensuite).
- Ne pas casser les exports existants de `validate-commands.mjs` (`validateNewProjectCommand`, `validateEditDesignCommand`).
- Runbook source sous `templates/commands/` ; wiring installeur = SP-F.

---

### Task 1 : `validateNewFeatureCommand`

**Files:**
- Modify: `scripts/lib/validate-commands.mjs` (ajouter un export)
- Test: `scripts/lib/validate-new-feature.test.mjs`

**Interfaces:**
- Produces: `validateNewFeatureCommand(root) -> string[]` (vide si OK). Vérifie que `templates/commands/new-feature.md` existe + contient chaque token d'étape + référence `loop-section.md`.

- [ ] **Step 1 : Écrire le test qui échoue (fixtures temp)**

```js
// scripts/lib/validate-new-feature.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateNewFeatureCommand } from './validate-commands.mjs';

const STEPS = ['worktree', 'brainstorming', 'writing-plans', 'subagent-driven-development', 'code-review', '/verify', 'security-review', 'commit-push-pr', 'gh run watch', 'finishing-a-development-branch', 'dev'];

function makeRoot({ omitStep = null, omitLoopRef = false, omitRunbook = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
  if (!omitRunbook) {
    fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
    const steps = STEPS.filter(s => s !== omitStep).join(' \n');
    const loopRef = omitLoopRef ? '' : 'templates/agents/loop-section.md';
    fs.writeFileSync(path.join(root, 'templates/commands/new-feature.md'), `${steps}\n${loopRef}\n`);
  }
  return root;
}

test('runbook complet → aucune erreur', () => {
  assert.deepEqual(validateNewFeatureCommand(makeRoot()), []);
});
test('étape manquante → erreur', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitStep: 'security-review' })).some(e => /security-review/.test(e)));
});
test('référence loop-section manquante → erreur', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitLoopRef: true })).some(e => /loop-section/.test(e)));
});
test('runbook absent → erreur unique', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitRunbook: true })).some(e => /new-feature\.md/.test(e)));
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `node --test scripts/lib/validate-new-feature.test.mjs`
Expected: FAIL (`validateNewFeatureCommand` non exporté).
*(Si bruit nvm : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.)*

- [ ] **Step 3 : Ajouter la fonction dans `scripts/lib/validate-commands.mjs`** (à la fin, sans toucher au reste)

```js
export function validateNewFeatureCommand(root) {
  const errors = [];
  const rb = path.join(root, 'templates/commands/new-feature.md');
  if (!fs.existsSync(rb)) { errors.push('manquant : templates/commands/new-feature.md'); return errors; }
  const txt = fs.readFileSync(rb, 'utf8');
  const steps = ['worktree', 'brainstorming', 'writing-plans', 'subagent-driven-development', 'code-review', '/verify', 'security-review', 'commit-push-pr', 'gh run watch', 'finishing-a-development-branch', 'dev'];
  for (const s of steps) if (!txt.includes(s)) errors.push(`new-feature : étape non référencée « ${s} »`);
  if (!txt.includes('loop-section.md')) errors.push('new-feature : ne référence pas templates/agents/loop-section.md');
  return errors;
}
```

- [ ] **Step 4 : Lancer → succès**

Run: `node --test scripts/lib/validate-new-feature.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/validate-commands.mjs scripts/lib/validate-new-feature.test.mjs
git commit -m "feat(commands): validateNewFeatureCommand"
```

---

### Task 2 : Le runbook `/new-feature`

**Files:**
- Create: `templates/commands/new-feature.md`
- Test: `scripts/lib/new-feature-runbook.test.mjs`

**Interfaces:**
- Consumes: `validateNewFeatureCommand` (Task 1).
- Produces: le runbook. Test d'intégration = `validateNewFeatureCommand(REPO_ROOT)` renvoie `[]`.

- [ ] **Step 1 : Écrire le test d'intégration**

```js
// scripts/lib/new-feature-runbook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNewFeatureCommand } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('le runbook /new-feature est cohérent (toutes les étapes + loop-section)', () => {
  assert.deepEqual(validateNewFeatureCommand(ROOT), []);
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `node --test scripts/lib/new-feature-runbook.test.mjs`
Expected: FAIL (runbook absent).

- [ ] **Step 3 : Créer `templates/commands/new-feature.md`**

```markdown
# /new-feature — Boucle de livraison d'une feature (runbook IA)

Argument : `$ARGUMENTS` = description de la feature à construire.
Suis la **boucle d'itération** de l'`AGENTS.md` (issue de `templates/agents/loop-section.md`), sans sauter d'étape. **Gates humains** au brainstorm et au plan ; autonome ensuite jusqu'au merge.

## Préflight
1. Vérifie GitHub : `gh auth status`. Vérifie le remote : `git remote`. Si aucun remote → propose `gh repo create` et relie le projet.
2. Crée un **worktree** isolé pour la feature (`superpowers:using-git-worktrees`) sur une branche `feat/…`.

## Boucle
1. **Brainstorm** (`superpowers:brainstorming`) — scopé à la feature, référence `docs/PRD.md`. → gate (validation).
2. **Plan** (`superpowers:writing-plans`) — plan TDD, tâches bite-sized. → gate (validation).
3. **Exécution** (`superpowers:subagent-driven-development` + TDD) — tâche par tâche, test rouge → vert.
4. **Review code** (`superpowers:requesting-code-review` + `/code-review`).
5. **Test live** — lance l'app et **vérifie le résultat attendu** (`/verify` + `/run`) : navigateur pour le web, fenêtre pour desktop, smoke pour mobile.
6. **Sécu** (`/security-review`).
7. **Commit** (`commit-commands:commit`, Conventional Commits).
8. **PR** (`commit-commands:commit-push-pr`).
9. **CI** — surveille jusqu'au bout : `gh pr checks <n>` puis `gh run watch <id> --exit-status`. Rouge → diagnostiquer (`superpowers:systematic-debugging`), pas de merge.
10. **Merge sur `dev`** (`superpowers:finishing-a-development-branch`, squash).

## Fini quand
Mergé sur `dev` (CI verte + review OK, un PR à la fois) **ET** testé en live par l'agent. Tests unitaires + CI verte = nécessaires mais **pas** suffisants. Si un blocage externe empêche d'aller au bout → **dire exactement ce qui manque**.
```

- [ ] **Step 4 : Lancer → succès**

Run: `node --test scripts/lib/new-feature-runbook.test.mjs`
Expected: PASS.

- [ ] **Step 5 : Lancer toute la suite**

Run: `node --test`
Expected: PASS (suite + 2 nouveaux fichiers de test).

- [ ] **Step 6 : Commit**

```bash
git add templates/commands/new-feature.md scripts/lib/new-feature-runbook.test.mjs
git commit -m "feat(commands): runbook /new-feature (boucle livraison → merge dev)"
```

---

## Notes (hors périmètre SP-B)
- SP-F copiera `templates/commands/new-feature.md` vers `.claude/commands/` / `.cursor/commands/`.
