# Règle « Réalité » (vraies données, zéro mock, maquette à l'identique) + caveman opt-in — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Forcer un travail **réel** : vraies données, **zéro mock/fausse donnée**, chaque bouton/action câblé au **vrai backend**, maquette reproduite **à l'identique**, l'IA **prend le temps** (jamais faire semblant — si une vraie connexion est impossible à un instant T, le DIRE). (2) La roadmap doit expliciter **les données + le câblage réel** de chaque feature. (3) **Caveman OFF par défaut** (opt-in via `--caveman`) pour ne pas rogner les explications du mode apprentissage.

**Architecture:** Nouvelle règle standing `reality-rule.md` injectée dans `AGENTS.md` ; durcissement du template `ROADMAP.md` + Phase 6 de `/new-project` (données/câblage par jalon) ; le wizard n'active plus caveman par défaut (flag `--caveman` seulement).

**Tech Stack:** Markdown (règles/runbooks/template) + JS (`templates.mjs`, `setup.mjs`, `wizard.mjs`, validateurs) + `node --test`.

## Global Constraints

- Tests via `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`.
- **Vraies données obligatoires** : interdit mock/fausse donnée ; connexion réelle impossible à un instant T → l'IA le **dit** (bloqué + pourquoi), jamais de faux.
- Caveman : **OFF par défaut**, activable **uniquement** par `--caveman`. Le flag `--caveman` reste fonctionnel.
- Ne casse pas les validateurs existants ni les tests `agents-templates` (ajouts de sous-chaînes uniquement).
- Français, accents corrects. Jamais « formation »/« accompagnement ».
- Après édition de runbooks de commande : régénérer `cursor-plugin/`.

---

## File Structure

- `templates/agents/reality-rule.md` — **créer** (règle standing).
- `scripts/lib/templates.mjs` — param `realityRule` + placement dans `renderProjectAgentsMd`.
- `scripts/lib/agents-file.mjs` — passe `realityRule: snip('reality-rule.md')`.
- `scripts/lib/validate-commands.mjs` — `reality-rule.md` dans `AGENTS_TEMPLATES`.
- `scripts/lib/validate-commands.test.mjs` — écrit le fixture `reality-rule.md`.
- `scripts/lib/templates.test.mjs` + `scripts/lib/agents-templates.test.mjs` — assertions.
- `templates/roadmap/ROADMAP.md` + `templates/commands/new-project.md` (Phase 6) — données/câblage réel par jalon.
- `scripts/lib/wizard.mjs` + `scripts/lib/wizard.test.mjs` — caveman opt-in.
- `cursor-plugin/` régénéré ; `package.json` bump `0.9.0`.

---

## Task 1 : Règle standing « Réalité »

**Files:**
- Create: `templates/agents/reality-rule.md`
- Modify: `scripts/lib/templates.mjs`, `scripts/lib/agents-file.mjs`, `scripts/lib/validate-commands.mjs`, `scripts/lib/validate-commands.test.mjs`
- Test: `scripts/lib/agents-templates.test.mjs`, `scripts/lib/templates.test.mjs`

**Interfaces:**
- Produces: section « Règle Réalité » dans `AGENTS.md`/`CLAUDE.md` ; `renderProjectAgentsMd({..., realityRule})`.

- [ ] **Step 1 : Écrire le fichier `templates/agents/reality-rule.md`**

```md
## Règle Réalité (vraies données, zéro mock, maquette à l'identique)

Mieux vaut **lent et réel** que rapide et bidon. **Prends le temps.**

- **Zéro mock, zéro fausse donnée.** Chaque écran affiche de **vraies** données, venant du **vrai backend** (base, API, auth du projet). Pas de tableau en dur, pas de `lorem`, pas de `TODO: connect`.
- **Chaque bouton / action MARCHE** : câblé de bout en bout (clic → backend → résultat visible). Un bouton qui ne fait rien = **pas fini**.
- **Connexion impossible à un instant T ?** Dis-le **explicitement** (ce qui bloque + pourquoi) et propose la vraie solution. **Ne fais jamais semblant** avec un faux.
- **Reproduis la maquette à l'identique** : le rendu doit coller à l'écran de `maquette/`. Itère jusqu'à ce que **PixelRAG** confirme (voir « Règle de vérification »).
- **Sais quelles données vont où** : avant de coder un écran, identifie les données réelles qu'il montre/écrit (d'où elles viennent, où elles vont). Si le modèle de données manque, crée-le d'abord.
```

