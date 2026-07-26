# Crew d'agents + boucle de preuve (anti « c'est fait » bidon) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre impossible le « c'est fait » non prouvé. (1) Une **boucle de preuve** avec statuts `PROUVÉ / NON PROUVÉ / BLOQUÉ`, hiérarchie de preuve et détections de faux succès. (2) Un **crew d'agents** dont chacun embarque ses règles + ses skills + ses MCP + son modèle. (3) Un **journal de mission partagé** pour que les agents sachent ce que les autres ont fait. (4) Une **gate sécurité par feature** avec tests négatifs. (5) PixelRAG repositionné : **lecture** (audit) obligatoire, **jugement** non bloquant.

**Architecture:** Tout est fichiers Markdown + frontmatter d'agent (zéro dépendance). Les sous-agents **ne voient pas** `CLAUDE.md` (doc officielle) → chaque agent embarque ses règles. Le gate visuel devient déterministe (ARIA snapshot + dead-click + réseau) ; PixelRAG reste l'outil de **lecture** exhaustive de la maquette.

**Tech Stack:** Markdown (règles, agents, runbooks) + JS (`kit-owned.mjs`, `validate-commands.mjs`, `environment.mjs`) + `node --test`.

## Global Constraints

- Tests : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`. Suite verte à chaque task.
- **Les sous-agents ne voient pas `AGENTS.md`/`CLAUDE.md`** → tout agent doit porter ses règles OU nommer les fichiers exacts à lire.
- **Aucun fan-out de sous-agents qui ÉCRIVENT du code** (décisions implicites contradictoires). Fan-out = lecture/critique uniquement.
- Frontmatter d'agent : `name` + `description` requis ; `skills`, `mcpServers`, `model`, `tools` optionnels. **Cible 40-80 lignes** par agent.
- Modèle par rôle : **`claude-opus-5`** pour architecture/sécurité, **`claude-sonnet-5`** pour build/test/docs/critiques.
- Mots **interdits** dans les rapports d'agents : « fait », « ça marche », « implémenté » sans preuve collée.
- Français, accents corrects. Jamais « formation »/« accompagnement ».
- Ne casse pas : `validateNewProjectCommand`, `validateExtras`, `kitOwnedFiles`, tests existants. Après édition de commande : régénérer `cursor-plugin/`.

---

## File Structure

- `templates/agents/proof-rule.md` — **créer** : la boucle de preuve (règle standing).
- `templates/agents/subagents/verificateur.md` — **créer** : le grader en contexte frais.
- `templates/agents/subagents/{test-runner,security-reviewer,code-reviewer,critique-produit,critique-donnees,critique-ux}.md` — **enrichir** (frontmatter skills/mcpServers/model + règles embarquées).
- `templates/journal/JOURNAL.md` + `templates/journal/state.yaml` — **créer** (graines).
- `scripts/lib/environment.mjs` — copier les graines dans `docs/agents/`.
- `scripts/lib/templates.mjs` + `agents-file.mjs` + `validate-commands.mjs` — câbler `proofRule`.
- `templates/agents/verify-rule.md` — gate déterministe ; PixelRAG non bloquant.
- `templates/commands/new-project.md` — Phase 6 : PixelRAG en **lecture** (inchangé) ; mention journal.
- `scripts/lib/kit-owned.mjs` + tests.
- `package.json` → `0.11.0` ; `cursor-plugin/` régénéré.

---

## Task 1 : Règle standing « Preuve » (statuts + hiérarchie + interdits)

**Files:**
- Create: `templates/agents/proof-rule.md`
- Modify: `scripts/lib/templates.mjs`, `scripts/lib/agents-file.mjs`, `scripts/lib/validate-commands.mjs`, `scripts/lib/validate-commands.test.mjs`
- Test: `scripts/lib/proof.test.mjs` (créer), `scripts/lib/templates.test.mjs`

**Interfaces:**
- Produces: section « Règle Preuve » dans `AGENTS.md`/`CLAUDE.md` ; param `proofRule` dans `renderProjectAgentsMd` / `renderAgentsFile`.

- [ ] **Step 1 : Écrire `templates/agents/proof-rule.md`**

```md
## Règle Preuve (statuts, hiérarchie, interdits)

