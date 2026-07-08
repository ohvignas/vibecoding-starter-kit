# Expérience Débutant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le kit survivable et compréhensible pour un débutant seul : dépolluer les règles Cursor (suppression du clone awesome-cursorrules), faire parler chaque doc la langue de l'assistant choisi, ouvrir la Phase 5 maquette à 3 entrées (Stitch importée / maquette déposée / l'IA dessine des wireframes — aucun péage Stitch), écrire le prompt final dans `COLLE-MOI-DANS-L-IA.md`, livrer `/next` (GPS) et `/sos` (bouton panique + tags `jalon-NN` + règle des 3 essais anti-doom-loop), activer un mode apprentissage par défaut, ajouter les deeplinks `cursor://` pour les MCP, étendre `/doctor` en critère officiel de fin d'installation, et corriger les erreurs factuelles (`${env:}`) + README + glossaire.

**Architecture:** Le kit est un installeur Node ESM zéro dépendance : `scripts/setup.mjs` (orchestrateur) + `scripts/lib/*.mjs` (fonctions pures testées, tests co-localisés `*.test.mjs`) + `templates/` (fichiers copiés tels quels dans le projet généré) + `guides/` (docs élèves). Les runbooks IA vivent dans `templates/commands/*.md` et sont copiés vers `.cursor/commands/`, `.claude/commands/` ou `docs/commands/` selon l'assistant. La matrice stack×assistant est `scripts/lib/matrix.mjs` ; le rendu de `docs/SETUP-AI.md` est `scripts/lib/setup-ai.mjs` ; la validation de contenu des runbooks est `scripts/lib/validate-commands.mjs`.

**Tech Stack:** Node.js ≥ 20.12 (ESM `.mjs`, zéro dépendance npm), tests `node:test` + `node:assert/strict`, Markdown français pour tous les templates.

## Global Constraints

