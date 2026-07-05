# Mémoire (SP-D) + Dream hook (SP-E) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Livrer les templates de la **mémoire auto-croissante** (`docs/memory/` + règles AGENTS.md) et du **dream hook** (workflow GitHub Actions propose-only + seed `DREAM.md`), + les validateurs.

**Architecture:** Templates Markdown/YAML sous `templates/memory/`, `templates/dream/`, `templates/agents/memory-rules.md`. Deux validateurs ajoutés à `scripts/lib/validate-commands.mjs`. TDD sur les validateurs ; contenu éditorial garanti par eux. (Wiring installeur = SP-F.)

**Tech Stack:** Node ESM, `node --test`, zéro dépendance. Markdown + YAML (GitHub Actions).

## Global Constraints

- Node ≥ 20.12, pure ESM, `node --test`, ZERO dépendance. Copy **français**.
- **Mémoire** (pattern Memory Bank) : index petit **toujours chargé** (`@import`) + fichiers détail lazy-load. Catégories `gotchas`/`conventions`/`decisions` + `archive`. Nourrie par règle AGENTS.md + skill `consolidate-memory`. Anti-dump (jamais d'auto-append massif ; vérif-à-la-lecture).
- **Dream** : GitHub Actions `on: schedule` (défaut cron 4h, configurable), **propose-only** — n'édite QUE `docs/DREAM.md`, `allowedTools` limité à `Read`/`git log`/`git diff`/`Edit(docs/DREAM.md)`, et **ne doit PAS** accorder `pull-requests: write` ni `issues: write`. Entrées datées, catégorisées, tag confiance, evidence, cap ≤3/run, dédup, skip-if-quiet.
- Ne pas casser les exports existants de `validate-commands.mjs`.

---

### Task 1 : Validateur mémoire

**Files:**
- Modify: `scripts/lib/validate-commands.mjs` (ajouter un export)
- Test: `scripts/lib/validate-memory.test.mjs`

**Interfaces:**
- Produces: `validateMemoryTemplates(root) -> string[]`. Vérifie que `templates/memory/{index,gotchas,conventions,decisions,archive}.md` et `templates/agents/memory-rules.md` existent, et que `memory-rules.md` référence `index`, `gotchas`, `conventions`, `decisions`, `consolidate-memory`.

- [ ] **Step 1 : Écrire le test qui échoue (fixtures temp)**

```js
// scripts/lib/validate-memory.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateMemoryTemplates } from './validate-commands.mjs';

const MEM = ['index', 'gotchas', 'conventions', 'decisions', 'archive'];
const RULE_REFS = ['index', 'gotchas', 'conventions', 'decisions', 'consolidate-memory'];

function makeRoot({ omitMem = null, omitRules = false, ruleOmitRef = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-'));
  fs.mkdirSync(path.join(root, 'templates/memory'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/agents'), { recursive: true });
  for (const m of MEM) if (m !== omitMem) fs.writeFileSync(path.join(root, `templates/memory/${m}.md`), `# ${m}`);
  if (!omitRules) fs.writeFileSync(path.join(root, 'templates/agents/memory-rules.md'), RULE_REFS.filter(r => r !== ruleOmitRef).join(' '));
  return root;
}

