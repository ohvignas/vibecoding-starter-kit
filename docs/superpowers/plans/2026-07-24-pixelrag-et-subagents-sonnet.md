# PixelRAG (cohérence maquette↔page, obligatoire UI web) + sous-agents sur Sonnet 5 — Implementation Plan

> ⛔️ **PLAN EXÉCUTÉ ET PÉRIMÉ — NE PAS REJOUER.** Archive gardée pour la trace. Ses 22 cases `- [ ]` n'ont jamais été cochées et **ne doivent pas l'être** : il rend **PixelRAG obligatoire** dans la Règle de vérification (`:29`, `:160`), alors que la comparaison d'images y est depuis un **signal indicatif, non bloquant** (`templates/agents/verify-rule.md:11`, gardé par `standing-rules.test.mjs` B2 et `crew.test.mjs` C5). L'état courant fait foi : `templates/` et `docs/superpowers/plans/2026-07-27-remise-en-coherence.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Forcer une **vérification de cohérence visuelle maquette↔page via PixelRAG** à chaque page/élément UI créé ou modifié **et** au contrôle complet, sur les stacks web (saas/desktop/vitrine). (2) Faire tourner **tous les sous-agents dispatchés sur `claude-sonnet-5`**, les sous-agents design chargeant en plus les skills design.

**Architecture:** Édition de règles standing + runbooks (`verify-rule.md`, `subagents-rule.md`, `new-project.md` Phase 5, `edit-design.md`) + un prérequis outil rendu dans `docs/A-FAIRE.md` (PixelRAG = CLI Python `pixelshot`/`pixelrag`, pas un MCP). PixelRAG rend page générée + écran maquette en screenshots et compare la similarité visuelle. Mobile exclu (RN, pas de rendu HTML/Chrome).

**Tech Stack:** Markdown (règles/runbooks) + constantes/rendu JS (`matrix.mjs`, `setup-ai.mjs`) + `node --test`.

## Global Constraints

- Tests via `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`.
- **Ne casse pas** : `agents-templates.test` (verify-rule/subagents-rule) exige déjà des sous-chaînes — les garder. Les validateurs new-project/new-feature restent verts.
- PixelRAG : **UI web uniquement** (`saas`, `desktop`, `vitrine`). **Jamais** sur `mobile` (React Native).
- Modèle sous-agents : chaîne exacte **`claude-sonnet-5`**.
- Français, accents corrects. Jamais « formation »/« accompagnement ».
- Après édition de runbooks de commande : régénérer `cursor-plugin/`.
- PixelRAG n'est **pas** un MCP → ne PAS l'ajouter à `STACKS[].mcp`. C'est un **prérequis outil** (pip) rendu dans A-FAIRE + une étape dans la Règle de vérification.

---

## File Structure

- `scripts/lib/matrix.mjs` — `PIXELRAG_NOTE` (const) + `VISUAL_CHECK_STACKS` (liste web).
- `scripts/lib/setup-ai.mjs` — rend la section PixelRAG dans A-FAIRE si `stack ∈ VISUAL_CHECK_STACKS`.
- `templates/agents/verify-rule.md` — étape « cohérence visuelle vs maquette (PixelRAG, obligatoire web) ».
- `templates/agents/subagents-rule.md` — « Modèle : claude-sonnet-5 » pour tous les sous-agents + design charge les skills design.
- `templates/commands/new-project.md` (Phase 5 Étape 2) + `templates/commands/edit-design.md` — pointent vers la vérif PixelRAG + sous-agents design sur Sonnet 5.
- Tests : `scripts/lib/setup-ai.test.mjs`, `scripts/lib/agents-templates.test.mjs`, `scripts/lib/pixelrag.test.mjs` (créer).
- `cursor-plugin/` régénéré ; `package.json` bump `0.8.0`.

---

## Task 1 : Sous-agents sur `claude-sonnet-5` (+ design charge les skills)

**Files:**
- Modify: `templates/agents/subagents-rule.md`
- Test: `scripts/lib/agents-templates.test.mjs`

**Interfaces:**
- Produces: `subagents-rule.md` mentionne `claude-sonnet-5` (modèle de tous les sous-agents) + design sub-agents chargent les skills design.

- [ ] **Step 1 : Test (échoue)**

Dans `scripts/lib/agents-templates.test.mjs`, remplace le test `subagents-rule` par :

```js
test('subagents-rule : quand déléguer + contrat + parallèle + modèle sonnet 5', () => {
  const t = read('templates/agents/subagents-rule.md');
  for (const s of ['subagent-driven-development', 'parallèle', 'contexte frais', 'artefact', 'Règle design', 'claude-sonnet-5']) {
    assert.match(t, new RegExp(s));
  }
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs`
Expected : FAIL (`claude-sonnet-5` absent).

- [ ] **Step 3 : Éditer `subagents-rule.md`**

Dans la section « ### Comment créer un sous-agent (le contrat) », ajoute un point **en tête** de la liste (avant « 1. Sa tâche ») :

```md
0. **Modèle** : dispatche **tous** les sous-agents sur **`claude-sonnet-5`** (Claude Code : paramètre `model` du sous-agent ; Cursor : sélectionne Sonnet 5). Les sous-agents **design** (maquette, UI) chargent **en plus** les skills design (voir « Règle design »).
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add templates/agents/subagents-rule.md scripts/lib/agents-templates.test.mjs
git commit -m "feat(subagents): tous les sous-agents sur claude-sonnet-5 (design charge les skills design)"
```

---

## Task 2 : PixelRAG en prérequis A-FAIRE (UI web)

**Files:**
- Modify: `scripts/lib/matrix.mjs` (`PIXELRAG_NOTE` + `VISUAL_CHECK_STACKS`), `scripts/lib/setup-ai.mjs` (rendu conditionnel)
- Test: `scripts/lib/pixelrag.test.mjs` (créer), `scripts/lib/setup-ai.test.mjs`

**Interfaces:**
- Produces: `PIXELRAG_NOTE` (string, install + usage) ; `VISUAL_CHECK_STACKS = ['saas','desktop','vitrine']` ; A-FAIRE contient la section PixelRAG **ssi** stack web.

- [ ] **Step 1 : Test (échoue)**

Crée `scripts/lib/pixelrag.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSetupAi } from './setup-ai.mjs';
import { resolveStackManifest, VISUAL_CHECK_STACKS } from './matrix.mjs';

const call = (stack) => renderSetupAi({ stack, assistant: 'cursor', manifest: resolveStackManifest(stack, 'cursor'), superpowersCmd: 'x', shadcnNote: 'y', skillsInstalled: true });

test('PixelRAG rendu dans A-FAIRE pour les stacks web, PAS mobile', () => {
  assert.deepEqual(VISUAL_CHECK_STACKS, ['saas', 'desktop', 'vitrine']);
  for (const s of VISUAL_CHECK_STACKS) {
    assert.match(call(s), /PixelRAG/, `${s} doit avoir PixelRAG`);
    assert.match(call(s), /pip install pixelrag/);
  }
  assert.doesNotMatch(call('mobile'), /PixelRAG/, 'mobile = RN, pas de PixelRAG');
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/pixelrag.test.mjs`
Expected : FAIL (`VISUAL_CHECK_STACKS`/rendu absents).

- [ ] **Step 3 : `matrix.mjs` — constantes**

Ajoute (près de `SHADCN_NOTE`, en fin de fichier) :

```js
// Stacks à UI web (rendu HTML/Chrome) → vérif de cohérence visuelle maquette↔page par PixelRAG.
// Mobile exclu (React Native, pas de rendu Chrome).
export const VISUAL_CHECK_STACKS = ['saas', 'desktop', 'vitrine'];

export const PIXELRAG_NOTE = 'PixelRAG (vérif visuelle maquette↔page — OBLIGATOIRE UI web) : `pip install pixelrag` (Python 3.10+) + Chrome. À chaque page/élément et au contrôle complet, l\'agent rend la page générée ET l\'écran de `maquette/` avec `pixelshot`, puis compare la similarité visuelle → corrige si écart. Claude Code : skill `pixelbrowse`.';
```

- [ ] **Step 4 : `setup-ai.mjs` — rendu conditionnel**

En tête, importe : `import { DESIGN_SKILL_SPECS, STITCH, VISUAL_CHECK_STACKS, PIXELRAG_NOTE } from './matrix.mjs';` (ajoute les 2 nouveaux à l'import existant). Puis, **après** la section `## 5. Design` (avant `## 6. Scripts…`), insère :

```js
  if (VISUAL_CHECK_STACKS.includes(stack)) {
    L.push('### Vérif visuelle — PixelRAG (obligatoire UI web)');
    L.push(`- [ ] ${PIXELRAG_NOTE}`);
    L.push('');
  }
```

- [ ] **Step 5 : Lancer → passe (+ setup-ai.test toujours vert)**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/pixelrag.test.mjs scripts/lib/setup-ai.test.mjs`
Expected : PASS.

- [ ] **Step 6 : Commit**

```bash
git add scripts/lib/matrix.mjs scripts/lib/setup-ai.mjs scripts/lib/pixelrag.test.mjs
git commit -m "feat(pixelrag): prérequis PixelRAG dans A-FAIRE pour les stacks web (vérif visuelle maquette↔page)"
```

---

## Task 3 : PixelRAG obligatoire dans la Règle de vérification + Phase 5 + edit-design

**Files:**
- Modify: `templates/agents/verify-rule.md`, `templates/commands/new-project.md` (Phase 5 Étape 2), `templates/commands/edit-design.md`
- Test: `scripts/lib/agents-templates.test.mjs`

**Interfaces:**
- Produces: `verify-rule.md` contient une étape PixelRAG obligatoire (web) ; Phase 5 + edit-design la référencent.

- [ ] **Step 1 : Test (échoue)**

Dans `scripts/lib/agents-templates.test.mjs`, au test `verify-rule`, ajoute `'PixelRAG'` à la liste des sous-chaînes attendues.

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs`
Expected : FAIL.

- [ ] **Step 3 : `verify-rule.md` — étape cohérence visuelle**

Insère, **avant** l'étape « 4. Cassé ? » (donc en nouvelle étape 4, renumérote « Cassé ? » en 5) :

```md
**4. Cohérence visuelle vs maquette — OBLIGATOIRE (stacks web : saas/desktop/vitrine)** — l'IA lit mal la maquette et dérive. À **chaque** page/élément créé ou modifié **et** au **contrôle complet** de l'app : vérifie que le rendu colle à l'écran de `maquette/` avec **PixelRAG** — `pixelshot <page-générée>` + `pixelshot <écran-maquette>`, puis compare la similarité visuelle (Claude Code : skill `pixelbrowse`). **Écart → corrige avant de continuer.** (Mobile : compare l'écran du simulateur à la maquette, PixelRAG ne s'applique pas.)
```

- [ ] **Step 4 : Phase 5 (new-project) + edit-design → pointeur**

`templates/commands/new-project.md` Phase 5 Étape 2 : dans la puce « auto-vérifie » du sous-agent, ajoute : « + **cohérence PixelRAG** vs l'écran maquette (voir « Règle de vérification ») ».

`templates/commands/edit-design.md` : à l'étape de re-screenshot/vérif finale, ajoute une phrase : « Sur stack web, vérifie la **cohérence PixelRAG** entre le rendu et `maquette/` avant de conclure. »

- [ ] **Step 5 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs scripts/lib/new-project-runbook.test.mjs scripts/lib/edit-design-runbook.test.mjs`
Expected : PASS.

- [ ] **Step 6 : Commit**

```bash
git add templates/agents/verify-rule.md templates/commands/new-project.md templates/commands/edit-design.md scripts/lib/agents-templates.test.mjs
git commit -m "feat(pixelrag): vérif cohérence maquette↔page OBLIGATOIRE (verify-rule + Phase 5 + edit-design)"
```

---

## Task 4 : Régénérer le plugin + suite + bump 0.8.0 + vérif réelle

**Files:**
- Modify: `package.json:3`, `cursor-plugin/`

- [ ] **Step 1 : Régénérer le plugin**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/build-cursor-plugin.mjs`

- [ ] **Step 2 : Bump** — `package.json:3` → `"version": "0.8.0",`.

- [ ] **Step 3 : Suite complète → verte**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`
Expected : `# fail 0`.

- [ ] **Step 4 : Vérif réelle (scaffold web vs mobile)**

```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
for S in saas mobile; do
  T=/private/tmp/px-$S; rm -rf "$T"
  $N scripts/setup.mjs "$T" --stack $S --assistant claude-code --no-skills --yes >/dev/null 2>&1
  echo "$S — PixelRAG dans A-FAIRE : $(grep -c PixelRAG "$T/docs/A-FAIRE.md")"
  echo "$S — sonnet-5 + PixelRAG dans AGENTS.md : $(grep -c 'claude-sonnet-5' "$T/AGENTS.md") / $(grep -c 'PixelRAG' "$T/AGENTS.md")"
done
```
Expected : saas → PixelRAG A-FAIRE **1+**, mobile → **0** ; les deux → `claude-sonnet-5` **1+** et `PixelRAG` **1+** dans AGENTS.md (les règles standing sont posées quelle que soit la stack ; seul le prérequis A-FAIRE est web-only).

- [ ] **Step 5 : Commit**

```bash
git add package.json cursor-plugin
git commit -m "chore(pixelrag): régénère plugin + bump 0.8.0"
```

---

## Self-Review

**1. Spec coverage** — (a) PixelRAG obligatoire à chaque page + contrôle complet (web) → Task 3 (verify-rule) + Task 2 (prérequis A-FAIRE) ; (b) tous les sous-agents sur `claude-sonnet-5` → Task 1 ; (c) sous-agents design chargent les skills design → Task 1 (+ Règle design existante). ✅

**2. Placeholder scan** — aucun « TBD » ; texte exact fourni. Task 3 Step 4 (edit-design) décrit l'insertion : l'implémenteur lit le fichier réel et ajoute la phrase à l'étape de vérif finale.

**3. Non-régression** — PixelRAG **pas** ajouté aux MCP (pas de config qui échoue) ; rendu A-FAIRE **gated** sur `VISUAL_CHECK_STACKS` (mobile exclu, test l'asserte). verify-rule/subagents-rule : on **ajoute** des sous-chaînes, les tests existants restent verts. Validateurs new-project/new-feature inchangés (Phase 5/edit-design : ajouts, pas de suppression de marqueurs).

**4. Type consistency** — `VISUAL_CHECK_STACKS` (array) + `PIXELRAG_NOTE` (string) exportés par matrix, importés par setup-ai + pixelrag.test. `renderSetupAi` signature inchangée (utilise `stack` déjà reçu).
