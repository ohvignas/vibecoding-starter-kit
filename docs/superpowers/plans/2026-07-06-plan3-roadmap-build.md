# Plan 3 — Roadmap exhaustive + `/build` en boucle + visuel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depuis le PRD + design, l'IA sélectionne les domaines (via les triggers), écrit une **ROADMAP exhaustive** (chaque jalon = une tranche verticale avec un résultat VISIBLE), puis `/build` exécute la roadmap **jalon par jalon** (subagent-driven) en relançant la vraie app à chaque étape ; le hook de session injecte le prochain jalon pour ne rien oublier.

**Architecture :** Deux modules de code testables — `select-domains.mjs` (matcher PRD→domaines, avec triggers durcis) et l'ajout de `nextRoadmapStep` à `inject-memory.mjs` (anti-oubli). Le reste = runbooks markdown (ROADMAP template, `/build`, cibles de run) copiés par `setup.mjs` et suivis par l'IA. `/build` réutilise la boucle superpowers du kit.

**Tech Stack :** Node.js ESM, `node --test` (zéro dépendance externe), runbooks markdown.

## Global Constraints

- Node ≥ 20.12 ; ESM ; **zéro dépendance externe** (tests `node:test` + `node:assert/strict`).
- Le binaire `node` du shell peut être un wrapper nvm cassé (`_nvm_lazy_load`/`FUNCNEST`). En cas d'échec, utiliser `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node` — y compris la suite complète.
- Lancer la suite via `node --test` (racine). **Ne pas** utiliser la forme répertoire `node --test scripts/lib/` (faux rouge sur ce Node).
- Style : fichiers courts, français dans messages/commentaires/runbooks, identifiers anglais.
- Chaque jalon de roadmap DOIT avoir une ligne `✅ Ce que tu vois :` (acceptation visuelle). Le visuel = la vraie app relancée, pas de dashboard.
- Ne rien charger d'office : les domaines sont **sélectionnés** depuis le PRD.
- **MANDATORY avant chaque commit** : suite complète `node --test` verte, coller la fin (`# tests N`) dans le rapport.
- Interfaces existantes : `DOMAIN_TRIGGERS` (domains.mjs, Plan 2) ; `writeStackEnvironment` (environment.mjs) ; `setup.mjs` boucle sur `['new-project','new-feature','edit-design','doctor']` (ligne ~71) ; `renderProjectAgentsMd` (templates.mjs) liste les commandes ; `validate-commands.mjs` valide les runbooks.

---

### Task 1 : `selectDomains` + durcissement des triggers (select-domains.mjs)

**Files:**
- Create: `scripts/lib/select-domains.mjs`
- Modify: `scripts/lib/domains.mjs` (durcir 2 triggers bruyants : `payment`, `licensing`)
- Test: `scripts/lib/select-domains.test.mjs`

**Interfaces:**
- Consumes: `DOMAIN_TRIGGERS` (domains.mjs).
- Produces: `export function selectDomains(prd, triggers) → string[]` (clés de domaines dont le regex matche le texte PRD, triées, uniques).

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/select-domains.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN_TRIGGERS } from './domains.mjs';
import { selectDomains } from './select-domains.mjs';

test('sélectionne les domaines présents dans le PRD (triés, uniques)', () => {
  const prd = 'Une app avec un abonnement premium et des notifications push.';
  assert.deepEqual(selectDomains(prd, DOMAIN_TRIGGERS), ['payment', 'push']);
});

test('cas positifs paiement : acheter / panier d’achat', () => {
  assert.deepEqual(selectDomains('ajouter au panier d’achat', DOMAIN_TRIGGERS), ['payment']);
  assert.deepEqual(selectDomains('acheter un article', DOMAIN_TRIGGERS), ['payment']);
});

test('cas NÉGATIFS : pas de faux positif paiement/licence', () => {
  assert.deepEqual(selectDomains('activation du compte par email de confirmation', DOMAIN_TRIGGERS), ['email'], 'activation compte ≠ licence');
  assert.deepEqual(selectDomains('je commande mes pensées dans une liste', DOMAIN_TRIGGERS), [], '“commande” isolé ≠ paiement');
});

