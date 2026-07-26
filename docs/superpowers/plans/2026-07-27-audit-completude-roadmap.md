# Audit de complétude avant roadmap + panel d'agents critiques — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Avant d'écrire la roadmap, forcer un **audit complet de complétude** : analyse **exhaustive** de la maquette (PixelRAG) + tout ce dont chaque page a besoin pour fonctionner → roadmap couvrant **toutes** les features du produit designé. (2) Créer un **panel d'agents critiques nommés, avec personnalités et lentilles différentes**, maintenus **à un seul endroit** (`templates/agents/subagents/`), dispatchés en parallèle avant de figer la roadmap **et invocables à la demande** n'importe quand.

**Architecture:** 3 sous-agents critiques (produit / données / UX) — personas distincts pour que chacun trouve **des trous différents** (un critique unique voit toujours les mêmes choses). Ils sont copiés dans `.claude/agents/`, régénérables par `--refresh` (donc **améliorés au kit = améliorés partout**), et la Phase 6 de `/new-project` les dispatche **en parallèle** puis boucle jusqu'à « rien ne manque ». `/help` les annonce comme invocables à la demande.

**Tech Stack:** Markdown (sous-agents + runbooks) + JS (`kit-owned.mjs`, validateurs) + `node --test`.

## Global Constraints

- Tests via `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`.
- Périmètre roadmap = **tout** ce que maquette + PRD impliquent (on ne coupe pas de features).
- Les 3 critiques : **personas distincts**, **lentilles différentes**, chacun **ne code pas** (il critique). Écrits en 2e personne (« Tu es… ») — **pas de pronom de 3e personne** pour les personas.
- Ancrer sur les **docs/skills** de la stack (ne rien inventer).
- Ne casse pas les validateurs (Phase 6 garde marqueurs DEPTH + `Roadmap`) ni les tests existants.
- Français, accents corrects. Après édition de commande : régénérer `cursor-plugin/`.

---

## File Structure

- `templates/agents/subagents/critique-produit.md` — **créer** (Vera — sceptique produit).
- `templates/agents/subagents/critique-donnees.md` — **créer** (Marc — ingénieur données).
- `templates/agents/subagents/critique-ux.md` — **créer** (Lina — exigeante UX).
- `scripts/lib/kit-owned.mjs` — ajouter les 3 aux subagents claude-code.
- `scripts/lib/validate-commands.mjs` (`validateExtras`) — ajouter les 3 fichiers.
- `templates/commands/new-project.md` — Phase 6 : audit complet + panel critique.
- `templates/commands/help.md` — section « L'équipe d'agents » (invocables à la demande).
- Tests : `scripts/lib/critics.test.mjs` (créer), `scripts/lib/kit-owned.test.mjs`, `scripts/lib/agents-templates.test.mjs`.
- `cursor-plugin/` régénéré ; `package.json` bump `0.10.0`.

---

## Task 1 : Le panel de 3 agents critiques (personas)

**Files:**
- Create: `templates/agents/subagents/{critique-produit,critique-donnees,critique-ux}.md`
- Modify: `scripts/lib/kit-owned.mjs`, `scripts/lib/validate-commands.mjs`
- Test: `scripts/lib/critics.test.mjs` (créer), `scripts/lib/kit-owned.test.mjs`

**Interfaces:**
- Produces: 3 sous-agents, chacun avec `name`/`description` en frontmatter, un persona, une lentille propre, et un format de sortie commun `MANQUE : …`.

- [ ] **Step 1 : `critique-produit.md`**

