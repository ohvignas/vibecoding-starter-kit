# Installeur interactif (wizard) — Design

**Date :** 2026-07-07
**Statut :** en revue
**Langue projet :** français (commandes/URLs verbatim)

## Problème

Aujourd'hui l'install repose sur l'IA de l'élève qui **suit** `playbook/00-START.md` et **pose les questions** (stack, assistant, nom). Rien ne l'y force → observé en vrai : l'IA **devine `saas`** et scaffolde **Convex sans rien demander**. Le prompt du README (« puis démarre-le ») aggrave. Sur Windows, un installeur `.sh` casserait en plus.

## Objectif

Sortir le **choix de configuration** des mains de l'IA et le donner à une **commande interactive déterministe**. Séparation nette :

- **`node scripts/setup.mjs` (wizard)** — pose les questions à l'humain (avec explications), puis installe **tout l'environnement** (le même qu'aujourd'hui : commandes, MCP, hooks, SETUP-AI, DOMAINS, ROADMAP, RUN…).
- **L'IA** — n'intervient qu'**après**, au `/new-project` (briefing → PRD → tech spec → design) puis `/build`.

Bénéfices : plus d'IA qui devine la stack (corrige le bug) · **cross-platform** (`node`, pas bash → Windows OK) · choix **Convex cloud/local explicite** · débutant guidé pas à pas.

## Principes

- **Zéro dépendance externe** : prompts via `node:readline/promises` (intégré), pas d'inquirer.
- **Rétrocompat** : le mode `--flags` existant reste (pour l'IA/CI/avancés). Le wizard ne se déclenche que **sans flags et en TTY**.
- **Testable** : la logique pure (mapping réponses→args, décision wizard-vs-flags, rendu de la note backend) est séparée de l'I/O readline et testée `node --test`. L'I/O readline est un mince wrapper avec un `ask()` injectable.
- **Additif, non destructif** : réutilise `buildRunPlan` + les writers existants ; ne change pas la génération.

## Comportement du wizard

`node scripts/setup.mjs` (aucun flag) en terminal → séquence de questions, chacune avec une explication courte :

1. **Que veux-tu construire ?** `[1] SaaS web · [2] Mobile · [3] Desktop` → `stack`.
2. **Quel assistant ?** `[1] Cursor · [2] Claude Code · [3] Codex` → `assistant`.
3. **Nom du projet ?** (dossier) → `project` (validé par la regex existante de `validateArgs`).
4. **(SaaS uniquement) Backend Convex ?** `[1] Cloud (compte gratuit) · [2] Local (zéro Docker, zéro compte, données dans .convex/)` → `backend` (`cloud`|`local`). Ignoré pour mobile/desktop.
5. **Réduire les coûts IA (caveman) ?** `[o/N]` (défaut non ; explique que ça coupe les explications utiles) → `caveman`.

Puis : construit l'objet `args` (mêmes clés que `parseArgs` + `backend`), lance la génération existante, affiche le rapport, et termine par : **« Ouvre ton assistant IA dans le dossier du projet et lance `/new-project`. »**

Entrée invalide → redemande la même question (boucle jusqu'à réponse valide), pas de crash.

## Choix Convex cloud/local

Le champ `backend` n'affecte pas les fichiers générés sauf une **note** :
- Rendu par une fonction pure `renderBackendNote(stack, backend)` → chaîne (vide si non-saas ou cloud).
- Pour `saas` + `local` : le setup **préfixe** `docs/RUN.md` avec un bloc :
  > **Backend en local (zéro Docker, zéro compte)** : avant `npm run dev`, lance `npx convex deployment select local` puis `npx convex dev` (le backend tourne en sous-processus, état dans `.convex/`). Pour repasser au cloud : `npx convex deployment select dev`.
- Pour `cloud` : rien de spécial (comportement actuel).

## Architecture & fichiers

**Nouveaux :**
- `scripts/lib/wizard.mjs` — `needsWizard(argv, isTTY)` (bool) · `buildArgsFromAnswers(answers)` → args validés (throw si invalide, réutilise `validateArgs`) · `async runWizard(ask)` où `ask(prompt, {choices?})→Promise<string>` est injecté → retourne l'objet answers. `renderBackendNote(stack, backend)` peut vivre ici ou dans un petit module dédié.
- `scripts/lib/wizard.test.mjs` — teste `needsWizard`, `buildArgsFromAnswers` (mapping + validation + rejet), `runWizard` avec un `ask` factice (séquence de réponses scriptée, y compris une invalide re-demandée), `renderBackendNote`.

**Modifiés :**
- `scripts/setup.mjs` — au démarrage de `main()` : si `needsWizard(argv, process.stdin.isTTY)` → construire un `readline/promises`, envelopper en `ask()`, `await runWizard(ask)` → `args` ; sinon `parseArgs` comme aujourd'hui. Puis suite identique. Appliquer `renderBackendNote` sur `docs/RUN.md` (préfixe) après la copie du RUN (Plan 3). Rapport final : ajouter la ligne « ouvre ton assistant → /new-project ».
- `playbook/00-START.md` — repointer : **chemin principal = `node scripts/setup.mjs` (wizard)** que l'humain lance et auquel il répond ; l'ancien chemin « l'IA installe » devient secondaire et, s'il est utilisé, **gate dur** : « ne devine JAMAIS la stack, pose les questions d'abord ». Note **Windows** : lancer avec `node` (pas de `.sh`) ; les hooks `.githooks/*` sont en bash → besoin de **Git Bash** pour qu'ils s'exécutent.
- `README.md` — bloc « Démarrage rapide » : montrer d'abord `node scripts/setup.mjs` (wizard), puis « ouvre ton assistant → `/new-project` ». Enlever le « puis démarre-le » ambigu.

## Tests

- `wizard` : `needsWizard([], true)===true` ; `needsWizard(['--stack','saas',…], true)===false` ; `needsWizard([], false)===false` (non-TTY → pas de wizard). `buildArgsFromAnswers` mappe et valide ; rejette une stack/nom invalide. `runWizard(fakeAsk)` produit les bons args, redemande sur entrée invalide. `renderBackendNote('saas','local')` contient `convex deployment select local` ; `('saas','cloud')` et `('desktop','local')` → vide.
- Régression : `node --test` complet vert ; le mode `--flags` inchangé (les tests setup existants passent).

## Non-goals (YAGNI)

- Pas d'inquirer ni de TUI riche (readline suffit).
- Pas de prompt maquette dans le wizard (reste géré plus tard par l'IA / `/edit-design`).
- Pas de bootstrap `curl|node` distant ; on suppose le repo cloné (prérequis git+node déjà documentés).
- Le wizard ne scaffolde pas la stack lui-même (`npm create convex`…) — ça reste au `/new-project`/`/build` de l'IA. Le wizard = **config + install de l'environnement**, pas le code applicatif.