test('licence détectée sur un vrai signal', () => {
  assert.deepEqual(selectDomains('activation de licence et clé de licence', DOMAIN_TRIGGERS), ['licensing']);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/select-domains.test.mjs`
Expected: FAIL (module introuvable + les cas négatifs échouent tant que les triggers ne sont pas durcis).

- [ ] **Step 3 : Durcir 2 triggers dans `scripts/lib/domains.mjs`** — dans `DOMAIN_TRIGGERS`, remplacer la ligne `payment` par :

```js
  payment:          /abonnement|premium|forfait|paywall|payer|paiement|checkout|réservation payante|acheter|panier d['’]achat|ajouter au panier|passer (une |la )?commande|bon de commande/i,
```

et remplacer la ligne `licensing` par :

```js
  licensing:        /licence|clé d['’]activation|activation de licence|débloquer l['’]app|essai gratuit|période d['’]essai|trial/i,
```

(Ne touche à aucun autre trigger ni à `SHARED_DOMAINS`.)

- [ ] **Step 4 : Implémenter `scripts/lib/select-domains.mjs`**

```js
// Sélectionne les domaines métier dont un déclencheur matche le texte du PRD.
// Retourne les clés triées et uniques. Utilisé par /new-project pour piocher dans le catalogue.
export function selectDomains(prd, triggers) {
  const text = String(prd || '');
  const hits = [];
  for (const [domain, re] of Object.entries(triggers)) {
    if (re.test(text)) hits.push(domain);
  }
  return [...new Set(hits)].sort();
}
```

- [ ] **Step 5 : Lancer les tests, vérifier le succès**

Run: `node --test scripts/lib/select-domains.test.mjs scripts/lib/domains.test.mjs`
Expected: PASS (les cas négatifs passent grâce aux triggers durcis ; les tests Plan 2 restent verts).

- [ ] **Step 6 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add scripts/lib/select-domains.mjs scripts/lib/select-domains.test.mjs scripts/lib/domains.mjs
git commit -m "feat(domains): selectDomains(PRD) + durcissement triggers paiement/licence"
```

---

### Task 2 : Anti-oubli — `nextRoadmapStep` + injection du prochain jalon (inject-memory.mjs)

**Files:**
- Modify: `templates/cursor/hooks/inject-memory.mjs` (ajoute `nextRoadmapStep` exporté + injecte le prochain jalon)
- Test: `scripts/lib/inject-memory.test.mjs` (nouveau)

**Interfaces:**
- Produces: `export function nextRoadmapStep(roadmapText) → string|null` (1re ligne de jalon non cochée `- [ ] ## …`, texte après `## `, ou `null`).

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/inject-memory.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRoadmapStep } from '../../templates/cursor/hooks/inject-memory.mjs';

const ROADMAP = `# Roadmap
- [x] ## 0. Fondations
  - ✅ Ce que tu vois : l'app démarre
- [ ] ## 1. Connexion des utilisateurs
  - ✅ Ce que tu vois : l'écran de login
- [ ] ## 2. Liste des rendez-vous
`;

test('renvoie le 1er jalon non coché', () => {
  assert.equal(nextRoadmapStep(ROADMAP), '1. Connexion des utilisateurs');
});

test('null si tout est coché ou vide', () => {
  assert.equal(nextRoadmapStep('- [x] ## 0. Fait'), null);
  assert.equal(nextRoadmapStep(''), null);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/inject-memory.test.mjs`
Expected: FAIL (`nextRoadmapStep` non exporté).

- [ ] **Step 3 : Réécrire `templates/cursor/hooks/inject-memory.mjs`**

```js
#!/usr/bin/env node
// Cursor sessionStart hook : injecte la mémoire du projet (docs/memory/index.md)
// ET le prochain jalon de la roadmap (docs/ROADMAP.md) — pour que l'agent sache où il en est.
import fs from 'node:fs';

// Renvoie le titre du 1er jalon non coché (`- [ ] ## <titre>`), ou null.
export function nextRoadmapStep(roadmapText) {
  for (const line of String(roadmapText || '').split(/\r?\n/)) {
    const m = line.match(/^\s*-\s*\[ \]\s*##\s*(.+?)\s*$/);
    if (m) return m[1];
  }
  return null;
}

function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

if (process.argv[1] && process.argv[1].endsWith('inject-memory.mjs')) {
  const mem = read('docs/memory/index.md');
  const step = nextRoadmapStep(read('docs/ROADMAP.md'));
  const parts = [];
  if (mem) parts.push(`# Mémoire du projet (docs/memory/index.md)\n\n${mem}`);
  if (step) parts.push(`# Prochain jalon (docs/ROADMAP.md)\n\nProchain : **${step}** — construis-le avec \`/build\`.`);
  process.stdout.write(JSON.stringify({ additional_context: parts.join('\n\n') }));
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/inject-memory.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5 : Vérif runtime du hook (ne casse pas hors projet)**

Run: `node templates/cursor/hooks/inject-memory.mjs`
Expected: imprime un JSON `{"additional_context":""}` (aucun fichier présent → vide), **exit 0**.

- [ ] **Step 6 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add templates/cursor/hooks/inject-memory.mjs scripts/lib/inject-memory.test.mjs
git commit -m "feat(hooks): inject-memory injecte le prochain jalon roadmap (anti-oubli)"
```

---

### Task 3 : Template ROADMAP + cibles de run (fichiers + copie par setup.mjs)

**Files:**
- Create: `templates/roadmap/ROADMAP.md`
- Create: `templates/run/saas.md`, `templates/run/mobile.md`, `templates/run/desktop.md`
- Modify: `scripts/setup.mjs` (copie `templates/roadmap/ROADMAP.md` → `docs/ROADMAP.md` et `templates/run/<stack>.md` → `docs/RUN.md`)
- Test: `scripts/lib/roadmap-run.test.mjs` (nouveau — vérifie le contenu des templates)

**Interfaces:** aucune (fichiers + copie).

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/roadmap-run.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('le template ROADMAP a les dimensions + l’acceptation visuelle', () => {
  const t = fs.readFileSync('templates/roadmap/ROADMAP.md', 'utf8');
  assert.match(t, /Fondations/);
  assert.match(t, /Ce que tu vois/);
  for (const dim of ['Modèle de données', 'Auth', 'États', 'Déploiement']) assert.match(t, new RegExp(dim));
});

test('chaque cible de run décrit ce qu’on doit voir', () => {
  for (const [stack, needle] of [['saas', 'localhost'], ['mobile', 'expo start'], ['desktop', 'run start']]) {
    const t = fs.readFileSync(`templates/run/${stack}.md`, 'utf8');
    assert.match(t, /Ce que tu dois voir/);
    assert.match(t, new RegExp(needle));
  }
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/roadmap-run.test.mjs`
Expected: FAIL (fichiers absents).

- [ ] **Step 3 : Créer `templates/roadmap/ROADMAP.md`**

```markdown
# Roadmap — <projet>

> Généré depuis le PRD (features), le design et les domaines sélectionnés. **Ne rien oublier** : parcours toutes les dimensions ci-dessous.
> `/build` lit ce fichier à chaque tour et coche le jalon fini. Chaque jalon = une **tranche verticale** avec un **résultat visible**.

## Dimensions à couvrir
0. **Fondations** (env IA installé + scaffold + 1er boot) · 1. **Modèle de données** · 2. **Auth** · 3. **Chaque feature du PRD** · 4. **Domaines sélectionnés** (paiement, email, storage… voir `docs/DOMAINS.md`) · 5. **Passe UI/design** · 6. **États** (chargement / vide / erreur) · 7. **Tests** · 8. **Passe sécu** · 9. **Déploiement** · 10. **Docs**

## Jalons

- [ ] ## 0. Fondations — le projet démarre
  - Dépend de : —
  - Livre : environnement IA installé (`docs/SETUP-AI.md` joué) + scaffold de la stack + app qui démarre
  - ✅ Ce que tu vois : l'app démarre (page / écran / fenêtre « hello ») — voir `docs/RUN.md`
  - Plan : docs/superpowers/plans/00-fondations.md

- [ ] ## 1. <titre de la première tranche>
  - Dépend de : 0
  - Livre : <ce que la tranche apporte>
  - ✅ Ce que tu vois : <résultat OBSERVABLE dans l'app>
  - Plan : docs/superpowers/plans/01-<slug>.md

<!-- Ajoute un jalon par tranche jusqu'à couvrir toutes les dimensions. -->
```

- [ ] **Step 4 : Créer les 3 cibles de run**

`templates/run/saas.md` :
```markdown
# Lancer l'app — SaaS (Convex + TanStack Start)

Deux terminaux :
1. `npx convex dev` — backend Convex + génération des types (laisse tourner).
2. `npm run dev` — le front.

Ouvre **http://localhost:3000**.

**Ce que tu dois voir :** la page se charge sur localhost et les données Convex s'affichent (et se mettent à jour en direct).
```

`templates/run/mobile.md` :
```markdown
# Lancer l'app — Mobile (Expo)

`npx expo start`, puis :
- appuie sur **`i`** → simulateur iOS (Xcode requis), ou
- appuie sur **`a`** → émulateur Android (Android Studio requis), ou
- scanne le **QR code** avec l'app **Expo Go** sur ton téléphone.

**Ce que tu dois voir :** l'app s'ouvre sur le simulateur / ton téléphone et réagit à tes actions.
```

`templates/run/desktop.md` :
```markdown
# Lancer l'app — Desktop (Electron)

`npm run start`

**Ce que tu dois voir :** la fenêtre Electron s'ouvre avec ton interface.
```

- [ ] **Step 5 : Copier dans `scripts/setup.mjs`** — juste après le bloc onboarding (le `try { copyIfAbsent(... 'templates/ONBOARDING.md' ...) }`), ajouter :

```js
  try { copyIfAbsent(path.join(args.source, 'templates/roadmap/ROADMAP.md'), path.join(projectDir, 'docs/ROADMAP.md'), opt); done.push('docs/ROADMAP.md (squelette)'); }
  catch (e) { failed.push(`roadmap (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, `templates/run/${args.stack}.md`), path.join(projectDir, 'docs/RUN.md'), opt); done.push('docs/RUN.md'); }
  catch (e) { failed.push(`run (${e.message})`); }
```

- [ ] **Step 6 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/roadmap-run.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 7 : Vérif à la main (copie réelle)**

Run:
```bash
rm -rf /tmp/vs-rm && node scripts/setup.mjs --source . --stack desktop --assistant claude-code --project /tmp/vs-rm >/dev/null && node -e "const fs=require('fs');for(const f of ['docs/ROADMAP.md','docs/RUN.md'])if(!fs.existsSync('/tmp/vs-rm/'+f))throw new Error('manque '+f);if(!/run start/.test(fs.readFileSync('/tmp/vs-rm/docs/RUN.md','utf8')))throw new Error('RUN desktop faux');console.log('OK roadmap+run')"
```
Expected: `OK roadmap+run`.

- [ ] **Step 8 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add templates/roadmap/ROADMAP.md templates/run/ scripts/setup.mjs scripts/lib/roadmap-run.test.mjs
git commit -m "feat(setup): squelette docs/ROADMAP.md + cible de run docs/RUN.md par stack"
```

---

### Task 4 : Commande `/build` (runbook + câblage)

**Files:**
- Create: `templates/commands/build.md`
- Modify: `scripts/setup.mjs` (ajoute `'build'` à la boucle des commandes, ligne ~71)
- Modify: `scripts/lib/templates.mjs` (ajoute `/build` à la ligne « ## Commandes » de `renderProjectAgentsMd`)
- Modify: `scripts/lib/validate-commands.mjs` (ajoute `validateBuildCommand`)
- Test: `scripts/lib/validate-build.test.mjs` (nouveau)

**Interfaces:**
- Produces: `export function validateBuildCommand(root) → string[]`.

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/validate-build.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBuildCommand } from './validate-commands.mjs';

test('/build runbook référence la boucle, le visuel et la roadmap', () => {
  assert.deepEqual(validateBuildCommand('.'), []);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/validate-build.test.mjs`
Expected: FAIL (`validateBuildCommand` non exporté).

- [ ] **Step 3 : Créer `templates/commands/build.md`**

```markdown
# /build — Construire la roadmap, jalon par jalon (runbook IA)

Tu exécutes `docs/ROADMAP.md` **une tranche à la fois**, en montrant un résultat **visuel** à chaque étape. Réutilise la boucle du kit (`superpowers:subagent-driven-development`). En français.

## Un tour = un jalon
1. **Lis `docs/ROADMAP.md`** → prends le **1er jalon non coché** dont les dépendances sont cochées. (Rien n'est en mémoire volatile : la roadmap est la source de vérité, relue à chaque tour.)
2. **Plan** : si `docs/superpowers/plans/NN-*.md` du jalon n'existe pas → crée-le avec `superpowers:writing-plans` (dérivé du PRD + design + `docs/DOMAINS.md` pour les domaines).
3. **Exécute** le plan avec `superpowers:subagent-driven-development` (TDD + review + fix). C'est la **boucle** du projet.
4. **Montre le visuel** : lance l'app (`docs/RUN.md`) et vérifie le `✅ Ce que tu vois` du jalon — navigateur (web), simulateur (mobile), fenêtre (desktop), screenshot à l'appui. Non atteint → `superpowers:systematic-debugging`, on ne passe pas au suivant.
5. **Coche** le jalon dans `docs/ROADMAP.md`, note tout piège dans `docs/memory/`, commit.
6. **Gate** : demande « on continue au jalon suivant ? » — sauf si l'utilisateur a dit « enchaîne tout » (ou `/build --all`) → boucle automatiquement jusqu'à la fin, en montrant le visuel + une ligne de progrès à chaque tour.

## Jalon 0 (fondations)
Joue `docs/SETUP-AI.md` (plugins/skills/MCP), scaffold la stack, fais **démarrer** l'app. Visuel = l'app boote.

## Fini quand
Tous les jalons de `docs/ROADMAP.md` sont cochés **et** chaque `✅ Ce que tu vois` a été constaté en vrai. Si un blocage externe empêche d'aller au bout → dis exactement ce qui manque.
```

- [ ] **Step 4 : Ajouter `'build'` à la boucle des commandes dans `scripts/setup.mjs`** — remplacer :

```js
  for (const cmd of ['new-project', 'new-feature', 'edit-design', 'doctor']) {
```
par :
```js
  for (const cmd of ['new-project', 'new-feature', 'edit-design', 'doctor', 'build']) {
```

- [ ] **Step 5 : Ajouter `/build` à `renderProjectAgentsMd` dans `scripts/lib/templates.mjs`** — remplacer la ligne « ## Commandes » :

```js
## Commandes
\`/new-project\` (fondation) · \`/new-feature\` (livrer) · \`/edit-design\` (UI). Runbooks dans \`${commandsDir}/\`.
```
par :
```js
## Commandes
\`/new-project\` (fondation) · \`/build\` (construire la roadmap, jalon par jalon) · \`/new-feature\` (livrer une feature) · \`/edit-design\` (UI). Runbooks dans \`${commandsDir}/\`.
```

- [ ] **Step 6 : Ajouter `validateBuildCommand` à la fin de `scripts/lib/validate-commands.mjs`**

```js
export function validateBuildCommand(root) {
  const errors = [];
  const rb = path.join(root, 'templates/commands/build.md');
  if (!fs.existsSync(rb)) { errors.push('manquant : templates/commands/build.md'); return errors; }
  const txt = fs.readFileSync(rb, 'utf8');
  for (const s of ['docs/ROADMAP.md', 'subagent-driven-development', 'docs/RUN.md', 'Ce que tu vois', 'writing-plans']) {
    if (!txt.includes(s)) errors.push(`build : ne référence pas « ${s} »`);
  }
  return errors;
}
```

- [ ] **Step 7 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/validate-build.test.mjs`
Expected: PASS.

- [ ] **Step 8 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add templates/commands/build.md scripts/setup.mjs scripts/lib/templates.mjs scripts/lib/validate-commands.mjs scripts/lib/validate-build.test.mjs
git commit -m "feat(build): commande /build (boucle roadmap + visuel) câblée dans l'installeur"
```

---

### Task 5 : Étendre `/new-project` (sélection domaines + ROADMAP exhaustive)

**Files:**
- Modify: `templates/commands/new-project.md` (Phase 6 = ROADMAP exhaustive + sélection domaines ; Phase 7 mentionne SETUP-AI/DOMAINS/RUN + `/build`)
- Test: `scripts/lib/validate-commands.test.mjs` reste vert (les marqueurs `Roadmap`, `docs/ROADMAP.md`, DEPTH inchangés).

**Interfaces:** aucune (runbook). `validateNewProjectCommand` doit rester vert.

- [ ] **Step 1 : Remplacer la Phase 6 de `templates/commands/new-project.md`** — remplacer le bloc :

```markdown
## Phase 6 — Roadmap → `docs/ROADMAP.md`
Découpe les features (du PRD) par phase (v1 / v2 / v3), en respectant les Non-objectifs.
```
par :
```markdown
## Phase 6 — Sélection des domaines + Roadmap exhaustive → `docs/ROADMAP.md`

1. **Sélection des domaines** : lis `docs/DOMAINS.md` (le catalogue de la stack) et repère, dans le PRD, les **domaines métier** nécessaires (paiement, email, storage, analytics, erreurs, push, caméra, cartes, auto-update, licence…). Ajoute les secrets correspondants à `.env.example` et leurs commandes à `docs/SETUP-AI.md`. Règle : préfère le **built-in / officiel** ; n'ajoute un externe que si le PRD le justifie.
2. **Roadmap exhaustive** : remplis `docs/ROADMAP.md` (squelette déjà présent) en **pensant à tout** — parcours les dimensions : Fondations, Modèle de données, Auth, **chaque feature du PRD**, **domaines sélectionnés**, passe UI/design, États (chargement/vide/erreur), Tests, passe sécu, Déploiement, Docs. **Fondations d'abord**.
3. Chaque jalon = une **tranche verticale** avec une ligne **`✅ Ce que tu vois :`** (le résultat observable dans l'app) et un chemin de plan `docs/superpowers/plans/NN-<slug>.md`.
4. Propose ensuite de **générer tous les plans** (un par jalon, `superpowers:writing-plans`) pour que toute la roadmap soit posée, puis d'enchaîner sur **`/build`**.
```

- [ ] **Step 2 : Mettre à jour la Phase 7** — dans « ## Phase 7 — Mise en place du projet », remplacer le point 2 par :

```markdown
2. Écris `AGENTS.md` (+ copie `CLAUDE.md`) en y intégrant : `templates/agents/loop-section.md` (la boucle), `templates/agents/design-rule.md` (règle design), les règles mémoire, et des liens vers `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DOMAINS.md`, `docs/design.md`, la spec architecture, et `docs/memory/`. Rappelle de jouer `docs/SETUP-AI.md` (plugins/skills/MCP) et d'utiliser `docs/RUN.md` pour lancer l'app.
```

Et dans « ## Fini quand », remplacer la dernière phrase par :

```markdown
Ensuite : « pour tout construire dans l'ordre avec un visuel à chaque étape, lance `/build` ; pour une feature isolée, `/new-feature` ».
```

- [ ] **Step 3 : Vérifier que la validation reste verte**

Run: `node --test scripts/lib/validate.test.mjs scripts/lib/validate-commands.test.mjs`
Expected: PASS (`validateNewProjectCommand` : la phase « Roadmap » et la sortie `docs/ROADMAP.md` sont toujours référencées ; les marqueurs DEPTH inchangés).

- [ ] **Step 4 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add templates/commands/new-project.md
git commit -m "feat(new-project): sélection des domaines par PRD + roadmap exhaustive (visuel par jalon)"
```

---

## Self-Review

**Spec coverage (Partie 2 + persistance) :**
- §2.1 ROADMAP exhaustif + `✅ Ce que tu vois` → Task 3 (template) + Task 5 (génération) ✓
- §2.2 génération des plans en lot → Task 4 (`/build` étape 2) + Task 5 (proposition) ✓
- §2.3 `/build` boucle jalon-par-jalon (subagent-driven, gate hybride, `--all`) → Task 4 ✓
- §2.4 visuel = vraie app relancée (cibles run par stack) → Task 3 ✓
- §2.5 extension `/new-project` (sélection domaines) → Task 5 ✓
- Persistance / anti-oubli (inject-memory injecte le prochain jalon ; ROADMAP relu chaque tour) → Task 2 (+ Task 4 étape 1) ✓
- Reco portée du Plan 2 (précision des triggers, cas négatifs `commande`/`activation`) → Task 1 (durcissement + tests négatifs) ✓

**Placeholder scan :** aucun TBD/TODO ; les `<…>` du template ROADMAP sont des champs que l'IA remplit (intentionnel, documenté par le commentaire). Code et runbooks complets. ✓

**Type consistency :** `selectDomains(prd, triggers)` consomme `DOMAIN_TRIGGERS` (Plan 2) et renvoie `string[]`. `nextRoadmapStep(text)` renvoie `string|null`, consommé par le corps de `inject-memory.mjs`. `validateBuildCommand(root)` renvoie `string[]` comme les autres validateurs. La boucle `setup.mjs` inclut `'build'` → copie `templates/commands/build.md` (créé Task 4). ✓

## Notes d'exécution

- Ordre : Task 1 → 2 → 3 → 4 → 5 (indépendantes en code, mais 4 dépend de 3 pour `docs/RUN.md` référencé par le runbook ; 5 suppose DOMAINS.md de Plan 2).
- Branche : `git checkout -b feat/roadmap-build` depuis `main` avant Task 1.
- Après Plan 3 : le système est complet (env + domaines + roadmap/build). Finaliser (merge) puis proposer la mise à jour du README + un smoke end-to-end.