```md
---
name: critique-produit
description: Vera, la sceptique produit — traque les features, écrans et parcours OUBLIÉS en comparant roadmap ↔ maquette ↔ PRD. À lancer avant de figer une roadmap. Ne code pas.
---
Tu es **Vera**, sceptique produit. Ta conviction : « une roadmap est incomplète jusqu'à preuve du contraire ». Tu es directe, tu ne complimentes pas, tu cherches le trou.

On te donne : la **maquette** (`maquette/`), le **PRD** (`docs/PRD.md`), l'**inventaire de complétude** et la **roadmap** (`docs/ROADMAP.md`).

Ta lentille — **le produit designé est-il couvert en ENTIER ?**
- Chaque **écran** de la maquette a-t-il un jalon ? (parcours PixelRAG si dispo pour ne rien rater visuellement)
- Chaque **élément** visible (bouton, lien, filtre, onglet, modale, menu) a-t-il un jalon qui le rend **fonctionnel** ?
- Chaque **feature du PRD** est-elle planifiée ? Chaque parcours `UJ-*` va-t-il **jusqu'au bout** ?
- Que se passe-t-il **après** chaque action (confirmation, redirection, notification) ?
- Manque-t-il un écran **implicite** (connexion, réglages, profil, erreur 404, page vide) que le design suppose ?

Appuie-toi sur les **docs/skills** de la stack. Rends : `MANQUE : <quoi> — <où l'ajouter> — <pourquoi>`, trié par criticité. Rien à signaler → dis « complet côté produit ». Tu **critiques**, tu ne codes pas.
```

- [ ] **Step 2 : `critique-donnees.md`**

```md
---
name: critique-donnees
description: Marc, l'ingénieur données — traque les données manquantes, mocks et câblages absents dans une roadmap (modèle, backend, auth, permissions). Ne code pas.
---
Tu es **Marc**, ingénieur données. Ta question favorite : « **d'où vient cette donnée, et où va-t-elle ?** ». Tu détestes les écrans qui « affichent » sans savoir quoi.

On te donne : la **maquette**, le **PRD**, l'**inventaire de complétude**, la **roadmap** (`docs/ROADMAP.md`) et le modèle de données prévu.

Ta lentille — **est-ce que ça peut VRAIMENT fonctionner ?**
- Chaque écran a-t-il ses **vraies** données : quelle entité/table, quels champs, quelle source ?
- Le **modèle de données** existe-t-il **avant** les écrans qui l'utilisent (ordre des jalons) ?
- Chaque action est-elle **câblée** (lecture ET écriture) : qui crée, modifie, supprime ?
- **Zéro mock** : un jalon prévoit-il des fausses données ou un bouton non branché ? → MANQUE.
- **Auth & permissions** : qui a le droit de voir/faire quoi ? Prévu ?
- **Domaines** (paiement, email, storage, jobs…) : la connexion réelle est-elle planifiée, avec ses secrets ?
- Relations manquantes, migrations, données de départ (seed **réel**) ?

Appuie-toi sur les **docs/skills** de la stack (ne rien inventer). Rends : `MANQUE : <quoi> — <où l'ajouter> — <pourquoi>`, trié par criticité. Rien à signaler → « complet côté données ». Tu **critiques**, tu ne codes pas.
```

- [ ] **Step 3 : `critique-ux.md`**

```md
---
name: critique-ux
description: Lina, l'exigeante UX — traque les états manquants (vide/chargement/erreur), les impasses de parcours, le responsive et l'accessibilité dans une roadmap. Ne code pas.
---
Tu es **Lina**, exigeante UX. Ta question favorite : « **et quand ça se passe mal ?** ». Tu sais qu'une app se casse dans les cas limites, pas dans le cas idéal.

On te donne : la **maquette**, le **PRD**, l'**inventaire de complétude** et la **roadmap** (`docs/ROADMAP.md`).

Ta lentille — **l'expérience tient-elle debout en vrai ?**
- **États** de chaque écran : **vide**, **chargement**, **erreur**, **succès** — planifiés ?
- **Impasses** : depuis chaque écran, peut-on revenir / continuer ? Navigation complète ?
- **Feedback** : l'utilisateur sait-il que son action a marché (message, état du bouton) ?
- **Cas limites** : liste très longue, texte très long, connexion lente, hors-ligne, double clic.
- **Responsive** : mobile **et** desktop prévus pour chaque écran ?
- **Accessibilité** : contraste, focus clavier, `alt`, cibles tactiles (≈44px).
- **Cohérence** avec `docs/design.md` : la roadmap prévoit-elle la passe design/PixelRAG ?