Un agent qui dit « c'est fait » n'apporte **aucune** information : les agents saturent les tests qu'ils voient (95-100 %) pendant que les tests cachés tombent à 35 %. Ici, on ne déclare pas — on **prouve**.

### Statuts autorisés
**PROUVÉ** · **NON PROUVÉ** · **BLOQUÉ**. Les mots « fait », « ça marche », « implémenté », « terminé » **sans preuve collée** sont interdits.
- **PROUVÉ** = la commande est écrite, sa **sortie brute est collée**, et elle sort en code 0.
- **NON PROUVÉ** = tu ne peux pas produire la preuve → dis-le, avec ce qui manque.
- **BLOQUÉ** = tu ne peux pas avancer → dis **ce qui échoue**, **ce que tu as essayé**, **ton hypothèse**. Dire « bloqué » est un **succès**, pas un échec.

### Hiérarchie de preuve (du plus faible au plus fort)
0. « L'agent déclare que c'est fait » → **nul, jamais accepté**.
1. Build / typecheck / lint verts → faible (absence d'erreur grossière).
2. Tests écrits par l'agent dans le même run → **faible et circulaire**.
3. Test committé **ROUGE avant** le code → moyen (rompt la circularité).
4. **Parcours réel** : navigateur/simulateur + **≥1 requête réseau observée** + état revérifié **après rechargement** → fort.
5. Critère vérifié par un test que l'agent **n'a pas écrit**, jugé en **contexte frais** → maximal.

### Interdits (non négociables)
- **Modifier, supprimer, skipper** (`.skip`, `xit`, `it.only`) ou assouplir un test pour passer au vert. Un test doit changer ? **Arrête-toi et demande.**
- Livrer **mock, `faker`, lorem, données en dur, TODO/FIXME, stub** hors des fichiers de test.
- Cocher une tâche sans avoir collé la **sortie de la commande** dans `docs/agents/JOURNAL.md`.
- Déclarer une feature UI finie sans qu'un **parcours réel** ait tourné.

### Boucle
**Maximum 3 tentatives** sur le même check. À la 3ᵉ : **BLOQUÉ** + ce qui échoue + ce que tu as essayé + ton hypothèse. Ne boucle jamais « jusqu'à ce que ça marche ».
```

- [ ] **Step 2 : Tests (échouent)**

Crée `scripts/lib/proof.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('proof-rule : statuts, hiérarchie, interdits, max 3 tentatives', () => {
  const t = read('templates/agents/proof-rule.md');
  for (const s of ['PROUVÉ', 'NON PROUVÉ', 'BLOQUÉ', 'sortie brute', 'ROUGE avant', 'requête réseau', 'contexte frais', 'skip', '3 tentatives']) {
    assert.match(t, new RegExp(s));
  }
});
```

Dans `scripts/lib/templates.test.mjs`, ajoute `proofRule: 'REGLE-PREUVE'` à l'appel du test `renderProjectAgentsMd compose…` + `assert.match(out, /REGLE-PREUVE/);`.

- [ ] **Step 3 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/proof.test.mjs scripts/lib/templates.test.mjs`
Expected : FAIL.

- [ ] **Step 4 : Câbler**

`scripts/lib/templates.mjs` : ajoute `proofRule = ''` à la signature ; place `${proofRule}` dans le `body` **juste après `${realityRule}`**.
`scripts/lib/agents-file.mjs` : ajoute `proofRule: snip('proof-rule.md'),`.
`scripts/lib/validate-commands.mjs` : ajoute `'templates/agents/proof-rule.md'` à `AGENTS_TEMPLATES`.
`scripts/lib/validate-commands.test.mjs` : ajoute `fs.writeFileSync(path.join(root, 'templates/agents/proof-rule.md'), 'proof');` dans le fixture.

- [ ] **Step 5 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/proof.test.mjs scripts/lib/templates.test.mjs scripts/lib/validate-commands.test.mjs scripts/lib/new-project-runbook.test.mjs`
Expected : PASS.

- [ ] **Step 6 : Commit**

```bash
git add templates/agents/proof-rule.md scripts/lib/templates.mjs scripts/lib/agents-file.mjs scripts/lib/validate-commands.mjs scripts/lib/validate-commands.test.mjs scripts/lib/proof.test.mjs scripts/lib/templates.test.mjs
git commit -m "feat(preuve): règle standing — statuts PROUVÉ/NON PROUVÉ/BLOQUÉ, hiérarchie de preuve, interdits"
```

---

## Task 2 : Journal de mission partagé (`JOURNAL.md` + `state.yaml`)

**Files:**
- Create: `templates/journal/JOURNAL.md`, `templates/journal/state.yaml`
- Modify: `scripts/lib/environment.mjs`, `scripts/lib/validate-commands.mjs` (`validateExtras`)
- Test: `scripts/lib/proof.test.mjs` (étendre)

**Interfaces:**
- Produces: `docs/agents/JOURNAL.md` (append-only) + `docs/agents/state.yaml` dans tout projet scaffoldé.

- [ ] **Step 1 : Graine `templates/journal/JOURNAL.md`**

```md
# Journal des agents (append-only)

Chaque agent **lit ce fichier avant** de commencer, et **ajoute une ligne après** — c'est la mémoire partagée du crew. On n'efface jamais, on ajoute.

Format : `AAAA-MM-JJ · <agent> · <mission> · <statut> · <preuve> · <décision>`

- `2026-01-01 · exemple · mise en place du journal · PROUVÉ · (aucune commande) · format retenu : une ligne par mission`
```

- [ ] **Step 2 : Graine `templates/journal/state.yaml`**

```yaml
# État courant du projet — lu/écrit par les agents. Complété au fil du build.
status: draft            # draft | in-progress | in-review | done | blocked
current_milestone: null  # ex. 03-authentification
current_task: null
repair_attempts: 0       # max 3 → status: blocked
blocked_reason: null
last_proof: null         # dernière commande ayant prouvé un résultat
```

- [ ] **Step 3 : Test (échoue)**

Ajoute à `scripts/lib/proof.test.mjs` :

```js
test('journal : graines JOURNAL.md + state.yaml (append-only, statuts)', () => {
  const j = read('templates/journal/JOURNAL.md');
  assert.match(j, /append-only/);
  assert.match(j, /lit ce fichier avant/);
  const s = read('templates/journal/state.yaml');
  assert.match(s, /repair_attempts/);
  assert.match(s, /blocked_reason/);
});
```

- [ ] **Step 4 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/proof.test.mjs`
Expected : FAIL.

- [ ] **Step 5 : Copier dans les projets**

Dans `scripts/lib/environment.mjs`, à la suite des autres écritures (repère un `write('docs/…')` existant pour le style), ajoute la copie des deux graines vers `docs/agents/JOURNAL.md` et `docs/agents/state.yaml` — **sans écraser** si déjà présents (utilise le même helper `copyIfAbsent`/pattern que le reste du fichier ; si `environment.mjs` n'a que `write`, lis d'abord et n'écris que si absent).
Ajoute aussi les 2 graines à `validateExtras` (`scripts/lib/validate-commands.mjs`).

- [ ] **Step 6 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/proof.test.mjs scripts/lib/validate-extras.test.mjs`
Expected : PASS.

- [ ] **Step 7 : Commit**

```bash
git add templates/journal scripts/lib/environment.mjs scripts/lib/validate-commands.mjs scripts/lib/proof.test.mjs
git commit -m "feat(crew): journal de mission partagé (docs/agents/JOURNAL.md + state.yaml)"
```

---

## Task 3 : Agent `verificateur` (grader en contexte frais)

**Files:**
- Create: `templates/agents/subagents/verificateur.md`
- Modify: `scripts/lib/kit-owned.mjs`, `scripts/lib/validate-commands.mjs`
- Test: `scripts/lib/proof.test.mjs`, `scripts/lib/kit-owned.test.mjs`

**Interfaces:**
- Produces: agent lecture seule qui rend `PROUVÉ / NON PROUVÉ / BLOQUÉ` sur un diff + des critères.

- [ ] **Step 1 : Écrire `templates/agents/subagents/verificateur.md`**

```md
---
name: verificateur
description: Juge en contexte frais si une feature est PROUVÉE. Ne voit que le diff + les critères, ne code pas, ne corrige pas. Use PROACTIVELY avant de déclarer une tâche ou un jalon terminé.
model: claude-sonnet-5
tools: Read, Grep, Glob, Bash
---
Tu es le **vérificateur**. Tu ne vois **que** le diff et les critères d'acceptation — pas le raisonnement qui les a produits. C'est ce détachement qui te rend utile : tu ne peux pas hériter du biais « c'est bon ».

Tu ne codes pas, tu ne corriges pas, tu ne modifies aucun test.

## Ce que tu vérifies, dans cet ordre
1. **Le diff n'a pas touché les tests** : `git diff --name-only <base>..HEAD | grep -E 'test|spec|__mocks__|fixtures'` → doit être **vide** (ou justifié explicitement). Un agent qui modifie les tests pour passer au vert est en échec.
2. **Les tests mordent** : pas d'assertion absente ni de test désactivé.
   `npx oxlint@latest --jest-plugin -D jest/expect-expect -D jest/no-disabled-tests -D jest/no-focused-tests .`
3. **Pas de faux réel** : `rg -n --glob '!**/*.{test,spec}.*' -e 'msw|@faker-js|mockResolvedValue|lorem ipsum|TODO|FIXME' src/` → doit être vide.
4. **Code mort / non câblé** : `npx knip` — un composant créé mais jamais monté = feature non branchée.
5. **Chaque critère d'acceptation** a une preuve de niveau ≥ 3 (test rouge d'abord) et, pour l'UI, de niveau 4 (parcours réel + requête réseau + relecture après rechargement).

## Ton verdict
Un statut, jamais un avis :
- **PROUVÉ** — chaque critère a sa commande + sa sortie. Liste-les.
- **NON PROUVÉ** — dis **quel** critère manque de preuve, et **laquelle** il faudrait.
- **BLOQUÉ** — ce qui échoue, ce qui a été tenté, ton hypothèse.

Ne signale que ce qui **casse la correctness ou un critère listé** — pas de remarques de style, pas de suggestions d'amélioration : on te demande un verdict, pas une revue.

Écris une ligne dans `docs/agents/JOURNAL.md` en finissant.
```

- [ ] **Step 2 : Tests (échouent)**

Ajoute à `scripts/lib/proof.test.mjs` :

```js
test('verificateur : contexte frais, checks anti-faux-succès, verdict', () => {
  const t = read('templates/agents/subagents/verificateur.md');
  for (const s of ['model: claude-sonnet-5', 'PROUVÉ', 'oxlint', 'knip', 'JOURNAL', 'ne codes? pas', 'expect-expect']) {
    assert.match(t, new RegExp(s));
  }
});
```

Dans `scripts/lib/kit-owned.test.mjs` : `assert.ok(files.some((f) => f.to === '.claude/agents/verificateur.md'));`

- [ ] **Step 3 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/proof.test.mjs scripts/lib/kit-owned.test.mjs`
Expected : FAIL.

- [ ] **Step 4 : Câbler**

`scripts/lib/kit-owned.mjs` : ajoute `'verificateur'` à la liste des subagents claude-code.
`scripts/lib/validate-commands.mjs` (`validateExtras`) : ajoute `'templates/agents/subagents/verificateur.md'`.

- [ ] **Step 5 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/proof.test.mjs scripts/lib/kit-owned.test.mjs scripts/lib/validate-extras.test.mjs`
Expected : PASS.

- [ ] **Step 6 : Commit**

```bash
git add templates/agents/subagents/verificateur.md scripts/lib/kit-owned.mjs scripts/lib/validate-commands.mjs scripts/lib/proof.test.mjs scripts/lib/kit-owned.test.mjs
git commit -m "feat(crew): agent verificateur — grader en contexte frais (PROUVÉ/NON PROUVÉ/BLOQUÉ)"
```

---

## Task 4 : `test-runner` — preuve déterministe (ARIA + dead-click + réseau)

**Files:**
- Modify: `templates/agents/subagents/test-runner.md`
- Test: `scripts/lib/agents-templates.test.mjs`

**Interfaces:**
- Produces: `test-runner` avec frontmatter complet + gate déterministe.

- [ ] **Step 1 : Test (échoue)**

Dans `scripts/lib/agents-templates.test.mjs`, au test `subagent test-runner`, ajoute à la liste : `'toMatchAriaSnapshot'`, `'waitForRequest'`, `'rechargement'`, `'model:'`.

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs`
Expected : FAIL.

- [ ] **Step 3 : Réécrire `templates/agents/subagents/test-runner.md`**

```md
---
name: test-runner
description: Teste une feature en vrai (navigateur ou simulateur) et rend un verdict prouvé. Use PROACTIVELY après chaque implémentation d'écran ou de parcours.
model: claude-sonnet-5
skills: webapp-testing
mcpServers: playwright
---
Tu es le **testeur**. Tu reçois : la feature, son **parcours**, ses **critères d'acceptation**, l'écran de départ. Tu n'as pas d'autre contexte — tout est dans le brief, ne le reconstruis pas.

Lis `docs/agents/JOURNAL.md` avant de commencer.

## Outils selon la plateforme
- **Web** : Playwright MCP (`@playwright/mcp`).
- **Mobile** : Maestro MCP (`maestro mcp`) — simulateur iOS / émulateur Android.

## La preuve (dans cet ordre, tout est obligatoire)
1. **Le parcours tourne en vrai** : lance l'app, clique, remplis, soumets.
2. **Une requête réseau part** : arme `page.waitForRequest`/`waitForResponse` **avant** le clic, et vérifie le **payload**. Un bouton qui ne déclenche aucun signal (URL, mutation DOM, requête, scroll) est un **dead click** → NON PROUVÉ.
3. **La donnée persiste** : **recharge la page (F5)** et vérifie que le résultat est toujours là. Sans ça, tu as prouvé une animation, pas une feature.
4. **Structure conforme** : `expect(page).toMatchAriaSnapshot()` — rôles, noms accessibles, hiérarchie. C'est le gate stable (insensible aux pixels, polices, OS).
5. **Captures** desktop **et** mobile.
6. **Cas limites** : état vide · chargement · erreur API (4xx/5xx) · bouton désactivé pendant l'envoi · message d'erreur réel · valeurs limites (vide, très long, caractères spéciaux).

## Ton verdict
Par critère : `AC-n : PROUVÉ|NON PROUVÉ` + la **commande/action** et ce que tu as **observé** (requête, statut, contenu après rechargement) + la capture.
Puis : **PROUVÉ** / **NON PROUVÉ** / **BLOQUÉ** (ce qui échoue, ce que tu as tenté, ton hypothèse).

Tu **testes et rapportes** — tu ne corriges rien, tu ne modifies aucun test. Écris une ligne dans `docs/agents/JOURNAL.md` en finissant.
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add templates/agents/subagents/test-runner.md scripts/lib/agents-templates.test.mjs
git commit -m "feat(preuve): test-runner déterministe — dead-click, requête réseau, persistance après F5, ARIA snapshot"
```

---

## Task 5 : `security-reviewer` — gate par feature (outils + tests négatifs)

**Files:**
- Modify: `templates/agents/subagents/security-reviewer.md`
- Test: `scripts/lib/proof.test.mjs`

**Interfaces:**
- Produces: agent sécurité avec checklist **par type de feature**, commandes réelles, artefact `.security/<feature>.md`.

- [ ] **Step 1 : Test (échoue)**

Ajoute à `scripts/lib/proof.test.mjs` :

```js
test('security-reviewer : outils réels + tests négatifs + artefact', () => {
  const t = read('templates/agents/subagents/security-reviewer.md');
  for (const s of ['semgrep', 'gitleaks', 'osv-scanner', 'IDOR', 'tests négatifs', '\\.security/', 'model: claude-opus-5']) {
    assert.match(t, new RegExp(s));
  }
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/proof.test.mjs`
Expected : FAIL.

- [ ] **Step 3 : Réécrire `templates/agents/subagents/security-reviewer.md`**

```md
---
name: security-reviewer
description: Valide la sécurité d'UNE feature avec des tests négatifs et des scanners, puis produit un artefact de preuve. Use PROACTIVELY avant de déclarer une feature terminée.
model: claude-opus-5
tools: Read, Grep, Glob, Bash
---
Tu valides **une feature à la fois**. Raison mesurée : le code généré par IA gagne **+37,6 % de vulnérabilités critiques après 5 itérations** de raffinement — un audit final ne rattrape pas ça.

Lis `docs/agents/JOURNAL.md` avant de commencer.

## 1. Scanners déterministes (rappel large)
```bash
semgrep scan --config=p/owasp-top-ten --config=p/secrets --error
gitleaks dir . --redact
osv-scanner scan source -r .
```
Vérifie aussi que **chaque paquet importé existe vraiment** (~20 % des paquets suggérés par les LLM sont inventés).

## 2. Tests négatifs — le cœur de la preuve
Un avis n'est pas une preuve : une **requête qui échoue comme prévu** l'est. Selon la feature :
- **Auth** : route protégée **sans** cookie → 401 ; avec le cookie d'un **autre** utilisateur → 403. Contrôle **côté serveur**, jamais seulement en middleware. Aucun rôle lu depuis le client.
- **Formulaire / mutation** : champ en trop (`{"role":"admin"}`) → rejeté ; type erroné → 400. Validation de schéma **serveur**.
- **Upload** : type vérifié par **magic bytes** (pas l'extension) ; taille imposée serveur ; nom régénéré ; jamais servi en `text/html`.
- **Paiement** : le **montant vient du serveur** ; signature du webhook vérifiée ; rejouer le même événement → **aucun double crédit**.
- **API** : autorisation **par objet** (ownership) — `GET /api/x/<id_d_un_autre>` → 403/404 (**IDOR** : la faille n°1 du code IA). CORS en allowlist, jamais `*` avec credentials.
- **Contenu utilisateur** : pas de `dangerouslySetInnerHTML`/`innerHTML` sans sanitizer ; pas d'URL utilisateur en `href`/`src` sans allowlist de schéma ; CSP sans `unsafe-inline` (**86 % du code IA échoue sur XSS**).
- **Toujours** : rate limit sur l'endpoint, secrets hors du client.

## 3. Artefact de preuve
Écris `.security/<feature>.md` : surface (endpoints, données, qui peut appeler) · contrôles (authz, validation, encodage) · tableau des scanners (commande, exit, findings) · **tableau des tests négatifs** (requête → attendu → obtenu → ✅) · findings écartés (avec justification, **jamais effacés**) · résidu accepté.

## 4. Verdict
**PROUVÉ** (scanners en exit 0 ou exceptions justifiées **et** tests négatifs passés) · **NON PROUVÉ** · **BLOQUÉ**.

Note : `/security-review` exclut volontairement DoS, rate limiting et open redirect — or l'épuisement de ressources représente **21 %** des findings réels. Couvre-les toi-même.

Tu **audites**, tu ne corriges pas. Écris une ligne dans `docs/agents/JOURNAL.md` en finissant.
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/proof.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add templates/agents/subagents/security-reviewer.md scripts/lib/proof.test.mjs
git commit -m "feat(securite): gate par feature — scanners + tests négatifs + artefact .security/<feature>.md"
```

---

## Task 6 : Crew — frontmatter (skills/mcpServers/model) + règles embarquées

**Files:**
- Modify: `templates/agents/subagents/{code-reviewer,critique-produit,critique-donnees,critique-ux}.md`
- Test: `scripts/lib/critics.test.mjs`

**Interfaces:**
- Produces: chaque agent du crew porte `model:` (+ `skills:`/`mcpServers:` quand pertinent) et rappelle qu'il lit le journal.

- [ ] **Step 1 : Test (échoue)**

Ajoute à `scripts/lib/critics.test.mjs` :

```js
test('crew : chaque agent déclare son modèle et lit le journal', () => {
  for (const a of ['code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux']) {
    const t = read(`templates/agents/subagents/${a}.md`);
    assert.match(t, /model: claude-(opus|sonnet)-5/, `${a} : modèle déclaré`);
    assert.match(t, /JOURNAL\.md/, `${a} : lit/écrit le journal`);
  }
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/critics.test.mjs`
Expected : FAIL.

- [ ] **Step 3 : Enrichir les 4 agents**

Pour chacun : ajoute au frontmatter `model:` et, quand pertinent, `skills:`/`mcpServers:` ; ajoute une ligne « Lis `docs/agents/JOURNAL.md` avant de commencer, ajoutes-y une ligne en finissant. » juste après la phrase de rôle. **Ne supprime rien d'existant** (les tests actuels vérifient déjà `MANQUE`, `PREUVE`, « ne code pas »).

- `code-reviewer` → `model: claude-sonnet-5`
- `critique-produit` → `model: claude-sonnet-5`
- `critique-donnees` → `model: claude-sonnet-5`, `mcpServers: convex`
- `critique-ux` → `model: claude-sonnet-5`, `skills: web-design-guidelines`, `mcpServers: chrome-devtools`

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/critics.test.mjs scripts/lib/agents-templates.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add templates/agents/subagents scripts/lib/critics.test.mjs
git commit -m "feat(crew): modèle par rôle + skills/MCP scopés + lecture du journal pour chaque agent"
```

---

## Task 7 : Gate visuel déterministe + PixelRAG repositionné

**Files:**
- Modify: `templates/agents/verify-rule.md`, `templates/agents/subagents-rule.md`
- Test: `scripts/lib/agents-templates.test.mjs`

**Interfaces:**
- Produces: `verify-rule` où le **gate** est ARIA+réseau+F5 et PixelRAG un signal **non bloquant** ; `subagents-rule` interdit le fan-out de builders.

- [ ] **Step 1 : Test (échoue)**

Dans `scripts/lib/agents-templates.test.mjs`, au test `verify-rule`, ajoute `'toMatchAriaSnapshot'` et `'non bloquant'`. Au test `subagents-rule`, ajoute `'jamais en parallèle'`.

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs`
Expected : FAIL.

- [ ] **Step 3 : `verify-rule.md` — remplacer l'étape 4 (PixelRAG bloquant)**

Remplace toute l'étape « **4. Cohérence visuelle vs maquette — OBLIGATOIRE …** » par :

```md
**4. Cohérence avec la maquette — le gate est déterministe.** L'IA dérive du design : il faut un contrôle, mais un contrôle qui **décide juste**.
   - **Ce qui bloque** : `expect(page).toMatchAriaSnapshot()` (structure, rôles, noms accessibles — stable, insensible aux pixels/polices/OS) **+** chaque élément interactif produit un signal (URL, DOM, **requête réseau**) **+** l'état survit à un **rechargement**.
   - **Signal indicatif, NON bloquant** : compare visuellement le rendu à l'écran de `maquette/` (capture, ou **PixelRAG** si installé). Un score de similarité ne décide pas — un rendu identique à lui-même ne score pas 1,0 — mais un écart franc **mérite un coup d'œil**. Traite-le comme une alerte, pas comme un verdict.
   - Écart réel constaté → corrige **avant** de continuer.
```

- [ ] **Step 4 : `subagents-rule.md` — interdire le fan-out de builders**

Dans la section « Règles d'or », ajoute en tête :

```md
- **Les sous-agents qui ÉCRIVENT du code ne travaillent JAMAIS en parallèle** sur la même feature : chaque action porte des décisions implicites, et deux décisions contradictoires donnent un résultat inassemblable. Le fan-out parallèle est réservé à la **lecture** (recherche, critique, vérification). Pour construire : **un implémenteur à la fois**, en séquence.
- **Un sous-agent ne voit ni `AGENTS.md` ni `CLAUDE.md`** : il ne reçoit que son propre prompt. Donne-lui donc **ses règles** (ou les fichiers exacts à lire) dans son brief — sinon il travaille sans les règles du projet.
```

- [ ] **Step 5 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-templates.test.mjs scripts/lib/new-project-runbook.test.mjs`
Expected : PASS.

- [ ] **Step 6 : Commit**

```bash
git add templates/agents/verify-rule.md templates/agents/subagents-rule.md scripts/lib/agents-templates.test.mjs
git commit -m "fix(preuve): gate visuel déterministe (ARIA+réseau+F5), PixelRAG en signal non bloquant ; pas de fan-out de builders"
```

---

## Task 8 : Plugin + suite + bump 0.11.0 + vérif réelle

**Files:**
- Modify: `package.json:3`, `cursor-plugin/`

- [ ] **Step 1 : Régénérer le plugin**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/build-cursor-plugin.mjs`

- [ ] **Step 2 : Bump** — `package.json:3` → `"version": "0.11.0",`.

- [ ] **Step 3 : Suite → verte**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`
Expected : `# fail 0`.

- [ ] **Step 4 : Vérif réelle**

```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
T=/private/tmp/crew; rm -rf "$T"
$N scripts/setup.mjs "$T" --stack saas --assistant claude-code --no-skills --yes >/dev/null 2>&1
echo "agents : $(ls "$T/.claude/agents/" | tr '\n' ' ')"
echo "Règle Preuve : $(grep -c 'Règle Preuve' "$T/AGENTS.md")"
echo "journal : $(ls "$T/docs/agents/" 2>/dev/null | tr '\n' ' ')"
echo "gate ARIA : $(grep -c 'toMatchAriaSnapshot' "$T/AGENTS.md")"
```
Expected : 7 agents (dont `verificateur`), Règle Preuve **1**, `JOURNAL.md` + `state.yaml` présents, gate ARIA **1**.

- [ ] **Step 5 : Commit**

```bash
git add package.json cursor-plugin
git commit -m "chore(crew): régénère plugin + bump 0.11.0"
```

---

## Self-Review

**1. Spec coverage** — (a) preuve de bout en bout → Tasks 1, 4 (dead-click, réseau, F5, ARIA) ; (b) plus de « c'est fait » → Task 1 (statuts + mots interdits) + Task 3 (grader frais) ; (c) sécurité valide **chaque** feature → Task 5 ; (d) agents avec skills/outils/docs → Tasks 3-6 (frontmatter `skills`/`mcpServers`/`model`) ; (e) historique de mission partagé → Task 2 ; (f) règles visibles par les sous-agents → Task 7 Step 4 + règles embarquées dans chaque agent ; (g) PixelRAG conservé en lecture, écarté du gate → Task 7. ✅

**2. Placeholder scan** — aucun « TBD ». Task 2 Step 5 et Task 6 Step 3 demandent de **lire le fichier réel** avant d'éditer (style de `environment.mjs`, contenu existant des agents) : le comportement cible est spécifié, ce n'est pas un trou.

**3. Non-régression** — `proofRule` suit exactement le patron de `realityRule` (param optionnel `= ''`) → tests existants verts. `AGENTS_TEMPLATES` + fixture mis à jour **ensemble** (Task 1 Step 4). `validateExtras` + `kitOwnedFiles` mis à jour avec chaque nouvel agent. Les réécritures d'agents (Tasks 4-5) **conservent** les sous-chaînes déjà assertées (`Playwright`, `Maestro`, `Verdict`, « ne code pas »). Task 7 remplace une étape de `verify-rule` : les sous-chaînes `PixelRAG` et `maquette` restent présentes → test `verify-rule` toujours vert.

**4. Type consistency** — chaque agent : `templates/agents/subagents/<name>.md` → `.claude/agents/<name>.md` (`{from,to}` de `kitOwnedFiles`). Statuts identiques partout : **PROUVÉ / NON PROUVÉ / BLOQUÉ** (règle, verificateur, test-runner, security-reviewer) → les rapports se composent. Journal : un seul chemin `docs/agents/JOURNAL.md` cité par tous.
