# `/new-project` — Implementation Plan (SP-A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le runbook de la commande `/new-project` (fondation : PRD + tech spec + design + roadmap) + les templates AGENTS.md réutilisables (boucle d'itération, règle design) + un validateur qui garantit leur cohérence.

**Architecture:** Le runbook et les templates sont des fichiers Markdown déterministes sous `templates/` (l'installeur SP-F les copiera dans le projet de l'élève, par assistant). Un validateur Node pur (`scripts/lib/validate-commands.mjs`) vérifie que le runbook contient ses 7 phases + référence ses fichiers de sortie + que les templates existent. TDD sur le validateur ; contenu éditorial pour runbook/templates, garanti par le validateur.

**Tech Stack:** Node ESM, `node --test`, zéro dépendance. Markdown.

## Global Constraints

- Node ≥ 20.12, pure ESM, `node --test`, ZERO dépendance externe. Copy en **français**.
- Pilote = **boucle superpowers** (PAS BMAD). La boucle : `brainstorming → writing-plans → subagent-driven-development(+TDD) → review → test live → sécu → commit → PR → CI → merge sur dev`. Def-of-done = **mergé sur `dev` + testé live**.
- Gates humains : chaque artefact de `/new-project` **attend validation** avant le suivant.
- `/new-project` produit ces fichiers (le runbook DOIT les référencer) : `docs/PRD.md`, `docs/ROADMAP.md`, `docs/design.md`, une spec architecture sous `docs/superpowers/specs/`, `AGENTS.md`(+`CLAUDE.md`), squelette `docs/memory/`, `docs/DREAM.md`.
- Règle design : avant toute édition UI → charger les **5 skills design** (frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines) + lire `docs/design.md`.
- Fichiers sources sous `templates/` ; l'installeur (SP-F, hors périmètre ici) les copiera. SP-A = runbook + templates + validateur, PAS le wiring installeur.

---

### Task 1 : Validateur des commandes

**Files:**
- Create: `scripts/lib/validate-commands.mjs`
- Test: `scripts/lib/validate-commands.test.mjs`

**Interfaces:**
- Produces: `validateNewProjectCommand(root) -> string[]` (vide si OK). Vérifie : le runbook `templates/commands/new-project.md` existe et contient chaque marqueur de phase + chaque chemin de sortie ; les templates `templates/agents/loop-section.md` et `design-rule.md` existent.

- [ ] **Step 1 : Écrire le test qui échoue (fixtures temp)**

```js
// scripts/lib/validate-commands.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateNewProjectCommand } from './validate-commands.mjs';

const PHASES = ['Brainstorm', 'PRD', 'stack', 'architecture', 'Design', 'Roadmap', 'Mise en place'];
const OUTPUTS = ['docs/PRD.md', 'docs/ROADMAP.md', 'docs/design.md', 'docs/superpowers/specs', 'docs/memory', 'docs/DREAM.md'];

function makeRoot({ omitPhase = null, omitTemplate = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-'));
  fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/agents'), { recursive: true });
  const phases = PHASES.filter(p => p !== omitPhase).join(' ');
  const outputs = OUTPUTS.join(' ');
  fs.writeFileSync(path.join(root, 'templates/commands/new-project.md'), `${phases}\n${outputs}\n`);
  if (!omitTemplate) {
    fs.writeFileSync(path.join(root, 'templates/agents/loop-section.md'), 'boucle');
    fs.writeFileSync(path.join(root, 'templates/agents/design-rule.md'), 'design');
  }
  return root;
}

test('runbook complet + templates → aucune erreur', () => {
  assert.deepEqual(validateNewProjectCommand(makeRoot()), []);
});
test('phase manquante → erreur', () => {
  assert.ok(validateNewProjectCommand(makeRoot({ omitPhase: 'PRD' })).some(e => /PRD/.test(e)));
});
test('template manquant → erreur', () => {
  assert.ok(validateNewProjectCommand(makeRoot({ omitTemplate: true })).some(e => /loop-section/.test(e)));
});
test('runbook absent → erreur unique', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-'));
  const errs = validateNewProjectCommand(root);
  assert.ok(errs.some(e => /new-project\.md/.test(e)));
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `node --test scripts/lib/validate-commands.test.mjs`
Expected: FAIL (`Cannot find module './validate-commands.mjs'`).
*(Si `node` sort du bruit nvm `_nvm_lazy_load`, utiliser `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.)*

- [ ] **Step 3 : Implémenter**