Appuie-toi sur les **docs/skills** design de la stack. Rends : `MANQUE : <quoi> — <où l'ajouter> — <pourquoi>`, trié par criticité. Rien à signaler → « complet côté UX ». Tu **critiques**, tu ne codes pas.
```

- [ ] **Step 4 : Tests (échouent)**

Crée `scripts/lib/critics.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CRITICS = ['critique-produit', 'critique-donnees', 'critique-ux'];

test('panel de critiques : personas distincts, format MANQUE, ne codent pas', () => {
  const bodies = CRITICS.map((c) => read(`templates/agents/subagents/${c}.md`));
  for (const [i, t] of bodies.entries()) {
    assert.match(t, new RegExp(`name: ${CRITICS[i]}`), `${CRITICS[i]} : frontmatter name`);
    assert.match(t, /MANQUE/, `${CRITICS[i]} : format de sortie`);
    assert.match(t, /ne codes? pas/, `${CRITICS[i]} : ne code pas`);
    assert.match(t, /docs\/skills|skills/, `${CRITICS[i]} : s'appuie sur les skills`);
  }
  // lentilles distinctes : chacun a son mot-clé propre
  assert.match(bodies[0], /Vera/); assert.match(bodies[1], /Marc/); assert.match(bodies[2], /Lina/);
  assert.match(bodies[1], /mock/i); assert.match(bodies[2], /chargement/i);
});
```

Dans `scripts/lib/kit-owned.test.mjs`, ajoute au test claude-code :

```js
  for (const c of ['critique-produit', 'critique-donnees', 'critique-ux']) {
    assert.ok(files.some((f) => f.to === `.claude/agents/${c}.md`), `panel : ${c} régénérable`);
  }
```

- [ ] **Step 5 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/critics.test.mjs scripts/lib/kit-owned.test.mjs`
Expected : FAIL.

- [ ] **Step 6 : Câbler kit-owned + validateExtras**

`scripts/lib/kit-owned.mjs` — dans la boucle subagents claude-code :

```js
    for (const a of ['code-reviewer', 'security-reviewer', 'test-runner', 'critique-produit', 'critique-donnees', 'critique-ux']) {
```

`scripts/lib/validate-commands.mjs` (`validateExtras`) — ajoute à la ligne des subagents : `'templates/agents/subagents/critique-produit.md', 'templates/agents/subagents/critique-donnees.md', 'templates/agents/subagents/critique-ux.md',`.