- [ ] **Step 2 : Test (échoue)**

Dans `scripts/lib/agents-templates.test.mjs`, ajoute :

```js
test('reality-rule : zéro mock + boutons câblés + maquette à l\'identique', () => {
  const t = read('templates/agents/reality-rule.md');
  for (const s of ['mock', 'vrai backend', 'MARCHE', 'PixelRAG', 'Prends le temps']) {
    assert.match(t, new RegExp(s));
  }
});
```

Et dans `scripts/lib/templates.test.mjs`, au test `renderProjectAgentsMd compose…`, ajoute `realityRule: 'REGLE-REALITE'` à l'appel et `assert.match(out, /REGLE-REALITE/);`.

- [ ] **Step 3 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs scripts/lib/templates.test.mjs`
Expected : FAIL.

- [ ] **Step 4 : Câbler `renderProjectAgentsMd`**

`scripts/lib/templates.mjs` : ajoute `realityRule = ''` à la signature ; place-le dans le `body` **juste après `${verifyRule}`** :

```js
${verifyRule}

${realityRule}

${secretsRule}
```

- [ ] **Step 5 : Câbler `agents-file.mjs`**

Dans `renderAgentsFile`, ajoute au call : `realityRule: snip('reality-rule.md'),`.

- [ ] **Step 6 : Validateur + fixture**

`scripts/lib/validate-commands.mjs` : ajoute `'templates/agents/reality-rule.md'` au tableau `AGENTS_TEMPLATES`.
`scripts/lib/validate-commands.test.mjs` : dans le fixture `makeRoot` (bloc `if (!omitTemplate)`), ajoute `fs.writeFileSync(path.join(root, 'templates/agents/reality-rule.md'), 'reality');`.

- [ ] **Step 7 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs scripts/lib/templates.test.mjs scripts/lib/validate-commands.test.mjs scripts/lib/new-project-runbook.test.mjs`
Expected : PASS.

- [ ] **Step 8 : Commit**

```bash
git add templates/agents/reality-rule.md scripts/lib/templates.mjs scripts/lib/agents-file.mjs scripts/lib/validate-commands.mjs scripts/lib/validate-commands.test.mjs scripts/lib/agents-templates.test.mjs scripts/lib/templates.test.mjs
git commit -m "feat(reality): règle standing — vraies données, zéro mock, boutons câblés, maquette à l'identique"
```

---

## Task 2 : Roadmap — données + câblage réel par jalon

**Files:**
- Modify: `templates/roadmap/ROADMAP.md`, `templates/commands/new-project.md` (Phase 6)
- Test: `scripts/lib/roadmap-run.test.mjs` (si présent, rester vert) + une assertion contenu

**Interfaces:**
- Produces: chaque jalon du template ROADMAP porte une ligne **Données / câblage réel** ; Phase 6 impose de la remplir + « ✅ ce que tu vois = bouton réel avec vraie donnée ».

- [ ] **Step 1 : Test (échoue)**

Ajoute dans `scripts/lib/agents-templates.test.mjs` (ou un nouveau test) :

```js
test('ROADMAP + Phase 6 : données/câblage réel par jalon (zéro mock)', () => {
  const roadmap = read('templates/roadmap/ROADMAP.md');
  const np = read('templates/commands/new-project.md');
  assert.match(roadmap, /Données \/ câblage réel/);
  assert.match(np, /vraie donnée/i);
  assert.match(np, /zéro mock/i);
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs`
Expected : FAIL.