```js
// scripts/lib/validate-commands.mjs
import fs from 'node:fs';
import path from 'node:path';

const PHASES = ['Brainstorm', 'PRD', 'stack', 'architecture', 'Design', 'Roadmap', 'Mise en place'];
const OUTPUTS = ['docs/PRD.md', 'docs/ROADMAP.md', 'docs/design.md', 'docs/superpowers/specs', 'docs/memory', 'docs/DREAM.md'];
const AGENTS_TEMPLATES = ['templates/agents/loop-section.md', 'templates/agents/design-rule.md'];

export function validateNewProjectCommand(root) {
  const errors = [];
  const runbook = path.join(root, 'templates/commands/new-project.md');
  if (!fs.existsSync(runbook)) { errors.push('manquant : templates/commands/new-project.md'); return errors; }
  const txt = fs.readFileSync(runbook, 'utf8');
  for (const p of PHASES) if (!txt.includes(p)) errors.push(`runbook : phase manquante « ${p} »`);
  for (const o of OUTPUTS) if (!txt.includes(o)) errors.push(`runbook : sortie non référencée « ${o} »`);
  for (const t of AGENTS_TEMPLATES) if (!fs.existsSync(path.join(root, t))) errors.push(`template manquant : ${t}`);
  return errors;
}
```

- [ ] **Step 4 : Lancer → succès**

Run: `node --test scripts/lib/validate-commands.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/validate-commands.mjs scripts/lib/validate-commands.test.mjs
git commit -m "feat(commands): validateur du runbook /new-project"
```

---

### Task 2 : Templates AGENTS.md réutilisables (boucle + règle design)

**Files:**
- Create: `templates/agents/loop-section.md`
- Create: `templates/agents/design-rule.md`
- Test: `scripts/lib/agents-templates.test.mjs`

**Interfaces:**
- Produces: deux fichiers Markdown que `/new-project` (et plus tard `/new-feature`, `/edit-design`) écrivent dans l'`AGENTS.md` du projet. Contrats de contenu vérifiés par test (chaînes-clés présentes).

- [ ] **Step 1 : Écrire le test qui échoue**

```js
// scripts/lib/agents-templates.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('loop-section : boucle superpowers, def-of-done dev, pas de BMAD', () => {
  const t = read('templates/agents/loop-section.md');
  for (const s of ['brainstorming', 'writing-plans', 'subagent-driven-development', 'test live', 'merge', 'dev']) {
    assert.match(t, new RegExp(s));
  }
  assert.doesNotMatch(t, /BMAD/i);
});
test('design-rule : les 5 skills design + design.md', () => {
  const t = read('templates/agents/design-rule.md');
  for (const s of ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'shadcnblocks', 'brand-guidelines', 'design.md']) {
    assert.match(t, new RegExp(s.replace(/[-.]/g, '\\$&')));
  }
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `node --test scripts/lib/agents-templates.test.mjs`
Expected: FAIL (fichiers absents).

- [ ] **Step 3 : Créer `templates/agents/loop-section.md`**

```markdown
## Boucle d'itération (NON négociable)

Tout changement suit ce cycle. Chaque flèche = un livrable validé avant la suite :

`brainstorming → plan → exécution (sub-agents, TDD) → review → test live → sécu → commit → PR → CI → merge (dev)`

| Étape | Skill à invoquer |
|---|---|
| Brainstorming | `superpowers:brainstorming` |
| Plan | `superpowers:writing-plans` |
| Exécution (TDD) | `superpowers:subagent-driven-development` + `superpowers:test-driven-development` |
| Review code | `superpowers:requesting-code-review` + `/code-review` |
| Test live | `/verify` + `/run` (navigateur pour le web, fenêtre pour desktop, smoke pour mobile) |
| Sécurité | `/security-review` |
| Commit | `commit-commands:commit` (Conventional Commits) |
| PR | `commit-commands:commit-push-pr` |
| CI | `gh pr checks <n>` + `gh run watch <id> --exit-status` |
| Merge (dev) | `superpowers:finishing-a-development-branch` (squash) |

**Transverses** : jamais de code avant plan validé ; toujours **TDD** ; `superpowers:verification-before-completion` avant de dire « fini » (preuve par la commande) ; `superpowers:systematic-debugging` avant tout fix ; **un worktree par feature** (`superpowers:using-git-worktrees`).

**Définition de « fini » (NON négociable)** : mergé sur `dev` (CI verte + review OK, un PR à la fois) **ET** testé en live par l'agent. Tests unitaires + CI verte = nécessaires mais **pas** suffisants. Si un blocage externe empêche le test live → le signaler explicitement comme seul motif d'arrêt.
```

- [ ] **Step 4 : Créer `templates/agents/design-rule.md`**

```markdown
## Règle design (avant TOUTE édition UI/UX)

Avant de créer ou modifier une interface, **charge d'abord le contexte design** — sinon tu codes une UI hors-charte :

1. Charge les **5 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`.
2. Lis **`docs/design.md`** (design system du projet : couleurs, typo, espacements, états).
3. Édite en respectant ce contexte. Screenshot **avant/après** pour vérifier le rendu.

Cette règle s'applique aussi pendant `/new-feature`, pas seulement via `/edit-design`.
```

- [ ] **Step 5 : Lancer → succès**