- [ ] **Step 7 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/critics.test.mjs scripts/lib/kit-owned.test.mjs scripts/lib/validate-extras.test.mjs`
Expected : PASS. (Si `validate-extras.test.mjs` n'existe pas, lance les deux premiers.)

- [ ] **Step 8 : Commit**

```bash
git add templates/agents/subagents/critique-produit.md templates/agents/subagents/critique-donnees.md templates/agents/subagents/critique-ux.md scripts/lib/kit-owned.mjs scripts/lib/validate-commands.mjs scripts/lib/critics.test.mjs scripts/lib/kit-owned.test.mjs
git commit -m "feat(agents): panel de critiques (Vera produit · Marc données · Lina UX) — lentilles distinctes, maintenus au kit"
```

---

## Task 2 : Phase 6 — audit complet AVANT la roadmap + panel critique en parallèle

**Files:**
- Modify: `templates/commands/new-project.md` (Phase 6)
- Test: `scripts/lib/critics.test.mjs`, `scripts/lib/new-project-runbook.test.mjs` (rester vert)

**Interfaces:**
- Produces: Phase 6 avec (a) « Audit complet de complétude » (PixelRAG exhaustif, besoins par page, inventaire, périmètre = tout) AVANT la roadmap ; (b) dispatch **parallèle** des 3 critiques, boucle jusqu'à zéro manque.

- [ ] **Step 1 : Test (échoue)**

Ajoute à `scripts/lib/critics.test.mjs` :

```js
test('Phase 6 : audit de complétude + panel critique en parallèle avant roadmap', () => {
  const np = read('templates/commands/new-project.md');
  assert.match(np, /Audit complet de complétude/);
  assert.match(np, /inventaire de complétude/);
  for (const c of ['critique-produit', 'critique-donnees', 'critique-ux']) assert.match(np, new RegExp(c));
  assert.match(np, /en parallèle/);
  assert.match(np, /toutes? les features/i);
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/critics.test.mjs`
Expected : FAIL.

- [ ] **Step 3 : Remplacer le point 2 de Phase 6 (audit complet)**

Dans `templates/commands/new-project.md`, remplace :

```md
2. **Analyse la maquette validée** (`maquette/`) : lis les fichiers exportés et **liste chaque écran + chaque flux** qu'elle montre. C'est la **cible concrète** que le build doit réaliser — la roadmap existe pour rendre ces écrans réels.
```

par :

```md
2. **Audit complet de complétude — AVANT d'écrire la roadmap.** But : ne **rien** oublier, pour que la roadmap couvre **tout** le produit designé (**toutes les features**, pas un sous-ensemble — on ne coupe pas).
   - **Analyse EXHAUSTIVE de la maquette** (`maquette/`) avec **PixelRAG** (`pixelshot` sur chaque écran) + lecture des fichiers : liste **chaque écran** ET **chaque élément** (bouton, champ, liste, filtre, onglet, modale, menu) et les **états** (vide/chargement/erreur/succès). PixelRAG te fait **voir** tout ce que le design contient — l'IA rate ce qu'elle ne regarde pas.
   - **Pour chaque page**, détermine **tout ce dont elle a besoin pour FONCTIONNER** : vraies **données** (quel modèle, d'où), **features** déclenchées, **connexions backend** (auth, API, domaines), **permissions**, **états**.
   - **Croise** avec le PRD (chaque feature, chaque `UJ-*`) et les domaines. Appuie-toi sur les **docs/skills** de la stack — **rien d'inventé**.
   - Produis un **inventaire de complétude** (écrans × éléments × données × features × états × domaines) : c'est la **base** de la roadmap.
```

- [ ] **Step 4 : Insérer le panel critique (nouveau point, avant « générer les plans »)**

Repère le dernier point de Phase 6 (« **Propose ensuite de générer tous les plans**… »). **Juste avant**, insère :

```md
5. **Panel critique — avant de figer la roadmap.** Dispatche les **3 agents critiques du kit en parallèle** (contexte frais, `claude-sonnet-5`) — chacun a **sa lentille**, donc ils trouvent des trous **différents** :
   - **`critique-produit`** (Vera) — features/écrans/parcours oubliés ;
   - **`critique-donnees`** (Marc) — données réelles, modèle, câblage, zéro mock, permissions ;
   - **`critique-ux`** (Lina) — états vide/chargement/erreur, impasses, responsive, accessibilité.
   Donne à chacun : maquette + PRD + inventaire + roadmap. Ils rendent des `MANQUE : …`. **Fusionne**, intègre dans la roadmap, **relance le panel** — boucle jusqu'à ce que les trois disent « complet ». Seulement alors la roadmap est validée.

   > Ces agents vivent dans `.claude/agents/` : tu peux les **appeler n'importe quand** (« lance `critique-ux` sur cet écran »), pas seulement ici.
```

- [ ] **Step 5 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/critics.test.mjs scripts/lib/new-project-runbook.test.mjs`
Expected : PASS (marqueurs DEPTH + phases intacts).

- [ ] **Step 6 : Commit**

```bash
git add templates/commands/new-project.md scripts/lib/critics.test.mjs
git commit -m "feat(roadmap): Phase 6 — audit complet (PixelRAG exhaustif) + panel critique en parallèle jusqu'à complétude"
```

---

## Task 3 : `/help` — l'équipe d'agents invocables

**Files:**
- Modify: `templates/commands/help.md`
- Test: `scripts/lib/critics.test.mjs`

**Interfaces:**
- Produces: section `/help` listant les agents du kit et comment les appeler à la demande.

- [ ] **Step 1 : Test (échoue)**

Ajoute à `scripts/lib/critics.test.mjs` :

```js
test('help : présente l\'équipe d\'agents invocables', () => {
  const h = read('templates/commands/help.md');
  assert.match(h, /L'équipe d'agents/);
  assert.match(h, /critique-ux/);
  assert.match(h, /test-runner/);
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/critics.test.mjs`
Expected : FAIL.

- [ ] **Step 3 : Ajouter la section à `help.md`**

Dans `templates/commands/help.md`, **avant** la section « ## Aide-mémoire », insère :

```md
## L'équipe d'agents (appelable quand tu veux)
Des assistants spécialisés, dans `.claude/agents/`. Dis simplement « lance **<nom>** sur … » :
- **critique-produit** (Vera) — « qu'est-ce qu'on a oublié ? » features, écrans, parcours.
- **critique-donnees** (Marc) — « d'où vient cette donnée ? » modèle, câblage réel, zéro mock.
- **critique-ux** (Lina) — « et quand ça se passe mal ? » états vide/erreur, responsive, accessibilité.
- **test-runner** — teste une feature en vrai dans le navigateur/simulateur et rend un verdict.
- **code-reviewer** · **security-reviewer** — relisent le code et la sécurité d'un changement.
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/critics.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add templates/commands/help.md scripts/lib/critics.test.mjs
git commit -m "docs(help): présente l'équipe d'agents (critiques, test-runner, reviewers) invocables à la demande"
```

---

## Task 4 : Régénérer le plugin + suite + bump 0.10.0 + vérif réelle

**Files:**
- Modify: `package.json:3`, `cursor-plugin/`

- [ ] **Step 1 : Régénérer le plugin**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/build-cursor-plugin.mjs`

- [ ] **Step 2 : Bump** — `package.json:3` → `"version": "0.10.0",`.

- [ ] **Step 3 : Suite → verte**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`
Expected : `# fail 0`.

- [ ] **Step 4 : Vérif réelle**

```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
T=/private/tmp/panel; rm -rf "$T"
$N scripts/setup.mjs "$T" --stack saas --assistant claude-code --no-skills --yes >/dev/null 2>&1
echo "agents copiés : $(ls "$T/.claude/agents/" | tr '\n' ' ')"
echo "Phase 6 audit : $(grep -c 'Audit complet de complétude' "$T/.claude/commands/new-project.md")"
echo "panel dans Phase 6 : $(grep -c 'critique-donnees' "$T/.claude/commands/new-project.md")"
```
Expected : les 6 agents listés (code-reviewer, security-reviewer, test-runner, critique-produit, critique-donnees, critique-ux) ; audit = **1** ; panel = **1**.

- [ ] **Step 5 : Commit**

```bash
git add package.json cursor-plugin
git commit -m "chore(agents): régénère plugin + bump 0.10.0"
```

---

## Self-Review

**1. Spec coverage** — (a) audit complet AVANT roadmap → Task 2 Step 3 ; (b) maquette vue via PixelRAG (tout voir) → Task 2 Step 3 ; (c) besoins de chaque page (données/features/connexions) → Task 2 Step 3 ; (d) roadmap complète, toutes les features → Task 2 (périmètre = tout) ; (e) **plusieurs** agents critiques **avec personnalités** → Task 1 (3 personas, lentilles distinctes) ; (f) maintenus au kit, pas répétés dans chaque dossier → `templates/agents/subagents/` + `kitOwnedFiles` (donc mis à jour par `--refresh`) ; (g) invocables à droite à gauche → Task 3 (`/help`) + note en Phase 6 ; (h) basés sur docs/skills → dans chaque persona + audit. ✅

**2. Placeholder scan** — aucun « TBD » ; contenu intégral des 3 agents fourni.

**3. Non-régression** — les 3 agents sont des **ajouts** dans `templates/agents/subagents/` (copiés par le `copyDirIfAbsent` existant vers `.claude/agents/`) ; `kitOwnedFiles` + `validateExtras` mis à jour ensemble ; Phase 6 : point 2 enrichi (garde « maquette »), marqueurs DEPTH et le mot `Roadmap` intacts → `validateNewProjectCommand` reste vert ; `help.md` : ajout de section (aucun test existant ne compte ses sections).

**4. Type consistency** — chaque agent suit le patron `templates/agents/subagents/<name>.md` → `.claude/agents/<name>.md` (mêmes clés `{from,to}` dans `kitOwnedFiles`), frontmatter `name`/`description` comme `test-runner`/`code-reviewer`. Format de sortie commun `MANQUE : <quoi> — <où> — <pourquoi>` pour que la fusion des 3 rapports soit directe.
