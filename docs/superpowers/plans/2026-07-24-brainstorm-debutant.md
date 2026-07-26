# Brainstorm beginner-friendly (`/new-project` + `/new-feature`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la phase de questions de `/new-project` et `/new-feature` **concrète et digeste pour un débutant** : expliquer d'abord le parcours (ce qu'on fait + ce qu'on obtient), puis poser **peu** de questions, **simples**, avec **exemple** + **pourquoi**, **zéro jargon** dans les questions (le vocabulaire technique reste dans les documents produits).

**Architecture:** Édition de deux runbooks (`templates/commands/new-project.md`, `new-feature.md`) : ajout d'un bloc « parcours à expliquer en premier », reformulation de la phase brainstorm avec des contraintes débutant explicites, clarification des 2 modes. Aucune logique JS — que du contenu de runbook + assertions de test.

**Tech Stack:** Markdown (runbooks) + `node --test` (assertions de contenu).

## Global Constraints

- Tests via `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`.
- **Ne PAS casser les validateurs** : `new-project.md` doit garder le mot isolé **`Brainstorm`** (regex `(^|\s)Brainstorm($|\s)` dans `validateNewProjectCommand`) + tous les marqueurs `DEPTH` ; `new-feature.md` doit garder `brainstorming`, `En tant que`, `Critères d'acceptation`, `Périmètre`.
- Le **jargon** (PRD, personas, JTBD, FR, AC…) reste dans les **documents produits** et les sections de template — **jamais** dans les questions posées à l'utilisateur.
- Français, accents corrects. Jamais « formation »/« accompagnement ».
- Après édition des runbooks : **régénérer** `cursor-plugin/` (ces 2 commandes y sont).

---

## File Structure

- `templates/commands/new-project.md` — bloc « parcours » avant Phase 1 ; Phase 1 reformulée débutant ; modes clarifiés.
- `templates/commands/new-feature.md` — section 1 (brainstorm) reformulée débutant.
- `scripts/lib/brainstorm-beginner.test.mjs` — **créer** : assertions contenu + validateurs verts.
- `cursor-plugin/commands/{new-project,new-feature}.md` — régénérés.
- `package.json` — bump `0.7.0`.

---

## Task 1 : `/new-project` — parcours expliqué + Phase 1 débutant

**Files:**
- Modify: `templates/commands/new-project.md`
- Test: `scripts/lib/brainstorm-beginner.test.mjs`, `scripts/lib/new-project-runbook.test.mjs` (doit rester vert)

**Interfaces:**
- Produces: `new-project.md` contient un bloc « Ce qu'on va faire ensemble », et une Phase 1 avec contraintes débutant (exemple + pourquoi + peu de questions + zéro jargon), tout en gardant le mot `Brainstorm`.

- [ ] **Step 1 : Écrire le test (échoue)**

Crée `scripts/lib/brainstorm-beginner.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNewProjectCommand, validateNewFeatureCommand } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('new-project : parcours expliqué + Phase 1 débutant, validateur vert', () => {
  const t = read('templates/commands/new-project.md');
  assert.match(t, /Ce qu'on va faire ensemble/);
  assert.match(t, /un exemple concret/i);
  assert.match(t, /zéro jargon/i);
  assert.match(t, /langage simple/i);
  assert.match(t, /\bBrainstorm\b/); // le mot isolé requis par le validateur reste présent
  assert.deepEqual(validateNewProjectCommand(ROOT), []);
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/brainstorm-beginner.test.mjs`
Expected : FAIL (marqueurs débutant absents).