Run: `node --test scripts/lib/agents-templates.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 6 : Commit**

```bash
git add templates/agents/loop-section.md templates/agents/design-rule.md scripts/lib/agents-templates.test.mjs
git commit -m "feat(agents): templates boucle d'itération + règle design"
```

---

### Task 3 : Le runbook `/new-project`

**Files:**
- Create: `templates/commands/new-project.md`
- Test: `scripts/lib/new-project-runbook.test.mjs`

**Interfaces:**
- Consumes: `validateNewProjectCommand` (Task 1) ; les templates (Task 2).
- Produces: le runbook que l'IA suit. Test d'intégration = `validateNewProjectCommand(REPO_ROOT)` renvoie `[]`.

- [ ] **Step 1 : Écrire le test d'intégration (échoue tant que le runbook n'existe pas)**

```js
// scripts/lib/new-project-runbook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNewProjectCommand } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('le runbook /new-project est cohérent (phases + sorties + templates)', () => {
  assert.deepEqual(validateNewProjectCommand(ROOT), []);
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `node --test scripts/lib/new-project-runbook.test.mjs`
Expected: FAIL (runbook absent → erreur `manquant : templates/commands/new-project.md`).

- [ ] **Step 3 : Créer `templates/commands/new-project.md`**

```markdown
# /new-project — Fondation d'un nouveau projet (runbook IA)

Tu construis la FONDATION complète d'un nouveau produit à partir de l'idée donnée en argument.
Va **phase par phase**, en français. **Chaque artefact attend la validation de l'utilisateur avant le suivant** (gate). Pour aller en profondeur, **lance des sous-agents en parallèle** (recherche, rédaction) puis synthétise.

Argument : `$ARGUMENTS` = description libre de l'idée.

## Phase 1 — Brainstorm produit (gate)
Invoque `superpowers:brainstorming`. Explore : intention, users/personas, contraintes, périmètre, critères de succès. Pose les questions **une à la fois**. → fais valider avant de continuer.

## Phase 2 — PRD complète → `docs/PRD.md` (gate)
Rédige une PRD complète : problème, personas, objectifs, scope, liste de features, user flows, métriques de succès, **non-goals**. (Peut fan-out : un sous-agent recherche marché/concurrents, un autre rédige.) → validation.

## Phase 3 — Choix de la stack
Choisis parmi les 3 stacks du kit selon l'idée : SaaS (Convex+TanStack Start+Better Auth) / mobile (Expo+Convex) / desktop (Electron). Réutilise `stacks/<stack>/` (README + AGENTS.md + ai-context).

## Phase 4 — Tech spec / architecture → `docs/superpowers/specs/<date>-<projet>-architecture.md` (gate)
Décris : composants, modèle de données, APIs, intégrations, sécurité/RGPD, arbitrages. → validation.

## Phase 5 — Design → `docs/design.md` (gate)
**Charge d'abord les 5 skills design** (frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines). Définis la direction UI/UX + design system (couleurs, typo, espacements, états clés). Maquettes optionnelles (frontend-design / Pencil / Stitch / Figma). → validation.

## Phase 6 — Roadmap → `docs/ROADMAP.md`
Découpe les features par phase.

## Phase 7 — Mise en place du projet
1. Scaffold la stack choisie (`npm create convex …` / `create-expo-app` / `create-electron-app`).
2. Écris `AGENTS.md` (+ copie `CLAUDE.md`) en y intégrant : le contenu de `templates/agents/loop-section.md` (la boucle d'itération), `templates/agents/design-rule.md` (règle design), les règles mémoire, et des liens vers `docs/PRD.md`, `docs/ROADMAP.md`, `docs/design.md`, la spec architecture, et `docs/memory/`.
3. Crée le squelette `docs/memory/` (index + gotchas/conventions/decisions/archive) et `docs/DREAM.md` (vide, avec en-tête).

## Fini quand
Les 6 fichiers fondation existent + le projet est scaffoldé + `AGENTS.md` contient la boucle et la règle design. Ensuite : « pour construire une feature, lance `/new-feature` ».
```

- [ ] **Step 4 : Lancer → succès**

Run: `node --test scripts/lib/new-project-runbook.test.mjs`
Expected: PASS (validateNewProjectCommand(ROOT) === []).

- [ ] **Step 5 : Lancer toute la suite**

Run: `node --test`
Expected: PASS (suite existante + 3 nouveaux fichiers de test).

- [ ] **Step 6 : Commit**

```bash
git add templates/commands/new-project.md scripts/lib/new-project-runbook.test.mjs
git commit -m "feat(commands): runbook /new-project (7 phases, gates, fan-out)"
```

---

## Notes de mise en œuvre (hors périmètre SP-A, pour les sous-projets suivants)

- **SP-F (installeur)** copiera `templates/commands/*.md` vers `.claude/commands/` (Claude Code) / `.cursor/commands/` (Cursor), et injectera `templates/agents/*.md` dans l'`AGENTS.md` généré (Codex inclus). C'est là que le retrait de BMAD + l'install des 5 skills design se fera.
- **SP-C `/edit-design`** réutilisera `templates/agents/design-rule.md`.
- **SP-B `/new-feature`** réutilisera `templates/agents/loop-section.md`.
- Le validateur `validate-commands.mjs` s'étendra (`validateNewFeatureCommand`, `validateEditDesignCommand`) dans SP-B/SP-C.