- [ ] **Step 3 : `ROADMAP.md` — ligne données par jalon**

Dans `templates/roadmap/ROADMAP.md`, ajoute la ligne **`Données / câblage réel`** aux deux jalons modèles. Pour le jalon « 1. <titre> » :

```md
- [ ] ## 1. <titre de la première tranche>
  - Dépend de : 0
  - Livre : <ce que la tranche apporte>
  - Données / câblage réel : <quelles vraies données, d'où (table/API/auth), câblées au backend — ZÉRO mock>
  - ✅ Ce que tu vois : <résultat OBSERVABLE : un bouton/action qui MARCHE avec de vraies données>
  - Plan : docs/superpowers/plans/01-<slug>.md
```

Et adapte le commentaire final : `<!-- Ajoute un jalon par tranche… chaque jalon câble de VRAIES données (zéro mock). -->`.

- [ ] **Step 4 : `new-project.md` Phase 6**

Au point 3 (« Roadmap exhaustive ») et point 4 (« Chaque jalon = tranche verticale »), ajoute :

```md
   Chaque jalon précise **les données** : quelles **vraies** données l'écran montre/écrit, d'où elles viennent (modèle de données, API, auth), et leur **câblage réel** — **zéro mock, zéro fausse donnée**. Si le modèle de données manque, il passe **avant** l'écran qui l'utilise.
```

et transforme la ligne « ✅ Ce que tu vois » du point 4 pour exiger un **résultat réel** :

```md
4. Chaque jalon = une **tranche verticale** avec **`✅ Ce que tu vois :`** = **un bouton/une action qui MARCHE avec de vraies données** (l'écran de la maquette devenu réel, pas une coquille) — + un chemin de plan `docs/superpowers/plans/NN-<slug>.md`.
```

- [ ] **Step 5 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs scripts/lib/new-project-runbook.test.mjs`
Expected : PASS (les marqueurs DEPTH + phases restent présents).

- [ ] **Step 6 : Commit**

```bash
git add templates/roadmap/ROADMAP.md templates/commands/new-project.md scripts/lib/agents-templates.test.mjs
git commit -m "feat(roadmap): données + câblage réel par jalon (zéro mock, bouton qui marche = ce que tu vois)"
```

---

## Task 3 : Caveman OFF par défaut (opt-in `--caveman`)

**Files:**
- Modify: `scripts/lib/wizard.mjs`
- Test: `scripts/lib/wizard.test.mjs`

**Interfaces:**
- Produces: le wizard n'active plus caveman ; `caveman` vient **uniquement** du flag `--caveman` (base flags). Le flag reste fonctionnel.

- [ ] **Step 1 : Lire `wizard.mjs`**

Repère le prompt caveman (≈ lignes 100-104 : `const caveman = ['o','oui',…].includes(raw)`) et le retour de `runWizard` (≈ ligne 112 : `return { …, caveman, … }`), ainsi que `buildArgsFromAnswers` (≈ ligne 34 : `caveman: Boolean(a.caveman)`).

- [ ] **Step 2 : Test (échoue)**

Dans `scripts/lib/wizard.test.mjs`, ajoute :

```js
test('caveman opt-in : buildArgsFromAnswers ne l\'active que via le flag --caveman', () => {
  const off = buildArgsFromAnswers({ stack: 'saas', assistant: 'cursor', project: 'x' }, {});
  assert.equal(off.caveman, false);
  const on = buildArgsFromAnswers({ stack: 'saas', assistant: 'cursor', project: 'x' }, { caveman: true });
  assert.equal(on.caveman, true);
});
```

(Adapte les arguments à la vraie signature de `buildArgsFromAnswers(answers, base)` après lecture.)

- [ ] **Step 3 : Lancer → échoue (ou révèle le comportement actuel)**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/wizard.test.mjs`
Expected : FAIL si caveman vient d'ailleurs que du flag.

- [ ] **Step 4 : Retirer le prompt caveman + brancher sur le flag**