test('complet → aucune erreur', () => {
  assert.deepEqual(validateMemoryTemplates(makeRoot()), []);
});
test('fichier mémoire manquant → erreur', () => {
  assert.ok(validateMemoryTemplates(makeRoot({ omitMem: 'gotchas' })).some(e => /gotchas/.test(e)));
});
test('memory-rules absent → erreur', () => {
  assert.ok(validateMemoryTemplates(makeRoot({ omitRules: true })).some(e => /memory-rules/.test(e)));
});
test('memory-rules ne référence pas consolidate-memory → erreur', () => {
  assert.ok(validateMemoryTemplates(makeRoot({ ruleOmitRef: 'consolidate-memory' })).some(e => /consolidate-memory/.test(e)));
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `node --test scripts/lib/validate-memory.test.mjs`
Expected: FAIL (`validateMemoryTemplates` non exporté). *(nvm noise → `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.)*

- [ ] **Step 3 : Ajouter dans `scripts/lib/validate-commands.mjs`** (à la fin)

```js
export function validateMemoryTemplates(root) {
  const errors = [];
  const mem = ['index', 'gotchas', 'conventions', 'decisions', 'archive'];
  for (const m of mem) if (!fs.existsSync(path.join(root, `templates/memory/${m}.md`))) errors.push(`mémoire : fichier manquant « templates/memory/${m}.md »`);
  const rulesPath = path.join(root, 'templates/agents/memory-rules.md');
  if (!fs.existsSync(rulesPath)) { errors.push('mémoire : manquant templates/agents/memory-rules.md'); return errors; }
  const txt = fs.readFileSync(rulesPath, 'utf8');
  for (const r of ['index', 'gotchas', 'conventions', 'decisions', 'consolidate-memory']) if (!txt.includes(r)) errors.push(`memory-rules : ne référence pas « ${r} »`);
  return errors;
}
```

- [ ] **Step 4 : Lancer → succès** — `node --test scripts/lib/validate-memory.test.mjs` (4 tests PASS).
- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/validate-commands.mjs scripts/lib/validate-memory.test.mjs
git commit -m "feat(memory): validateMemoryTemplates"
```

---

### Task 2 : Templates mémoire + règles

**Files:**
- Create: `templates/memory/index.md`, `gotchas.md`, `conventions.md`, `decisions.md`, `archive.md`
- Create: `templates/agents/memory-rules.md`
- Test: `scripts/lib/memory-templates.test.mjs`

**Interfaces:**
- Consumes: `validateMemoryTemplates` (Task 1).
- Produces: les 6 fichiers. Test d'intégration = `validateMemoryTemplates(REPO_ROOT)` renvoie `[]`.

- [ ] **Step 1 : Test d'intégration (échoue tant que les fichiers manquent)**

```js
// scripts/lib/memory-templates.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMemoryTemplates } from './validate-commands.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
test('templates mémoire cohérents', () => {
  assert.deepEqual(validateMemoryTemplates(ROOT), []);
});
```

- [ ] **Step 2 : Lancer → échec** — `node --test scripts/lib/memory-templates.test.mjs`.

- [ ] **Step 3 : Créer `templates/agents/memory-rules.md`**

```markdown
## Mémoire du projet (anti-oubli)

Le cerveau du projet vit dans `docs/memory/`. **Toujours chargé** : `docs/memory/index.md` (mets `@docs/memory/index.md` en haut de l'`AGENTS.md`). Les fichiers détail se lisent **à la demande**.

- **Nourrir** : dès que tu découvres un piège, une convention, ou une décision non évidente, ajoute UNE ligne au fichier concerné — `gotchas.md` / `conventions.md` / `decisions.md` — au format `- [AAAA-MM-JJ] <quoi> → <règle ou fix>`, + une ligne pointeur dans `index.md` si c'est un nouveau sujet.
- **Charger** : si une tâche touche un sujet listé dans `index.md`, lis le fichier détail correspondant avant d'agir.
- **Consolider** : lance le skill `consolidate-memory` périodiquement — fusionne les doublons, corrige ou archive les entrées obsolètes (déplace vers `archive.md`, ne supprime pas), garde `index.md` < 50 lignes.
- **Anti-dump** : jamais d'ajout massif automatique ; une entrée ancienne se vérifie contre le code actuel avant qu'on s'y fie.
```

- [ ] **Step 4 : Créer `templates/memory/index.md`**

```markdown
# Mémoire — index

> Toujours chargé (via `@docs/memory/index.md`). Une ligne par sujet → pointe vers le fichier détail. Garde ce fichier **court** (< 50 lignes).

Catégories :
- Pièges → `gotchas.md`
- Conventions → `conventions.md`
- Décisions → `decisions.md`
- Archive (obsolète) → `archive.md`

_(Les sujets s'ajoutent au fil du projet.)_
```

- [ ] **Step 5 : Créer les 4 fichiers catégories** (mêmes en-têtes, contenu vide au départ)

`templates/memory/gotchas.md` :
```markdown
# Pièges (gotchas)

> Erreurs à ne pas refaire. Format : `- [AAAA-MM-JJ] <quoi> → <fix/règle>`.
```
`templates/memory/conventions.md` :
```markdown
# Conventions

> Décisions de style/structure du projet. Format : `- [AAAA-MM-JJ] <convention>`.
```
`templates/memory/decisions.md` :
```markdown
# Décisions

> Pourquoi on a choisi X plutôt que Y. Format : `- [AAAA-MM-JJ] <décision> — <raison>`.
```
`templates/memory/archive.md` :
```markdown
# Archive

> Entrées obsolètes déplacées ici lors de la consolidation (jamais supprimées).
```

- [ ] **Step 6 : Lancer → succès** — `node --test scripts/lib/memory-templates.test.mjs`, puis suite complète `node --test`.
- [ ] **Step 7 : Commit**

```bash
git add templates/memory/ templates/agents/memory-rules.md scripts/lib/memory-templates.test.mjs
git commit -m "feat(memory): templates docs/memory + règles AGENTS.md"
```

---

### Task 3 : Validateur dream

**Files:**
- Modify: `scripts/lib/validate-commands.mjs` (ajouter un export)
- Test: `scripts/lib/validate-dream.test.mjs`

**Interfaces:**
- Produces: `validateDreamTemplate(root) -> string[]`. Vérifie `templates/dream/dream.yml` (existe, contient `schedule`+`cron`, `DREAM.md`, `Edit(docs/DREAM.md)`, et **ne contient PAS** `pull-requests: write` ni `issues: write`) et `templates/dream/DREAM.md` (existe).

- [ ] **Step 1 : Écrire le test qui échoue (fixtures temp)**

```js
// scripts/lib/validate-dream.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateDreamTemplate } from './validate-commands.mjs';

function makeRoot({ badPerms = false, omitSeed = false, omitWorkflow = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dream-'));
  fs.mkdirSync(path.join(root, 'templates/dream'), { recursive: true });
  if (!omitWorkflow) {
    let wf = 'on:\n  schedule:\n    - cron: "0 */4 * * *"\npermissions:\n  contents: write\n';
    wf += 'allowedTools Edit(docs/DREAM.md)\n';
    if (badPerms) wf += 'pull-requests: write\n';
    fs.writeFileSync(path.join(root, 'templates/dream/dream.yml'), wf);
  }
  if (!omitSeed) fs.writeFileSync(path.join(root, 'templates/dream/DREAM.md'), '# DREAM');
  return root;
}

test('workflow propose-only complet → aucune erreur', () => {
  assert.deepEqual(validateDreamTemplate(makeRoot()), []);
});
test('permissions PR write → erreur (pas propose-only)', () => {
  assert.ok(validateDreamTemplate(makeRoot({ badPerms: true })).some(e => /propose-only|pull-requests/.test(e)));
});
test('DREAM.md seed manquant → erreur', () => {
  assert.ok(validateDreamTemplate(makeRoot({ omitSeed: true })).some(e => /DREAM\.md/.test(e)));
});
test('workflow manquant → erreur', () => {
  assert.ok(validateDreamTemplate(makeRoot({ omitWorkflow: true })).some(e => /dream\.yml/.test(e)));
});
```

- [ ] **Step 2 : Lancer → échec** — `node --test scripts/lib/validate-dream.test.mjs`.

- [ ] **Step 3 : Ajouter dans `scripts/lib/validate-commands.mjs`** (à la fin)

```js
export function validateDreamTemplate(root) {
  const errors = [];
  const wf = path.join(root, 'templates/dream/dream.yml');
  if (!fs.existsSync(wf)) errors.push('dream : manquant templates/dream/dream.yml');
  else {
    const txt = fs.readFileSync(wf, 'utf8');
    if (!txt.includes('schedule') || !txt.includes('cron')) errors.push('dream : pas de déclencheur schedule/cron');
    if (!txt.includes('Edit(docs/DREAM.md)')) errors.push('dream : allowedTools doit se limiter à Edit(docs/DREAM.md)');
    if (txt.includes('pull-requests: write') || txt.includes('issues: write')) errors.push('dream : NON propose-only (pull-requests/issues write interdit)');
  }
  if (!fs.existsSync(path.join(root, 'templates/dream/DREAM.md'))) errors.push('dream : manquant templates/dream/DREAM.md (seed)');
  return errors;
}
```

- [ ] **Step 4 : Lancer → succès** — `node --test scripts/lib/validate-dream.test.mjs` (4 PASS).
- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/validate-commands.mjs scripts/lib/validate-dream.test.mjs
git commit -m "feat(dream): validateDreamTemplate (propose-only)"
```

---

### Task 4 : Workflow dream + seed DREAM.md

**Files:**
- Create: `templates/dream/dream.yml`
- Create: `templates/dream/DREAM.md`
- Test: `scripts/lib/dream-template.test.mjs`

**Interfaces:**
- Consumes: `validateDreamTemplate` (Task 3).
- Produces: le workflow + le seed. Test d'intégration = `validateDreamTemplate(REPO_ROOT)` renvoie `[]`.

- [ ] **Step 1 : Test d'intégration**

```js
// scripts/lib/dream-template.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDreamTemplate } from './validate-commands.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
test('template dream cohérent (propose-only)', () => {
  assert.deepEqual(validateDreamTemplate(ROOT), []);
});
```

- [ ] **Step 2 : Lancer → échec** — `node --test scripts/lib/dream-template.test.mjs`.

- [ ] **Step 3 : Créer `templates/dream/dream.yml`**

```yaml
name: Dream Agent
on:
  schedule:
    - cron: "0 */4 * * *"   # toutes les 4h (UTC). Pour un petit projet : "0 8 * * *" (1x/jour).
  workflow_dispatch: {}
permissions:
  contents: write   # committer docs/DREAM.md uniquement. PAS de pull-requests/issues write : propose-only.
jobs:
  dream:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Tu es un agent "dream", PROPOSE-ONLY. Lis docs/DREAM.md (l'en-tête donne le dernier commit vu).
            Lance `git log <dernier>..HEAD --stat`. S'il n'y a AUCUN nouveau commit, ne fais rien et sors (skip-if-quiet).
            Sinon, examine les fichiers changés + la structure, puis propose AU PLUS 3 idées nouvelles
            (FEATURE / BUG / TECH-DEBT / UX / SECURITY) : catégorie, confiance (low/medium/high),
            evidence (hash de commit ou file:line), status: proposed. Ne répète RIEN de déjà présent (dédup).
            Ajoute tes entrées datées sous un nouveau titre "## <date>", puis mets à jour l'en-tête
            (last_run, last_commit_seen). N'édite QUE docs/DREAM.md.
          claude_args: "--max-turns 6 --model claude-sonnet-5 --allowedTools Read,Bash(git log:*),Bash(git diff:*),Edit(docs/DREAM.md)"
      - name: Commit proposals
        run: |
          git config user.name "dream-agent[bot]"
          git config user.email "dream-agent@users.noreply.github.com"
          git add docs/DREAM.md
          git diff --cached --quiet || git commit -m "docs: propositions dream $(date -u +%Y-%m-%d)"
          git push
```

- [ ] **Step 4 : Créer `templates/dream/DREAM.md`** (seed)

```markdown
# docs/DREAM.md — propositions de l'agent « dream »

<!-- last_run: never | last_commit_seen: none -->

> Rempli automatiquement par `.github/workflows/dream.yml` (PROPOSE-ONLY : il n'écrit que dans ce fichier, ne merge/commit jamais de code). Toi (humain) tries : passe le `status` d'une entrée à `accepted` / `rejected` / `done`.
>
> **Prérequis** : repo sur GitHub + secret `ANTHROPIC_API_KEY` (Settings → Secrets → Actions). **Coût** : chaque run = un appel API ; pour un petit projet, passe le cron à 1×/jour.

_(vide au départ — les propositions datées s'ajoutent ici)_
```

- [ ] **Step 5 : Lancer → succès** — `node --test scripts/lib/dream-template.test.mjs`, puis suite complète `node --test`.
- [ ] **Step 6 : Commit**

```bash
git add templates/dream/ scripts/lib/dream-template.test.mjs
git commit -m "feat(dream): workflow GitHub Actions propose-only + seed DREAM.md"
```

---

## Notes (hors périmètre)
- **SP-F** copiera : `templates/memory/*` → `docs/memory/` ; `templates/dream/dream.yml` → `.github/workflows/dream.yml` ; `templates/dream/DREAM.md` → `docs/DREAM.md` ; injectera `templates/agents/memory-rules.md` dans l'`AGENTS.md` généré + ajoutera `@docs/memory/index.md` en tête.
