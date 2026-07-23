# shadcnblocks via le registry natif shadcn — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'approche shadcnblocks périmée du kit (skill payant `masonjames/Shadcnblocks-Skill` + clé API + `jq`) par le **registry natif shadcn** (`npx shadcn add @shadcnblocks/<bloc>`), où les blocs gratuits s'installent **sans clé** et seul le pro exige `SHADCNBLOCKS_API_KEY`.

**Architecture:** shadcnblocks n'est **pas** un skill de connaissance design — c'est une **source de blocs** via un registry namespacé du CLI shadcn. On ramène donc les « skills design » à **4** (frontend-design, ui-ux-pro-max, web-design-guidelines, brand-guidelines) et on documente shadcnblocks comme une **technique CLI** : registry `@shadcnblocks` ajouté à `components.json` au scaffold (Phase 7), puis `npx shadcn add @shadcnblocks/<bloc>`. Concerne les stacks avec shadcn : **saas, desktop, vitrine** (mobile = pas de shadcn, intouché).

**Tech Stack:** Node ESM (zéro dépendance), `node --test`. Templates Markdown + constantes JS dans `scripts/lib/`. CLI shadcn (registry namespacé, `components.json`).

## Global Constraints

- Node ESM, **zéro dépendance runtime**. Tests via `node --test` (binaire : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`).
- Fichiers générés : **jamais** les mots « formation » / « accompagnement ».
- Français, **accents corrects** partout.
- shadcnblocks ne concerne **que** saas · desktop · vitrine. **Ne pas** toucher la stack mobile.
- Registry exact (verbatim) : `{ "registries": { "@shadcnblocks": { "url": "https://www.shadcnblocks.com/r/{name}", "headers": { "Authorization": "Bearer ${SHADCNBLOCKS_API_KEY}" } } } }`.
- Après édition d'un template de commande (`new-project.md`, `edit-design.md`) : **régénérer** `cursor-plugin/` (`node scripts/build-cursor-plugin.mjs`).
- Le mot **`shadcnblocks`** reste présent dans `docs/A-FAIRE.md` (le test `setup-ai.test.mjs` l'exige) — la réécriture de `SHADCN_NOTE` le conserve.

---

## File Structure

- `scripts/lib/matrix.mjs` — `DESIGN_SKILLS` (retirer shadcnblocks), commentaire l.197, `SHADCN_NOTE` (réécrire).
- `scripts/lib/matrix-manifest.test.mjs` — remplacer le test « DESIGN_SKILLS 5 skills » ; importer + tester `SHADCN_NOTE`.
- `scripts/lib/validate-commands.mjs` — `validateEditDesignCommand` skills[] (4) ; `DEPTH` (+`@shadcnblocks`).
- `scripts/lib/validate-commands.test.mjs` — copie `DEPTH` (+`@shadcnblocks`).
- `scripts/lib/validate-edit-design.test.mjs` — `SKILLS` (4) + test `omitSkill`.
- `scripts/lib/agents-templates.test.mjs` — test `design-rule` (4 skills + `@shadcnblocks`).
- `templates/agents/design-rule.md` — 4 skills + ligne blocs shadcnblocks CLI.
- `templates/commands/new-project.md` — Phase 5 (2× « 5 skills »→4 ; Étape 2 blocs CLI) ; Phase 7 (registry `components.json`).
- `templates/commands/edit-design.md` — 4 skills + ligne blocs shadcnblocks CLI.
- `templates/env/saas.env.example`, `templates/env/desktop.env.example`, `templates/env/vitrine.env.example` — `SHADCNBLOCKS_API_KEY=`.
- `scripts/lib/env-shadcnblocks.test.mjs` — **créer** (assert clé optionnelle dans les 3 env).
- `cursor-plugin/commands/*` — régénéré.
- `package.json` — bump `0.4.7`.

---

## Task 1 : `matrix.mjs` — 4 skills design + `SHADCN_NOTE` registry natif

**Files:**
- Modify: `scripts/lib/matrix.mjs:7`, `scripts/lib/matrix.mjs:197`, `scripts/lib/matrix.mjs:204`
- Test: `scripts/lib/matrix-manifest.test.mjs:1` (import), `scripts/lib/matrix-manifest.test.mjs:89-92`

**Interfaces:**
- Produces: `DESIGN_SKILLS` (string, 4 skills, sans shadcnblocks) ; `SHADCN_NOTE` (string, mentionne `@shadcnblocks`, `shadcn add`, `SHADCNBLOCKS_API_KEY`, **sans** `masonjames`/`payante`).
- Consumes (inchangé) : `SHADCN_NOTE` importé par `environment.mjs:3` et rendu par `setup-ai.mjs:50`.

- [ ] **Step 1 : Réécrire le test DESIGN_SKILLS + ajouter le test SHADCN_NOTE (échoue)**

Dans `scripts/lib/matrix-manifest.test.mjs`, remplace le bloc actuel :

```js
test('DESIGN_SKILLS liste les 5 skills design', () => {
  assert.match(DESIGN_SKILLS, /frontend-design/);
  assert.match(DESIGN_SKILLS, /shadcnblocks/);
});
```

par :

```js
test('DESIGN_SKILLS = 4 skills design (shadcnblocks n\'est PAS un skill : registry CLI)', () => {
  assert.match(DESIGN_SKILLS, /frontend-design/);
  assert.match(DESIGN_SKILLS, /brand-guidelines/);
  assert.doesNotMatch(DESIGN_SKILLS, /shadcnblocks/);
  assert.equal(DESIGN_SKILLS.split(',').length, 4);
});

test('SHADCN_NOTE : registry natif @shadcnblocks (gratuit sans clé, pro via env)', () => {
  assert.match(SHADCN_NOTE, /@shadcnblocks/);
  assert.match(SHADCN_NOTE, /shadcn add/);
  assert.match(SHADCN_NOTE, /SHADCNBLOCKS_API_KEY/);
  assert.doesNotMatch(SHADCN_NOTE, /masonjames|payante/i);
});
```

Et ajoute `SHADCN_NOTE` à l'import en tête du fichier (repère la ligne `import { ... } from './matrix.mjs';` et ajoute `SHADCN_NOTE`).

- [ ] **Step 2 : Lancer le test → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/matrix-manifest.test.mjs`
Expected : FAIL (`DESIGN_SKILLS` contient encore `shadcnblocks` / `SHADCN_NOTE` contient `masonjames`).

- [ ] **Step 3 : Mettre à jour `matrix.mjs`**

`scripts/lib/matrix.mjs:7` — remplace :

```js
export const DESIGN_SKILLS = 'frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines';
```

par :

```js
export const DESIGN_SKILLS = 'frontend-design, ui-ux-pro-max, web-design-guidelines, brand-guidelines';
```

`scripts/lib/matrix.mjs:197` (commentaire) — remplace :

```js
// Skills design auto-installables (headless) via le CLI skills. shadcnblocks à part (clé payante).
```

par :

```js
// Skills design auto-installables (headless) via le CLI skills. Les blocs shadcnblocks ne sont PAS un skill :
// ils s'ajoutent via le registry natif du CLI shadcn (voir SHADCN_NOTE + /new-project Phase 7).
```

`scripts/lib/matrix.mjs:204` — remplace :

```js
export const SHADCN_NOTE = 'shadcnblocks (optionnel) : `npx -y skills add masonjames/Shadcnblocks-Skill -a <assistant> --yes` — nécessite une clé API ShadcnBlocks (payante) + `jq` pour récupérer des blocs.';
```

par :

```js
export const SHADCN_NOTE = 'Blocs pré-faits **shadcnblocks** via le CLI shadcn natif : `npx shadcn add @shadcnblocks/<bloc>` (ex. `@shadcnblocks/hero125`). Le registry `@shadcnblocks` est ajouté à `components.json` au scaffold (voir /new-project Phase 7). Blocs **gratuits sans clé** ; pour les blocs **pro**, mets `SHADCNBLOCKS_API_KEY` dans `.env`.';
```

- [ ] **Step 4 : Lancer le test → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/matrix-manifest.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/matrix.mjs scripts/lib/matrix-manifest.test.mjs
git commit -m "refactor(shadcnblocks): DESIGN_SKILLS=4 + SHADCN_NOTE registry natif (plus de skill payant)"
```

---

## Task 2 : Validators edit-design — 4 skills

**Files:**
- Modify: `scripts/lib/validate-commands.mjs:28`
- Test: `scripts/lib/validate-edit-design.test.mjs:8`, `scripts/lib/validate-edit-design.test.mjs:24-26`

**Interfaces:**
- Consumes: `validateEditDesignCommand(root)` — vérifie que `edit-design.md` cite chaque skill de `skills[]`.
- Produces: `skills[]` = 4 (sans shadcnblocks).

- [ ] **Step 1 : Mettre à jour le test (échoue)**

`scripts/lib/validate-edit-design.test.mjs:8` — remplace :

```js
const SKILLS = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'shadcnblocks', 'brand-guidelines'];
```

par :

```js
const SKILLS = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'brand-guidelines'];
```

Et le test `omitSkill` (repère `omitSkill: 'shadcnblocks'`) — remplace :

```js
test('skill manquant → erreur', () => {
  assert.ok(validateEditDesignCommand(makeRoot({ omitSkill: 'shadcnblocks' })).some(e => /shadcnblocks/.test(e)));
});
```

par :

```js
test('skill manquant → erreur', () => {
  assert.ok(validateEditDesignCommand(makeRoot({ omitSkill: 'brand-guidelines' })).some(e => /brand-guidelines/.test(e)));
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/validate-edit-design.test.mjs`
Expected : FAIL (le validateur exige encore `shadcnblocks` que le runbook synthétique ne contient plus).

- [ ] **Step 3 : Mettre à jour le validateur**

`scripts/lib/validate-commands.mjs:28` — remplace :

```js
  const skills = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'shadcnblocks', 'brand-guidelines'];
```

par :

```js
  const skills = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'brand-guidelines'];
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/validate-edit-design.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/validate-commands.mjs scripts/lib/validate-edit-design.test.mjs
git commit -m "refactor(shadcnblocks): validateur edit-design = 4 skills design"
```

---

## Task 3 : Règle design + runbooks (design-rule, new-project Phase 5+7, edit-design)

**Files:**
- Modify: `templates/agents/design-rule.md:5`, `templates/commands/new-project.md` (Phase 5 : 2 occurrences « 5 skills » + Étape 2 ; Phase 7), `templates/commands/edit-design.md:8`
- Modify: `scripts/lib/validate-commands.mjs` (`DEPTH` +`@shadcnblocks`), `scripts/lib/validate-commands.test.mjs` (copie `DEPTH`)
- Test: `scripts/lib/agents-templates.test.mjs:17-22`, `scripts/lib/new-project-runbook.test.mjs`

**Interfaces:**
- Produces: `new-project.md` contient `@shadcnblocks` **et** le bloc `components.json` registry (Phase 7) ; `design-rule.md` liste 4 skills + une ligne `@shadcnblocks`.
- Consumes: `validateNewProjectCommand` (DEPTH inclut désormais `@shadcnblocks`).

- [ ] **Step 1 : Test `design-rule` (échoue)**

`scripts/lib/agents-templates.test.mjs` — remplace le test existant :

```js
test('design-rule : les 5 skills design + design.md', () => {
  const t = read('templates/agents/design-rule.md');
  for (const s of ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'shadcnblocks', 'brand-guidelines', 'design.md']) {
    assert.match(t, new RegExp(s.replace(/[-.]/g, '\\$&')));
  }
});
```

par :

```js
test('design-rule : 4 skills design + design.md + blocs @shadcnblocks via CLI', () => {
  const t = read('templates/agents/design-rule.md');
  for (const s of ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'brand-guidelines', 'design.md', '@shadcnblocks']) {
    assert.match(t, new RegExp(s.replace(/[-.]/g, '\\$&')));
  }
});
```

- [ ] **Step 2 : Test runbook new-project `@shadcnblocks` (échoue)**

Ajoute `'@shadcnblocks'` au tableau `DEPTH` **dans les deux fichiers** :
- `scripts/lib/validate-commands.mjs` (const `DEPTH`, ligne ~9) : ajoute `'@shadcnblocks'` en fin de tableau.
- `scripts/lib/validate-commands.test.mjs` (const `DEPTH`, ligne ~11) : ajoute `'@shadcnblocks'` **à l'identique** (le fixture synthétique doit rester valide).

- [ ] **Step 3 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs scripts/lib/new-project-runbook.test.mjs scripts/lib/validate-commands.test.mjs`
Expected : FAIL (`design-rule.md` cite encore shadcnblocks comme skill / `new-project.md` ne contient pas `@shadcnblocks`).

- [ ] **Step 4 : `design-rule.md`**

`templates/agents/design-rule.md:5` — remplace :

```md
1. Charge les **5 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`.
```

par :

```md
1. Charge les **4 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`.
```

Puis, juste après la ligne 3 (« Édite en respectant ce contexte… ») insère une ligne :

```md
Pour des **sections/pages** vite faites : pioche des **blocs pré-faits shadcnblocks** via le CLI shadcn — `npx shadcn add @shadcnblocks/<bloc>` (gratuits **sans clé** ; `SHADCNBLOCKS_API_KEY` pour le pro) — puis adapte-les à `docs/design.md`. Ce n'est **pas** un skill à charger.
```

- [ ] **Step 5 : `new-project.md` Phase 5 (2 occurrences « 5 skills »)**

Occurrence A — remplace :

```md
Charge les **5 skills design** (`frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`) + le skill **`design-md`**.
```

par :

```md
Charge les **4 skills design** (`frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`) + le skill **`design-md`**.
```

Occurrence B — remplace :

```md
   - **charge les skills design** → voir **`AGENTS.md` → section « Règle design »** (la liste de référence : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`) ;
```

par :

```md
   - **charge les skills design** → voir **`AGENTS.md` → section « Règle design »** (la liste de référence : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`) ;
```

- [ ] **Step 6 : `new-project.md` Phase 5 Étape 2 — blocs shadcnblocks**

Repère, dans l'Étape 2 (cas c), la puce « produit **sa page** calquée shadcn/ui … → écrit `maquette/parts/<ecran>.html` ; » et ajoute **juste après** (même niveau de puce) :

```md
   - pour aller vite : pioche des **blocs pré-faits** `npx shadcn add @shadcnblocks/<bloc>` (gratuits sans clé), puis adapte-les au preset ;
```

- [ ] **Step 7 : `new-project.md` Phase 7 — registry `components.json`**

Repère la Phase 7 point 1 (scaffold). Ajoute, **après** la ligne des scaffolds shadcn (juste avant le « **mobile** : … NativeWind »), un sous-point :

```md
   - **Blocs shadcnblocks** (saas / desktop / vitrine) : après `shadcn init`, ajoute le registry à **`components.json`** (fusionne, n'écrase pas) —
     ```json
     { "registries": { "@shadcnblocks": { "url": "https://www.shadcnblocks.com/r/{name}", "headers": { "Authorization": "Bearer ${SHADCNBLOCKS_API_KEY}" } } } }
     ```
     puis `npx shadcn add @shadcnblocks/<bloc>` fonctionne (gratuits **sans clé** ; `SHADCNBLOCKS_API_KEY` dans `.env` pour le pro).
```

- [ ] **Step 8 : `edit-design.md`**

`templates/commands/edit-design.md:8` — remplace :

```md
1. Charge les **5 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`.
```

par :

```md
1. Charge les **4 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`. Besoin d'une section entière ? Pioche un **bloc pré-fait** : `npx shadcn add @shadcnblocks/<bloc>` (gratuit sans clé ; `SHADCNBLOCKS_API_KEY` pour le pro), puis adapte-le à `docs/design.md`.
```

- [ ] **Step 9 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs scripts/lib/new-project-runbook.test.mjs scripts/lib/validate-commands.test.mjs scripts/lib/validate-edit-design.test.mjs`
Expected : PASS.

- [ ] **Step 10 : Commit**

```bash
git add templates/agents/design-rule.md templates/commands/new-project.md templates/commands/edit-design.md scripts/lib/validate-commands.mjs scripts/lib/validate-commands.test.mjs scripts/lib/agents-templates.test.mjs
git commit -m "feat(shadcnblocks): blocs via npx shadcn add @shadcnblocks (registry Phase 7) — 4 skills design"
```

---

## Task 4 : `.env.example` — `SHADCNBLOCKS_API_KEY` (pro, optionnel)

**Files:**
- Modify: `templates/env/saas.env.example`, `templates/env/desktop.env.example`, `templates/env/vitrine.env.example`
- Test: `scripts/lib/env-shadcnblocks.test.mjs` (créer)

**Interfaces:**
- Produces: chaque env des stacks shadcn contient `SHADCNBLOCKS_API_KEY=` avec commentaire « optionnel / pro ».

- [ ] **Step 1 : Créer le test (échoue)**

Crée `scripts/lib/env-shadcnblocks.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('stacks shadcn : SHADCNBLOCKS_API_KEY (pro, optionnel) dans .env.example', () => {
  for (const s of ['saas', 'desktop', 'vitrine']) {
    assert.match(read(`templates/env/${s}.env.example`), /SHADCNBLOCKS_API_KEY=/, `${s} : clé shadcnblocks manquante`);
  }
  // mobile n'a pas shadcn → pas de clé
  assert.doesNotMatch(read('templates/env/mobile.env.example'), /SHADCNBLOCKS_API_KEY/);
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/env-shadcnblocks.test.mjs`
Expected : FAIL (clé absente des 3 env).

- [ ] **Step 3 : Ajouter la clé aux 3 env**

Ajoute ce bloc **à la fin** de `templates/env/saas.env.example`, `templates/env/desktop.env.example` et `templates/env/vitrine.env.example` :

```
# shadcnblocks — blocs pré-faits PRO (optionnel ; les blocs gratuits marchent SANS clé)
# npx shadcn add @shadcnblocks/<bloc>   (registry @shadcnblocks configuré dans components.json)
SHADCNBLOCKS_API_KEY=
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/env-shadcnblocks.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add templates/env/saas.env.example templates/env/desktop.env.example templates/env/vitrine.env.example scripts/lib/env-shadcnblocks.test.mjs
git commit -m "feat(shadcnblocks): SHADCNBLOCKS_API_KEY optionnel (pro) dans .env des stacks shadcn"
```

---

## Task 5 : Régénérer le plugin + suite complète + scaffold réel + bump 0.4.7

**Files:**
- Modify: `cursor-plugin/` (généré), `package.json:3`

**Interfaces:**
- Consumes: tous les templates modifiés (Tasks 1-4).
- Produces: `cursor-plugin/commands/*` à jour ; `package.json` version `0.4.7`.

- [ ] **Step 1 : Régénérer le cursor-plugin**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/build-cursor-plugin.mjs`
Expected : liste des fichiers copiés (dont `commands/new-project.md`).

- [ ] **Step 2 : Bump version**

`package.json:3` — remplace `"version": "0.4.6",` par `"version": "0.4.7",`.

- [ ] **Step 3 : Suite complète → verte**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`
Expected : `# fail 0` (≈190 tests).

- [ ] **Step 4 : Vérification par scaffold réel (saas)**

```bash
T=/private/tmp/shadcnblocks-check; rm -rf "$T"
/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/setup.mjs "$T" --stack saas --assistant claude-code --no-skills --yes
grep -n "@shadcnblocks" "$T/docs/A-FAIRE.md"        # SHADCN_NOTE registry natif rendu
grep -n "SHADCNBLOCKS_API_KEY" "$T/.env.example"    # clé pro optionnelle présente
grep -c "5 skills design" "$T/AGENTS.md"            # doit être 0 (plus de « 5 skills »)
```
Expected : `@shadcnblocks` présent dans A-FAIRE, `SHADCNBLOCKS_API_KEY` dans `.env.example`, `0` occurrence de « 5 skills design ».

- [ ] **Step 5 : Commit**

```bash
git add cursor-plugin package.json
git commit -m "chore(shadcnblocks): régénère cursor-plugin + bump 0.4.7"
```

---

## Self-Review

**1. Spec coverage** — les 4 points annoncés à l'utilisateur :
- (1) Phase 7 registry `components.json` → Task 3 Step 7. ✅
- (2) Phase 5 / design-rule « pioche des blocs via `shadcn add` » → Task 3 Steps 4-6-8. ✅
- (3) Remplacer `SHADCN_NOTE` (plus de clé payante/jq) → Task 1 Step 3. ✅
- (4) Clarifier « 5 skills » → « 4 skills » → Tasks 1-2-3. ✅
- Bonus `.env` clé pro → Task 4. ✅

**2. Placeholder scan** — aucun « TBD/TODO » ; chaque step contient l'ancien et le nouveau texte exact. ✅

**3. Type consistency** — `SHADCN_NOTE` : Task 1 le fait mentionner `@shadcnblocks`, `shadcn add`, `SHADCNBLOCKS_API_KEY`, sans `masonjames`/`payante` (test Task 1) — cohérent avec `.env` (Task 4) et Phase 7 (Task 3). `DEPTH` ajouté dans **les deux** copies (validateur + test). Le mot `shadcnblocks` survit dans `A-FAIRE` (via `SHADCN_NOTE`) → `setup-ai.test.mjs` reste vert. Registry JSON identique partout (Global Constraints). ✅

**4. Ordre** — Tasks 1→2→3 (constantes/validateurs avant contenus) ; Task 5 régénère + bump en dernier. Chaque task est indépendamment testable et committable.