- [ ] **Step 3 : Ajouter le bloc « parcours » (avant « ## Mode de travail »)**

Dans `templates/commands/new-project.md`, **juste avant** la ligne `## Mode de travail (demande au début)`, insère :

```md
## D'abord — explique le parcours (à dire à l'utilisateur, EN PREMIER)
Avant toute question, dis-lui en **langage simple** ce qu'on va faire et ce qu'il obtiendra :
> « On va, ensemble : **1)** bien comprendre ton idée (quelques questions simples) · **2)** écrire le **plan** de ton app · **3)** **dessiner les écrans** (maquette) · **4)** en tirer une **feuille de route**. Ensuite `/build` construit, écran par écran. À la fin de cette étape tu auras un **plan clair + un design + une roadmap** — pas encore de code, et c'est normal. »
Puis propose le mode de travail. Garde ce cap : à chaque phase, redis en une phrase **ce que tu fais et ce que ça lui apporte**.

---
```

- [ ] **Step 4 : Clarifier les 2 modes (débutant)**

Remplace le bloc des 2 puces de « ## Mode de travail » par :

```md
- **Rapide** : tu proposes des brouillons d'un coup avec tes suppositions taguées `[HYPOTHÈSE: …]` ; l'utilisateur corrige. **Moins de questions** — bien si l'idée est déjà claire.
- **Coaching** (par défaut) : tu avances **section par section** avec des questions. Plus guidé, mais **plus de questions** — dis-le pour qu'il choisisse en connaissance de cause.
```

- [ ] **Step 5 : Reformuler la Phase 1 (débutant)**

Remplace le bloc actuel :

```md
## Phase 1 — Brainstorm produit (gate)
Invoque `superpowers:brainstorming`. Explore : intention, users/personas, contraintes, périmètre, critères de succès. Pose les questions **une à la fois**. → fais valider avant de continuer.
```

par :

```md
## Phase 1 — Brainstorm : comprendre l'idée (gate)
Invoque `superpowers:brainstorming`, **adapté débutant** :
- **Peu de questions** (vise **4-6 essentielles**), **une à la fois**, en **langage simple**, **zéro jargon** dans la question.
- **Un exemple concret à chaque question** (« ex. : … ») pour qu'il voie ce que tu attends.
- **Le pourquoi** en une demi-ligne (« ça m'aide à … »).
- **Reformule** sa réponse après coup (« donc ton app fait X, pour Y »).
- Si tu peux **deviner**, propose une **hypothèse** (`[HYPOTHÈSE: …]`) au lieu de demander.
- L'essentiel à couvrir : **c'est quoi** l'app · **pour qui** · le **truc principal** qu'elle fait · **2-3 fonctions** must-have · ce que ce **n'est pas** (v1).

Le vocabulaire technique (personas, JTBD, exigences…) va dans le **document** `docs/PRD.md`, **jamais** dans les questions posées. → fais valider avant de continuer.
```

- [ ] **Step 6 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/brainstorm-beginner.test.mjs scripts/lib/new-project-runbook.test.mjs`
Expected : PASS (validateur `new-project` toujours vert : `Brainstorm` présent, DEPTH intacts).

- [ ] **Step 7 : Commit**

```bash
git add templates/commands/new-project.md scripts/lib/brainstorm-beginner.test.mjs
git commit -m "feat(new-project): Phase 1 beginner-friendly — parcours expliqué + questions concrètes (exemple + pourquoi, zéro jargon)"
```

---

## Task 2 : `/new-feature` — brainstorm débutant

**Files:**
- Modify: `templates/commands/new-feature.md`
- Test: `scripts/lib/brainstorm-beginner.test.mjs` (étendre), `scripts/lib/validate-new-feature.test.mjs` (rester vert)

**Interfaces:**
- Produces: `new-feature.md` section 1 avec contraintes débutant, en gardant `brainstorming`, `En tant que`, `Critères d'acceptation`, `Périmètre`.

- [ ] **Step 1 : Étendre le test (échoue)**

Ajoute à `scripts/lib/brainstorm-beginner.test.mjs` :

```js
test('new-feature : brainstorm débutant, validateur vert', () => {
  const t = read('templates/commands/new-feature.md');
  assert.match(t, /langage simple/i);
  assert.match(t, /exemple concret/i);
  assert.match(t, /brainstorming/); // requis par le validateur
  assert.match(t, /Critères d'acceptation/); // template conservé
  assert.deepEqual(validateNewFeatureCommand(ROOT), []);
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/brainstorm-beginner.test.mjs`
Expected : FAIL (marqueurs absents dans new-feature).

- [ ] **Step 3 : Reformuler l'intro de la section 1**

Dans `templates/commands/new-feature.md`, remplace :

```md
### 1. Brainstorm → **Spec de feature** (`superpowers:brainstorming`) — gate
Scopé à la feature, référence `docs/PRD.md` (glossaire, UJ, FR concernés). Pose les questions **une à la fois**. Produis une **spec de feature** avec ce template, puis fais valider :
```

par :

```md
### 1. Brainstorm → **Spec de feature** (`superpowers:brainstorming`) — gate
D'abord, dis en une phrase **ce qu'on va faire** (« on cadre ta feature, puis je la construis et je la teste en vrai »). Puis pose **peu de questions** (2-4), **une à la fois**, en **langage simple**, avec un **exemple concret** à chaque fois et le **pourquoi** ; reformule la réponse. Zéro jargon dans les questions — le vocabulaire (UJ, FR, AC…) reste dans le document. Scopé à la feature, référence `docs/PRD.md`. Produis ensuite une **spec de feature** avec ce template, puis fais valider :
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/brainstorm-beginner.test.mjs scripts/lib/validate-new-feature.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add templates/commands/new-feature.md scripts/lib/brainstorm-beginner.test.mjs
git commit -m "feat(new-feature): brainstorm beginner-friendly — questions concrètes, zéro jargon"
```

---

## Task 3 : Régénérer le plugin + suite + bump 0.7.0

**Files:**
- Modify: `package.json:3`, `cursor-plugin/` (généré)

- [ ] **Step 1 : Régénérer le plugin**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/build-cursor-plugin.mjs`
Expected : `commands/new-project.md` + `commands/new-feature.md` régénérés.

- [ ] **Step 2 : Bump**

`package.json:3` → `"version": "0.7.0",`.

- [ ] **Step 3 : Suite complète → verte**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`
Expected : `# fail 0`.

- [ ] **Step 4 : Vérif — le rendu contient bien le parcours**

```bash
grep -c "Ce qu'on va faire ensemble" templates/commands/new-project.md cursor-plugin/commands/new-project.md
grep -c "exemple concret" templates/commands/new-feature.md
```
Expected : `1` dans chaque fichier new-project (template + plugin), `≥1` dans new-feature.

- [ ] **Step 5 : Commit**

```bash
git add package.json cursor-plugin
git commit -m "chore(new-project): régénère plugin + bump 0.7.0"
```

---

## Self-Review

**1. Spec coverage** — (a) expliquer concrètement ce qu'on fait → Task 1 Step 3 (bloc parcours) + rappel par phase ; (b) moins de questions → Task 1 Step 5 (4-6) + Task 2 (2-4) ; (c) questions concrètes avec exemple + pourquoi → Tasks 1/2 ; (d) zéro jargon dans les questions, jargon dans les docs → Tasks 1/2 ; (e) même traitement `/new-feature` → Task 2. ✅

**2. Placeholder scan** — aucun « TBD » ; chaque step donne le texte avant/après exact.

**3. Non-régression validateurs** — Task 1 garde le mot **`Brainstorm`** (titre « Phase 1 — Brainstorm : comprendre l'idée ») et ne touche pas les marqueurs DEPTH (PRD/archi inchangés) → `validateNewProjectCommand` reste vert (assert dans le test). Task 2 garde `brainstorming` + `En tant que`/`Critères d'acceptation`/`Périmètre` (template de spec inchangé) → `validateNewFeatureCommand` reste vert. Les deux validateurs sont assertés `=== []` dans le test.

**4. Type consistency** — pas de code JS ; seules des assertions de contenu (`assert.match`) + appels validateurs existants.