- Dans `runWizard` : **supprime** la question caveman (les ~3 lignes du prompt + `out.write(...)`), et retire `caveman` de l'objet retourné.
- Dans `buildArgsFromAnswers(answers, base)` : `caveman: Boolean(base.caveman)` (le flag `--caveman`), **plus** `answers.caveman`.
- Vérifie que `parseArgs` garde `--caveman` (déjà le cas : `case '--caveman'`).

- [ ] **Step 5 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/wizard.test.mjs`
Expected : PASS.

- [ ] **Step 6 : Commit**

```bash
git add scripts/lib/wizard.mjs scripts/lib/wizard.test.mjs
git commit -m "feat(wizard): caveman OFF par défaut (opt-in via --caveman) — préserve les explications du mode apprentissage"
```

---

## Task 4 : Régénérer le plugin + suite + bump 0.9.0 + vérif réelle

**Files:**
- Modify: `package.json:3`, `cursor-plugin/`

- [ ] **Step 1 : Régénérer le plugin**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/build-cursor-plugin.mjs`

- [ ] **Step 2 : Bump** — `package.json:3` → `"version": "0.9.0",`.

- [ ] **Step 3 : Suite → verte**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`
Expected : `# fail 0`.

- [ ] **Step 4 : Vérif réelle**

```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
T=/private/tmp/reality; rm -rf "$T"
$N scripts/setup.mjs "$T" --stack saas --assistant claude-code --no-skills --yes >/dev/null 2>&1
echo "Règle Réalité dans AGENTS.md : $(grep -c 'Règle Réalité' "$T/AGENTS.md")"      # 1
echo "caveman NON installé par défaut : $(ls "$T/.cursor/rules/" 2>/dev/null | grep -c caveman ; grep -rc caveman "$T/AGENTS.md" 2>/dev/null)"  # 0 (pas de --caveman)
echo "ROADMAP données : $(grep -c 'Données / câblage réel' "$T/docs/ROADMAP.md")"     # 1+
# et avec --caveman il s'installe
T2=/private/tmp/reality-cv; rm -rf "$T2"
$N scripts/setup.mjs "$T2" --stack saas --assistant claude-code --no-skills --yes --caveman >/dev/null 2>&1
echo "avec --caveman installé : présent"
```
Expected : Règle Réalité **1**, caveman **0** sans flag, ROADMAP « Données / câblage réel » **1+**.

- [ ] **Step 5 : Commit**

```bash
git add package.json cursor-plugin
git commit -m "chore(reality): régénère plugin + bump 0.9.0"
```

---

## Self-Review

**1. Spec coverage** — (a) vraies données / zéro mock / boutons câblés / dire si impossible → Task 1 (reality-rule) ; (b) maquette à l'identique → Task 1 (+ PixelRAG existant) ; (c) roadmap = données + câblage réel par feature → Task 2 ; (d) prendre le temps → Task 1 ; (e) caveman opt-in → Task 3. ✅

**2. Placeholder scan** — aucun « TBD ». Task 3 demande de **lire `wizard.mjs`** avant d'éditer (les lignes exactes du prompt varient) — comportement cible spécifié (caveman ← flag uniquement), pas un trou.

**3. Non-régression** — `renderProjectAgentsMd` : `realityRule` ajouté comme param optionnel (`= ''`), placé entre verify et secrets → le reste inchangé, tests existants (BOUCLE/REGLE-*) verts. `AGENTS_TEMPLATES` + fixture mis à jour ensemble → `validateNewProjectCommand` reste vert. Phase 6 : ajouts de texte, marqueurs DEPTH/phases intacts. Caveman : seule la source du booléen change (flag), `installCaveman` inchangé.

**4. Type consistency** — `realityRule` (string) suit le même patron que `verifyRule`/`secretsRule` dans `renderProjectAgentsMd` + `renderAgentsFile`. `buildArgsFromAnswers(answers, base)` → `caveman` lu depuis `base` (cohérent avec `parseArgs`).
```