- **Node ESM zéro dépendance npm** : aucun `npm install`, aucun import hors `node:*` et fichiers du repo.
- **Tests** : suite `node --test` lancée depuis la racine du repo.
- **Binaire node** : utiliser EXACTEMENT `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node` (le wrapper nvm `node` est cassé dans cet environnement).
- **Répertoire de travail** : toutes les commandes se lancent depuis `/Users/antoinevigneau/best_practices_vibecoding`.
- **Tout en français** : docs, messages, commentaires, contenus de templates.
- **Copies non destructives** : tout fichier copié dans un projet généré passe par `copyIfAbsent`/`copyDirIfAbsent` (jamais d'écrasement sans `--force`).
- **Interdit dans les templates générés** : les mots « formation » et « accompagnement ».
- **Jamais de secret** écrit dans un fichier du projet (clé API = user-scope, hors dépôt).
- **Pas de types TypeScript** dans les `.mjs`.
- Avant chaque commit : la suite complète `node --test` est verte (129 tests au départ, davantage à la fin).

## ⚠️ PRÉREQUIS — Plan 7 d'abord

**Le Plan 7 (fiabilisation wizard/installeur) doit être mergé AVANT d'exécuter ce plan** : il touche les mêmes fichiers (`scripts/setup.mjs`, `scripts/lib/wizard.mjs`, `scripts/lib/args.mjs`, `scripts/lib/report.mjs`). Les blocs « ACTUEL » ci-dessous ont été relevés au caractère près sur `main` AVANT le merge du Plan 7. **Règle d'exécution** : avant chaque édition, RELIS le fichier réel ; si un bloc ACTUEL ne correspond plus exactement (le Plan 7 a modifié la zone), retrouve le bloc équivalent dans le fichier mergé et applique la MÊME transformation (le contenu REMPLACÉ ajouté reste identique, seul l'ancrage peut bouger). Si l'écart est plus profond qu'un ancrage (fonction déplacée/renommée), STOP et demande à l'humain.

---

## Tâche 1 — Dépollution Cursor : supprimer le clone awesome-cursorrules

Le matching par tags (`matchTags`) déverse 64 à 201 règles `.mdc` hors-sujet (Angular, Solidity, Vue…) avec `globs: **/*` dans le projet généré — l'anti-pattern exact des docs Cursor. Les règles typées du kit (`templates/cursor/rules/`) suffisent. On garde le clone karpathy. `selectByTags` perd son unique consommateur → code mort, on le supprime aussi.

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/matrix.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/matrix.test.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/external.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/external.test.mjs`
- Test: `scripts/lib/matrix.test.mjs`, `scripts/lib/external.test.mjs`

**Interfaces:**
- Consumes: `resolveAssets(stack, assistant)` → `{ copies, clones, inAssistant, skipped, commandsDir }` (inchangée en signature).
- Produces: `clones` ne contient plus QUE le clone karpathy (`clones.length === 1` pour cursor, `1` pour les autres) ; `skipped` devient `[]` pour tous ; `selectByTags` **supprimé** de `scripts/lib/external.mjs` (plus exporté nulle part).

**Steps:**

- [ ] 1.1 **Écris le test qui échoue** — remplace TOUT le contenu de `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/matrix.test.mjs` par :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssets } from './matrix.mjs';

test('SaaS + Cursor : mdc stack, 1 seul clone (karpathy), commandsDir cursor, pas de bmad', () => {
  const p = resolveAssets('saas', 'cursor');
  assert.ok(p.copies.find(c => c.to === '.cursor/rules/stack-saas.mdc' && c.transform === 'mdc'));
  // La règle de stack est Agent-Requested (alwaysApply:false) pour ne pas saturer le contexte à chaque tour.
  assert.equal(p.copies.find(c => c.to === '.cursor/rules/stack-saas.mdc').alwaysApply, false);
  // awesome-cursorrules SUPPRIMÉ : le matching par tags déversait 64-201 règles hors-sujet (globs **/*).
  assert.equal(p.clones.length, 1);
  assert.match(p.clones[0].repo, /andrej-karpathy-skills/);
  assert.equal(p.commandsDir, '.cursor/commands');
  assert.equal(p.inAssistant[0].command, '/add-plugin superpowers');
  assert.ok(!p.inAssistant.some(s => /design/i.test(s.name)));
  assert.equal(p.bmad, undefined);
});
test('Desktop + Claude Code : pas de MCP, skill dir, commandsDir claude, rien de sauté', () => {
  const p = resolveAssets('desktop', 'claude-code');
  assert.ok(!p.copies.find(c => (c.to || '').includes('mcp.json')));
  assert.deepEqual(p.skipped, []);
  assert.ok(p.copies.find(c => c.to === '.claude/skills/stack-desktop' && c.transform === 'dir'));
  assert.equal(p.commandsDir, '.claude/commands');
  assert.equal(p.clones.length, 1);
});
test('Mobile + Codex : AGENTS brut, superpowers /plugins, commandsDir docs/commands', () => {
  const p = resolveAssets('mobile', 'codex');
  assert.ok(p.copies.find(c => c.from === 'stacks/mobile/AGENTS.md' && c.transform === 'raw'));
  assert.equal(p.commandsDir, 'docs/commands');
  assert.match(p.inAssistant[0].command, /plugins/);
});
test('assistant inconnu → throw', () => {
  assert.throws(() => resolveAssets('saas', 'windsurf'), /Assistant inconnu/);
});
```

- [ ] 1.2 **Lance, vérifie l'échec** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/matrix.test.mjs` → attendu : `# fail 2` — le test SaaS+Cursor échoue sur `assert.equal(p.clones.length, 1)` (« Expected values to be strictly equal: 2 !== 1 ») et le test Desktop échoue sur `assert.deepEqual(p.skipped, [])` (skipped contient encore awesome-cursorrules).

- [ ] 1.3 **Implémente** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/matrix.mjs`, DEUX remplacements.

Remplacement A — bloc ACTUEL :
```js
const KARPATHY_REPO = 'https://github.com/multica-ai/andrej-karpathy-skills';
const CURSORRULES_REPO = 'https://github.com/PatrickJS/awesome-cursorrules';
const CURSOR_TAGS = { saas: ['typescript', 'react', 'clean-code'], mobile: ['react-native', 'typescript', 'expo'], desktop: ['typescript', 'clean-code'] };
```
Bloc REMPLACÉ :
```js
const KARPATHY_REPO = 'https://github.com/multica-ai/andrej-karpathy-skills';
// awesome-cursorrules : SUPPRIMÉ. Le matching par tags déversait 64-201 règles .mdc hors-sujet
// (Angular, Solidity…) avec `globs: **/*` — l'anti-pattern des docs Cursor. Les règles typées
// du kit (templates/cursor/rules/) couvrent le besoin.
```

Remplacement B — bloc ACTUEL :
```js
  if (isCursor) clones.push({ repo: CURSORRULES_REPO, matchTags: CURSOR_TAGS[stack], to: '.cursor/rules' });
  else skipped.push({ name: 'awesome-cursorrules', reason: 'Format .mdc spécifique à Cursor' });

  inAssistant.push({ name: 'superpowers', command: SUPERPOWERS[assistant] });
```
Bloc REMPLACÉ :
```js
  inAssistant.push({ name: 'superpowers', command: SUPERPOWERS[assistant] });
```

- [ ] 1.4 **Lance, vérifie que ça passe** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/matrix.test.mjs` → `# fail 0`, 4 tests verts.

- [ ] 1.5 **Purge le code mort `selectByTags`** — TROIS fichiers.

(a) `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs` — ligne d'import ACTUELLE :
```js
import { cloneRepo, pickFromClone, selectByTags, installCaveman, installSkills } from './lib/external.mjs';
```
REMPLACÉE par :
```js
import { cloneRepo, pickFromClone, installCaveman, installSkills } from './lib/external.mjs';
```

(b) `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs` — bloc ACTUEL (dans la boucle des clones) :
```js
      cloneRepo(cl.repo, tmp);
      if (cl.picks) pickFromClone(tmp, cl.picks, projectDir);
      else if (cl.matchTags) {
        const rulesDir = path.join(tmp, 'rules');
        for (const f of selectByTags(rulesDir, cl.matchTags)) copyIfAbsent(path.join(rulesDir, f), path.join(projectDir, cl.to, f), opt);
      }
      done.push(cl.repo);
```
Bloc REMPLACÉ :
```js
      cloneRepo(cl.repo, tmp);
      if (cl.picks) pickFromClone(tmp, cl.picks, projectDir);
      done.push(cl.repo);
```

(c) `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/external.mjs` — bloc ACTUEL :
```js
export function selectByTags(rulesDir, tags) {
  if (!fs.existsSync(rulesDir)) return [];
  return fs.readdirSync(rulesDir).filter(f => tags.some(t => f.toLowerCase().includes(t)));
}

export function installCaveman(run = defaultRun) {
```
Bloc REMPLACÉ :
```js
export function installCaveman(run = defaultRun) {
```

(d) `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/external.test.mjs` — bloc ACTUEL :
```js
import { selectByTags, pickFromClone, installCaveman, buildSkillAddArgs, installSkills } from './external.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vs-ext-')); }

test('selectByTags filtre par sous-chaîne', () => {
  const d = tmp();
  for (const f of ['typescript.mdc', 'react.mdc', 'python.mdc']) fs.writeFileSync(path.join(d, f), '');
  assert.deepEqual(selectByTags(d, ['typescript', 'react']).sort(), ['react.mdc', 'typescript.mdc']);
});
```
Bloc REMPLACÉ :
```js
import { pickFromClone, installCaveman, buildSkillAddArgs, installSkills } from './external.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vs-ext-')); }
```

- [ ] 1.6 **Vérifie** : `grep -rn "selectByTags\|matchTags\|CURSORRULES\|awesome-cursorrules" scripts/` ne doit RIEN retourner. Puis suite complète : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test` → `# fail 0` (128 tests : 129 − 1 test selectByTags supprimé).

- [ ] 1.7 **Commit** : `git add -A && git commit -m "feat(cursor): supprime le clone awesome-cursorrules (pollution de contexte)"`

---

## Tâche 2 — `docs/SETUP-AI.md` parle la langue de l'assistant + plugin au glossaire

Aujourd'hui `renderSetupAi` génère des instructions MCP identiques pour tous les assistants (`lance /mcp`). Pour **Cursor**, `/mcp` n'existe pas : on connecte via **Settings → MCP**. Un débutant Cursor tape `/mcp`, rien, bloqué. On rend le wording conditionnel par assistant, et on définit `/add-plugin` (le seul geste chat) au glossaire + une ligne de vérification.

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/setup-ai.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/setup-ai.test.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/guides/glossaire.md`

**Interfaces:**
- Consumes: `renderSetupAi({ stack, assistant, manifest, superpowersCmd, shadcnNote, skillsInstalled })` (le param `skillsInstalled` vient du Plan 7 tâche 6 ; s'il n'existe pas encore dans le fichier mergé, garde le comportement actuel de la section skills et n'ajoute QUE le wording MCP + superpowers de cette tâche).
- Produces: section « MCP » dont le texte dépend de `assistant` ; section superpowers avec ligne de vérification.

**Steps:**

- [ ] 2.1 **Écris le test qui échoue** — ajoute dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/setup-ai.test.mjs`, avant la dernière ligne `});` du fichier n'est PAS la cible : ajoute un nouveau bloc `test(...)` à la fin du fichier :

```js
test('SETUP-AI Cursor : jamais /mcp ni claude mcp add, mais Settings MCP', () => {
  const md = call('saas', 'cursor');
  assert.doesNotMatch(md, /lance `\/mcp`/);
  assert.doesNotMatch(md, /claude mcp add/);
  assert.match(md, /Settings.*MCP/i);
  assert.match(md, /\/brainstorm/); // ligne de vérification du plugin superpowers
});

test('SETUP-AI Claude Code : /mcp reste correct', () => {
  const md = call('saas', 'claude-code');
  assert.match(md, /\/mcp/);
});
```

- [ ] 2.2 **Lance, vérifie l'échec** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/setup-ai.test.mjs` → `# fail` (au moins le test Cursor échoue : `md` contient `lance /mcp` et pas `Settings … MCP`, pas de `/brainstorm`).

- [ ] 2.3 **Implémente** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/setup-ai.mjs`, RELIS d'abord le fichier. Localise la boucle de la section MCP (« ## 3. MCP à autoriser ») dont le corps est :
```js
  for (const [name, cfg] of Object.entries(manifest.mcp)) {
    L.push(`- [ ] ${name} : lance \`/mcp\` pour connecter${cfg.needsAuth ? ' (login requis)' : ' (déjà dans .mcp.json)'}`);
  }
```
REMPLACE-la par (le geste diffère par assistant) :
```js
  const connect = assistant === 'cursor'
    ? 'ouvre **Settings → MCP** dans Cursor et active-le'
    : 'lance `/mcp` pour connecter';
  for (const [name, cfg] of Object.entries(manifest.mcp)) {
    L.push(`- [ ] ${name} : ${connect}${cfg.needsAuth ? ' (login requis)' : ''}`);
  }
```
Puis localise la section superpowers (« ## 4. Boucle superpowers ») :
```js
  L.push('## 4. Boucle superpowers');
  L.push(`- [ ] ${superpowersCmd}`);
```
REMPLACE par :
```js
  L.push('## 4. Boucle superpowers');
  L.push(`- [ ] ${superpowersCmd}`);
  L.push('- [ ] Vérifie que c\'est actif : tape `/brainstorm` — si la commande est reconnue, superpowers est installé. Sinon, réinstalle le plugin (voir « plugin » au glossaire).');
```

- [ ] 2.4 **Lance, vérifie que ça passe** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/setup-ai.test.mjs` → `# fail 0`.

- [ ] 2.5 **Glossaire : définis « plugin »** — dans `/Users/antoinevigneau/best_practices_vibecoding/guides/glossaire.md`, section « 2. 🛠️ Le kit & ses commandes », après l'entrée `**/doctor**`, ajoute :
```md
- <a id="plugin"></a>**Plugin / `/add-plugin`** — Un **module qui ajoute des capacités** à ton assistant IA. Le kit en utilise un : **superpowers** (la boucle brainstorm→plan→TDD→review). Tu l'installes une fois en tapant `/add-plugin superpowers` (Cursor) dans le chat. *Ex. : après l'install, la commande `/brainstorm` devient disponible.*
```

- [ ] 2.6 **Vérifie + commit** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test` → `# fail 0`. Puis `git add -A && git commit -m "feat(setup-ai): wording MCP par assistant + vérif plugin superpowers + glossaire plugin"`

---

## Tâche 3 — Phase 5 maquette à 3 entrées (aucun péage Stitch)

`templates/commands/new-project.md` Phase 5 suppose aujourd'hui qu'on crée la maquette sur Stitch. Un élève sans clé/quota est coincé. On ouvre 3 entrées : (a) maquette Stitch existante → import via MCP ; (b) maquette ailleurs → dépôt dans `maquette/` ; (c) rien → Stitch si connecté, SINON l'IA dessine des wireframes HTML directement dans `maquette/`. Même contrat aval : des fichiers HTML dans `maquette/` + une galerie `maquette/index.html`.

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/new-project.md`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/validate-commands.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/validate-commands.test.mjs`

**Interfaces:**
- Consumes: `validateNewProjectCommand(root)` → `string[]` (erreurs). DEPTH est la liste de marqueurs de profondeur.
- Produces: nouveau marqueur DEPTH `'index.html'` (prouve l'aiguillage maquette 3 entrées + galerie).

**Steps:**

- [ ] 3.1 **Écris le test qui échoue** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/validate-commands.test.mjs`, localise la constante `DEPTH` (elle contient déjà `'EXPERIENCE.md', 'maquette'`) et ajoute `'index.html'` à la fin du tableau. Idem : le test « runbook complet » utilise `makeRoot()` qui écrit `DEPTH.join(' ')` — donc le test échouera tant que `new-project.md` réel ne contient pas `index.html`, MAIS le test unitaire de la fixture restera vert (il écrit lui-même le marqueur). Le vrai garde-fou est le test d'intégration `new-project-runbook.test.mjs` qui lit le VRAI fichier.

- [ ] 3.2 **Ajoute le marqueur au validateur** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/validate-commands.mjs`, localise la constante `DEPTH` (contient `'EXPERIENCE.md', 'maquette'`) et ajoute `, 'index.html'` à la fin du tableau.

- [ ] 3.3 **Lance, vérifie l'échec** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/new-project-runbook.test.mjs` → `# fail 1` (le VRAI `new-project.md` ne contient pas encore `index.html`).

- [ ] 3.4 **Implémente** — dans `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/new-project.md`, RELIS la Phase 5. Localise le bloc « **1. Maquette des écrans clés (créer → itérer → valider)** » (le paragraphe qui commence par « Avec **Google Stitch** … » jusqu'à la puce « Le skill **`design-md`** … »). REMPLACE tout ce bloc « 1. … » par :

```md
**1. La maquette (le pivot) — 3 entrées possibles, aucune ne bloque**

Demande d'abord à l'utilisateur laquelle correspond :

- **(a) « J'ai déjà une maquette sur Stitch »** → connecte le MCP Stitch (voir `docs/SETUP-AI.md`), puis `list_projects` → `list_screens` → pour chaque écran validé, récupère le `htmlCode` (`get_screen`) et **écris-le dans `maquette/<ecran>.html`**.
- **(b) « J'ai une maquette ailleurs » (Figma, images, HTML)** → demande-lui de **déposer ses exports/captures dans `maquette/`** (un fichier par écran). Tu t'en serviras de référence visuelle.
- **(c) « Je n'ai pas de maquette »** → on la crée :
  - Si le MCP Stitch est connecté : `generate_screen_from_text` (skill `stitch::generate-design`) → itère → importe le HTML dans `maquette/`.
  - **Sinon (pas de Stitch — cas par défaut)** : **génère toi-même des wireframes HTML/CSS sobres** (Tailwind CDN, gris/noir/blanc, pas de logique) directement dans `maquette/<ecran>.html`, un par écran porteur (entrée canonique, écran héros du flux le plus complexe, un overlay, la vue liste/dashboard). Appuie-toi sur les parcours **UJ-*** du PRD.

**Itère jusqu'à validation** : montre, applique les retours, recommence. Vrai aller-retour, pas un one-shot.

**Génère la galerie `maquette/index.html`** : une page qui liste chaque écran dans une `<iframe>` (titre + aperçu), pour valider toute la maquette d'un coup d'œil dans le navigateur.

> Stitch est un **bonus** (maquettes IA plus léchées), jamais un péage : sans clé, le chemin (c) par wireframes HTML produit exactement le même livrable (`maquette/*.html`) pour la Phase 6.
```

- [ ] 3.5 **Corrige les références au projet généré (même fichier)** — RELIS `new-project.md`. (i) Toute référence à des chemins du KIT absents du projet généré (`stacks/`, `templates/`) doit devenir un chemin DU PROJET GÉNÉRÉ (`docs/`, `AGENTS.md`, `.cursor/rules/`). (ii) Si la Phase 3 « Choix de la stack » fait RE-choisir une stack : remplace par « La stack est déjà fixée (voir `AGENTS.md`) — lis-la, ne redemande pas. » (iii) Toute instruction « écris `AGENTS.md` » devient « **complète** l'`AGENTS.md` existant (ne l'écrase pas) ». Applique ces 3 corrections là où les motifs apparaissent (utilise `grep -n "stacks/\|templates/\|Choix de la stack\|écris.*AGENTS" templates/commands/new-project.md` pour les localiser).

- [ ] 3.6 **Lance, vérifie que ça passe** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/new-project-runbook.test.mjs` puis `... --test` complet → `# fail 0`.

- [ ] 3.7 **Commit** : `git add -A && git commit -m "feat(maquette): Phase 5 à 3 entrées (Stitch import / dépôt / wireframes IA) + galerie index.html"`

---

## Tâche 4 — `COLLE-MOI-DANS-L-IA.md` : le prompt final survit au terminal

Le prompt de démarrage n'existe qu'en sortie terminal (perdu dès qu'on ferme). On l'écrit aussi dans un fichier racine évident du projet généré, dans tous les modes.

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs`
- Test: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/colle-moi.test.mjs` (nouveau)

**Interfaces:**
- Consumes: la variable qui contient les lignes du prompt final (dans le Plan 7, le prompt s'affiche dans tous les modes ; repère le tableau de lignes construites avant le `console.log`).
- Produces: `<projet>/COLLE-MOI-DANS-L-IA.md` écrit à chaque run ; le rapport final pointe vers ce fichier.

**Steps:**

- [ ] 4.1 **Écris le test qui échoue** — `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/colle-moi.test.mjs` :
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const NODE = process.execPath;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

test('COLLE-MOI-DANS-L-IA.md est écrit à la racine du projet généré', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-colle-'));
  const proj = path.join(dir, 'app');
  execFileSync(NODE, ['scripts/setup.mjs', '--stack', 'saas', '--assistant', 'cursor', '--project', proj, '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe' });
  const f = path.join(proj, 'COLLE-MOI-DANS-L-IA.md');
  assert.ok(fs.existsSync(f), 'fichier présent');
  assert.match(fs.readFileSync(f, 'utf8'), /\/new-project/);
  fs.rmSync(dir, { recursive: true, force: true });
});
```
(Note : `--yes` vient du Plan 7 tâche 2/3. Si absent du binaire mergé, adapte l'invocation au mode non-interactif réel.)

- [ ] 4.2 **Lance, vérifie l'échec** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/colle-moi.test.mjs` → `# fail 1` (fichier absent).

- [ ] 4.3 **Implémente** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs`, RELIS la zone du prompt final (les lignes construites puis `console.log`). Juste APRÈS la construction du tableau de lignes du prompt (nomme-le `promptLines` s'il ne l'est pas), et AVANT/APRÈS le `console.log`, ajoute l'écriture fichier :
```js
    const promptFile = path.join(projectDir, 'COLLE-MOI-DANS-L-IA.md');
    fs.writeFileSync(promptFile, ['# À coller dans ton assistant IA', '', ...promptLines, ''].join('\n'));
    done.push('COLLE-MOI-DANS-L-IA.md');
```
Si le prompt n'est pas déjà un tableau de lignes réutilisable, extrais-le d'abord dans `const promptLines = [ ... ]` puis `console.log(promptLines.join('\n'))` ET l'écriture fichier ci-dessus (une seule source).

- [ ] 4.4 **Lance, vérifie que ça passe** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/colle-moi.test.mjs` → `# fail 0`.

- [ ] 4.5 **Commit** : `git add -A && git commit -m "feat(setup): écrit le prompt de démarrage dans COLLE-MOI-DANS-L-IA.md"`

---

## Tâche 5 — Commande `/next` : le GPS « je fais quoi maintenant ? »

Commande refuge : l'élève perdu tape `/next`, l'IA lit l'état du projet et répond en 3 lignes. Zéro modification de fichier.

**Files:**
- Create: `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/next.md`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs` (boucle des commandes)
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/cursor-commands.test.mjs`

**Interfaces:**
- Consumes: la boucle `for (const cmd of [...])` de `setup.mjs` qui copie chaque `templates/commands/<cmd>.md` vers `commandsDir`.
- Produces: `/next` copié dans `.cursor/commands/next.md` (et équivalents).

**Steps:**

- [ ] 5.1 **Crée le runbook** — `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/next.md` :
```md
# /next — Où j'en suis et quoi faire maintenant (runbook IA)

L'utilisateur est perdu ou reprend après une pause. Ne modifie RIEN. Lis, puis réponds **court et rassurant**.

1. Lis `docs/ROADMAP.md` → trouve le **1er jalon non coché** dont les dépendances sont cochées.
2. Lis `git status` (fichiers en cours) et `git log --oneline -3` (dernier travail).
3. Lis `docs/memory/index.md` (le dernier piège noté, s'il y en a un).

Réponds en **3 lignes maximum**, en français simple :
- **Où tu en es** : le dernier jalon terminé (ou « tu démarres »).
- **Ta prochaine action** : le prochain jalon en une phrase concrète.
- **La commande à taper** : `/build` (continuer la roadmap), `/new-project` (rien n'existe encore), ou `/sos` (quelque chose est cassé).

Si rien n'existe encore (`docs/ROADMAP.md` absent) : dis-le et propose `/new-project`.
```

- [ ] 5.2 **Câble la commande** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs`, localise la boucle :
```js
  for (const cmd of ['new-project', 'new-feature', 'edit-design', 'doctor', 'build']) {
```
REMPLACE le tableau par :
```js
  for (const cmd of ['new-project', 'new-feature', 'edit-design', 'doctor', 'build', 'next', 'sos']) {
```
(`sos` est créé en Tâche 6 ; si tu exécutes 5 avant 6, crée un `templates/commands/sos.md` minimal d'abord OU exécute 6 avant la vérification finale de 5. Recommandé : fais 5 puis 6, et lance la suite après 6.)

- [ ] 5.3 **Test de présence** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/cursor-commands.test.mjs`, RELIS le test existant (il génère un projet cursor `--no-skills` et vérifie la présence des `.cursor/commands/<cmd>.md`). Ajoute `next` (et `sos`) à la liste de commandes vérifiée dans ce test.

- [ ] 5.4 **Lance** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/cursor-commands.test.mjs` → vert (après Tâche 6 pour `sos`).

- [ ] 5.5 **Commit** : `git add -A && git commit -m "feat(commands): /next — GPS de la prochaine action pour l'élève"`

---

## Tâche 6 — `/sos` + tags `jalon-NN` + règle des 3 essais (anti-doom-loop)

Le « doom loop » (l'IA re-corrige à l'infini) est le point d'abandon n°1. Trois garde-fous : une commande panique `/sos`, des points de restauration git par jalon, et une règle qui arrête l'IA après 3 échecs.

**Files:**
- Create: `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/sos.md`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/build.md`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/templates/agents/loop-section.md`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/templates/cursor/rules/00-project.mdc`

**Steps:**

- [ ] 6.1 **Crée `/sos`** — `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/sos.md` :
```md
# /sos — Quelque chose est cassé, on répare calmement (runbook IA)

Ton élève est bloqué et peut-être stressé. Ton rôle : **rassurer d'abord** (« tu ne peux rien casser définitivement, tout est sauvegardé »), puis proposer une sortie.

1. **Diagnostique sans rien changer** : quelle est la dernière erreur (test, terminal, écran) ? Résume-la en **1 phrase simple**, sans jargon.
2. Propose **3 sorties**, l'utilisateur choisit :
   - **A. Réparer** → `superpowers:systematic-debugging` (comprendre AVANT de corriger). Rappel : max **3 essais** (voir règle des 3 essais).
   - **B. Mettre de côté** → `git stash` (le travail en cours est rangé, pas perdu ; `git stash pop` le ramène).
   - **C. Revenir au dernier point vert** → liste les tags `git tag -l "jalon-*"`, propose le plus récent, et `git checkout <tag>` (l'app revient à un état qui marchait).
3. Quoi qu'il arrive, note le problème dans `docs/memory/gotchas.md` pour ne pas le revivre.

Ton : simple, français, zéro reproche. L'objectif est que l'élève reparte serein.
```

- [ ] 6.2 **Tag par jalon vert dans `/build`** — dans `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/build.md`, RELIS le fichier. Localise l'étape « **5. Coche** le jalon … commit. ». REMPLACE-la par :
```md
5. **Coche** le jalon dans `docs/ROADMAP.md`, note tout piège dans `docs/memory/`, commit — puis pose un **point de restauration** : `git tag jalon-NN-<slug>` (NN = numéro du jalon). C'est le filet de `/sos` (retour à un état qui marche).
```
(Garde le « NN » cohérent avec la numérotation des jalons du fichier.)

- [ ] 6.3 **Règle des 3 essais — `loop-section.md`** — dans `/Users/antoinevigneau/best_practices_vibecoding/templates/agents/loop-section.md`, localise la ligne « **Transverses** : … ». Juste APRÈS le paragraphe Transverses, ajoute :
```md
**Règle des 3 essais (anti-boucle infinie)** : si 3 corrections successives sur le **même** bug échouent → STOP. Reviens au dernier état vert (dernier commit/tag `jalon-*`), écris le bug dans `docs/memory/gotchas.md`, et **repars d'une conversation neuve**. Ne t'acharne jamais : re-corriger en boucle empire le code.
```

- [ ] 6.4 **Règle des 3 essais — `00-project.mdc`** — dans `/Users/antoinevigneau/best_practices_vibecoding/templates/cursor/rules/00-project.mdc`, ajoute une puce à la fin de la liste :
```md
- **Règle des 3 essais** : 3 corrections ratées sur le même bug → arrête, reviens au dernier état vert, note le bug dans `docs/memory/`, repars propre. Jamais d'acharnement.
```

- [ ] 6.5 **Lance la suite** (câblage `/sos` fait en Tâche 5) : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test` → `# fail 0` (le test cursor-commands vérifie maintenant `next` ET `sos`).

- [ ] 6.6 **Commit** : `git add -A && git commit -m "feat(safety): /sos + tags jalon-NN + règle des 3 essais anti-doom-loop"`

---

## Tâche 7 — Mode apprentissage par défaut

Le différenciateur pédagogique : l'IA explique ce qu'elle construit et vérifie que l'élève suit. Activé par défaut, désactivable au wizard (`--no-learning` en non-interactif).

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/wizard.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/args.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/templates.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs`
- Test: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/templates.test.mjs` (ou le test existant de renderProjectAgentsMd), `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/wizard.test.mjs`

**Interfaces:**
- Produces: `args.learning` (booléen, défaut `true`) ; `renderProjectAgentsMd({..., learning})` insère une section « Mode apprentissage » quand `learning !== false`.

**Steps:**

- [ ] 7.1 **Écris le test qui échoue** — dans le test de `templates.mjs` (crée `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/templates.test.mjs` s'il n'existe pas) :
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderProjectAgentsMd } from './templates.mjs';

test('mode apprentissage : section présente par défaut, absente si learning:false', () => {
  const on = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', learning: true });
  assert.match(on, /Mode apprentissage/);
  assert.match(on, /question de compréhension/i);
  const off = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', learning: false });
  assert.doesNotMatch(off, /Mode apprentissage/);
});
```

- [ ] 7.2 **Lance, vérifie l'échec** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/templates.test.mjs` → `# fail`.

- [ ] 7.3 **Implémente `renderProjectAgentsMd`** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/templates.mjs`, remplace la signature ACTUELLE :
```js
export function renderProjectAgentsMd({ stack, assistant, commandsDir = '', loopSection = '', designRule = '', memoryRules = '' }) {
```
par :
```js
export function renderProjectAgentsMd({ stack, assistant, commandsDir = '', loopSection = '', designRule = '', memoryRules = '', learning = true }) {
  const learningSection = learning === false ? '' : `## Mode apprentissage
À chaque jalon terminé : (1) explique en **3 puces simples** ce que tu viens de construire et **pourquoi** ; (2) pose **une question de compréhension** à l'utilisateur et **attends sa réponse** avant de continuer ; (3) \`/build --all\` est **désactivé** (on avance jalon par jalon). Objectif : l'utilisateur comprend, il ne subit pas.

`;
```
Puis insère `${learningSection}` dans le template retourné, juste après la ligne `${memoryRules}` (avant `## Contexte de la stack`).

- [ ] 7.4 **Lance, vérifie que ça passe** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/templates.test.mjs` → `# fail 0`.

- [ ] 7.5 **Wizard : question apprentissage** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/wizard.mjs`, RELIS `runWizard`. Après le bloc caveman (ou, si la Tâche 10 l'a retiré, à sa place), avant le `return`, ajoute :
```js
  const rawL = (await ask('  Mode apprentissage — l\'IA t\'explique ce qu\'elle fait et vérifie que tu suis ? [O/n] : ')).trim().toLowerCase();
  const learning = !['n', 'non', 'no'].includes(rawL);
  out.write(ok(learning ? 'mode apprentissage activé' : 'mode apprentissage désactivé', on) + '\n\n');
```
et ajoute `learning` à l'objet retourné : `return { stack, assistant, project, backend, caveman, learning };`. Puis dans `buildArgsFromAnswers`, ajoute `learning: a.learning !== false,` à l'objet `args`.

- [ ] 7.6 **args.mjs : flag `--no-learning`** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/args.mjs`, RELIS `parseArgs`. Ajoute la gestion de `--no-learning` → `args.learning = false` (défaut `true` si absent). Modèle-toi sur la gestion existante de `--no-skills`/`--force`.

- [ ] 7.7 **setup.mjs : passe `learning`** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/setup.mjs`, localise l'appel `renderProjectAgentsMd({ ...args, ... })`. Vérifie que `learning: args.learning` est bien transmis (via le spread `...args` c'est automatique si `args.learning` existe ; sinon ajoute-le explicitement).

- [ ] 7.8 **Lance + commit** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test` → `# fail 0`. Puis `git add -A && git commit -m "feat(apprentissage): mode apprentissage par défaut (explications + question par jalon)"`

---

## Tâche 8 — Deeplinks `cursor://` pour les MCP (1 clic au lieu de coller du JSON)

Pour Cursor, chaque MCP sans secret peut s'installer d'un clic via un deeplink. On l'ajoute à `docs/SETUP-AI.md`. Stitch (clé secrète) reste en config user-scope manuelle.

**Files:**
- Create: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/deeplink.mjs`
- Create: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/deeplink.test.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/setup-ai.mjs`

**Interfaces:**
- Produces: `cursorDeeplink(name, cfg)` → `string` URL `cursor://anysphere.cursor-deeplink/mcp/install?name=<name>&config=<base64(JSON de cfg sans métas)>`.

**Steps:**

- [ ] 8.1 **Écris le test qui échoue** — `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/deeplink.test.mjs` :
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cursorDeeplink } from './deeplink.mjs';

test('cursorDeeplink : base64 décodable et fidèle à la config', () => {
  const url = cursorDeeplink('convex', { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] });
  assert.match(url, /^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=convex&config=/);
  const b64 = url.split('config=')[1];
  const decoded = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  assert.deepEqual(decoded, { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] });
});
```

- [ ] 8.2 **Lance, vérifie l'échec** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/deeplink.test.mjs` → `# fail 1` (module absent).

- [ ] 8.3 **Implémente** — `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/deeplink.mjs` :
```js
// Deeplink d'installation MCP Cursor (cursor.com/docs/context/mcp/install-links).
// N'inclut PAS les métas internes ni les serveurs à secret (clé jamais dans une URL).
export function cursorDeeplink(name, cfg) {
  const { needsAuth, apiKey, ...clean } = cfg;
  const b64 = Buffer.from(JSON.stringify(clean), 'utf8').toString('base64');
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${name}&config=${b64}`;
}
```

- [ ] 8.4 **Lance, vérifie que ça passe** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/deeplink.test.mjs` → `# fail 0`.

- [ ] 8.5 **Câble dans SETUP-AI (Cursor uniquement, hors serveurs à secret)** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/setup-ai.mjs`, importe en tête `import { cursorDeeplink } from './deeplink.mjs';`. Dans la boucle MCP (modifiée en Tâche 2), à l'intérieur, ajoute pour Cursor et si le serveur n'a pas de clé secrète :
```js
    if (assistant === 'cursor' && !cfg.apiKey) L.push(`  - ou clique pour l'ajouter : ${cursorDeeplink(name, cfg)}`);
```

- [ ] 8.6 **Lance + commit** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test` → `# fail 0`. Puis `git add -A && git commit -m "feat(cursor): deeplinks d'installation MCP (1 clic) dans SETUP-AI"`

---

## Tâche 9 — `/doctor` étendu = critère officiel de fin d'installation

L'élève doit pouvoir vérifier « c'est bon » AVANT `/new-project`, pas découvrir un problème quand ça plante.

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/doctor.md`

**Steps:**

- [ ] 9.1 **Étends le runbook** — dans `/Users/antoinevigneau/best_practices_vibecoding/templates/commands/doctor.md`, RELIS le fichier. Localise la ligne finale « Termine par un résumé … ». Juste AVANT elle, ajoute ces vérifications :
```md
10. **Skills installés** : le dossier `.agents/skills/` (ou `.cursor/…`) contient bien les skills attendus (design + stack). Sinon → relance les commandes de `docs/SETUP-AI.md` section Skills.
11. **MCP joignables** : pour chaque serveur HTTP de `.cursor/mcp.json`/`.mcp.json`, teste `curl -m 5 -o /dev/null -s -w '%{http_code}' <url>` — un code (même 401/405) prouve qu'il répond ; « timeout » = pas joignable.
12. **Plugin superpowers** : demande à l'utilisateur de taper `/brainstorm` — si reconnu, c'est bon ; sinon, réinstaller (`/add-plugin superpowers`).
13. **Maquette Stitch (optionnel)** : si l'utilisateur veut Stitch, vérifie que le MCP `stitch` est configuré (user-scope) et que la clé `STITCH_API_KEY` est présente dans l'environnement.

**Verdict final** : si TOUT est ✓ (1 à 13), écris clairement : « ✅ Ton environnement est prêt — tu peux lancer `/new-project` ». C'est le **critère officiel de fin d'installation**. Sinon, liste les ✗ et la commande exacte pour chacun.
```

- [ ] 9.2 **Lance** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test` → `# fail 0` (aucun test cassé ; c'est un template).

- [ ] 9.3 **Commit** : `git add -A && git commit -m "feat(doctor): vérifs skills/MCP/plugin + verdict = fin d'installation"`

---

## Tâche 10 — Corrections factuelles + README + glossaire

Corrige la justification obsolète `${env:}`, et reflète les nouveautés (maquette 3 entrées, /next, /sos, mode apprentissage) dans la vitrine + le glossaire.

**Files:**
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/matrix.mjs`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/README.md`
- Modify: `/Users/antoinevigneau/best_practices_vibecoding/guides/glossaire.md`

**Steps:**

- [ ] 10.1 **Corrige la justification `${env:}`** — dans `/Users/antoinevigneau/best_practices_vibecoding/scripts/lib/matrix.mjs`, RELIS le commentaire du bloc `const STITCH`. La phrase « Cursor n'interpole pas `${env:...}` dans les headers des MCP distants » est obsolète (Cursor l'interpole désormais, cursor.com/docs/context/mcp). REMPLACE la justification par : `// Config MCP au niveau UTILISATEUR (hors dépôt) : la clé n'est jamais commitée. (Cursor sait interpoler ${env:...} ; on garde le user-scope pour la simplicité — une seule clé, tous les projets.)`. Ne change PAS le comportement (le `STITCH.mcp` reste user-scope).

- [ ] 10.2 **README : reflète /next, /sos, mode apprentissage, maquette 3 entrées** — dans `/Users/antoinevigneau/best_practices_vibecoding/README.md` :
  - Dans le tableau « Les commandes », ajoute deux lignes : `| **`/next`** | « Je fais quoi maintenant ? » — l'IA lit l'état du projet et te donne ta prochaine action |` et `| **`/sos`** | Quelque chose casse : diagnostic rassurant + 3 sorties (réparer / mettre de côté / revenir au dernier point vert) |`.
  - Dans la ligne « 🎨 Maquette-first » de la table des fonctionnalités, remplace la description par : `ta maquette Stitch (importée), ta maquette existante (déposée), ou **l'IA la dessine** (wireframes) — puis la **roadmap découle de la maquette validée**`.
  - Ajoute une ligne fonctionnalité : `| 🎓 | **Mode apprentissage** | l'IA explique ce qu'elle construit et te pose une question de compréhension à chaque jalon — tu comprends, tu ne subis pas |`.

- [ ] 10.3 **Glossaire : /next, /sos, mode apprentissage, doom loop** — dans `/Users/antoinevigneau/best_practices_vibecoding/guides/glossaire.md`, section « 2. 🛠️ Le kit & ses commandes », ajoute :
```md
- **`/next`** — La commande **GPS** : quand tu es perdu, elle lit où tu en es et te dit ta prochaine action. *Ex. : tu reviens après 3 jours → `/next` te remet sur les rails.*
- **`/sos`** — Le **bouton panique** : quelque chose casse, l'IA diagnostique calmement et propose 3 sorties (réparer / mettre de côté / revenir au dernier point qui marchait). *Ex. : « rien ne s'affiche » → `/sos`.*
- <a id="doom-loop"></a>**Doom loop (boucle infernale)** — Quand l'IA corrige un bug, en crée un autre, re-corrige… sans fin. Le kit l'empêche avec la **règle des 3 essais** (3 échecs → on s'arrête, on revient au dernier point vert). *Ex. : c'est la cause n°1 d'abandon — le kit te protège.*
- **Mode apprentissage** — Réglage (par défaut activé) où l'IA **explique ce qu'elle fait** et te pose **une question de compréhension** à chaque jalon. *Ex. : tu apprends en construisant au lieu de copier sans comprendre.*
```

- [ ] 10.4 **Lance + commit** : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test` → `# fail 0`. Puis `git add -A && git commit -m "docs: corrige justif env: + README/glossaire (/next, /sos, apprentissage, maquette 3 entrées)"`

---

## Auto-revue (à cocher avant de considérer le plan prêt)

- [ ] **Couverture du scope** : dépollution Cursor (T1), docs par assistant (T2), maquette 3 entrées + galerie (T3), prompt persistant (T4), /next (T5), /sos + tags + 3 essais (T6), mode apprentissage (T7), deeplinks (T8), /doctor étendu (T9), corrections + vitrine (T10). ✅
- [ ] **Zéro placeholder** : chaque tâche a un test (ou une raison de ne pas en avoir — templates markdown), un code d'implémentation, une commande de vérification, un commit.
- [ ] **Ordre exécutable** : T5 crée la boucle qui référence `sos` (T6) — lancer la suite après T6 (noté dans T5.2/T5.4). T2/T8 touchent la même boucle MCP de `setup-ai.mjs` — T8 s'exécute après T2.
- [ ] **Prérequis Plan 7** : rappelé en tête ; chaque bloc ACTUEL à re-vérifier avant édition (les fichiers `setup.mjs`, `wizard.mjs`, `setup-ai.mjs` sont touchés par les deux plans).
- [ ] **Cohérence signatures** : `renderProjectAgentsMd({..., learning})` (T7) ; `cursorDeeplink(name, cfg)` (T8) ; `args.learning` (T7) — consommés là où définis.
- [ ] **Contraintes** : français partout ; zéro dépendance npm ; pas de « formation »/« accompagnement » dans les templates ; pas de secret écrit ; node = chemin absolu dans chaque commande Run.
