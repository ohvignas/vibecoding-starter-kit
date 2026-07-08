# Finalisation (reste de l'audit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Couvrir les axes restants de l'audit (P1 : debug, déploiement, mise à jour du kit, anti-pourrissement ; P2 : coûts, dossier formateur, question caveman).

**Architecture:** Nouvelles commandes runbook (`templates/commands/*.md`) câblées dans la boucle de `scripts/setup.mjs` ; nouveau `scripts/update.mjs` + manifeste `.vibecoding.json` écrit par le setup ; job CI hebdo `rot-check` ; docs kit (`docs/COUTS.md`, `formateur/`).

**Tech Stack:** Node ESM zéro dépendance, `node --test`, Markdown français.

## Global Constraints

- Node ESM zéro dépendance npm ; tests `node --test` ; binaire `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.
- Tout en français ; copies non destructives ; **les templates GÉNÉRÉS ne parlent pas de « formation »/« accompagnement »** (le dossier `formateur/` vit au niveau du KIT, jamais copié dans un projet).
- Jamais de secret écrit dans un fichier de projet.

---

## Tâche 1 : commande `/debug`
**Files:** Create `templates/commands/debug.md` · Modify `scripts/setup.mjs` (boucle commandes), `scripts/lib/cursor-commands.test.mjs`.
Runbook de débogage systématique (reproduire → isoler → hypothèse → test → fix minimal), branché sur `superpowers:systematic-debugging` + la règle des 3 essais. Ajouter `debug` à la boucle des commandes et à la liste du test cursor-commands.

## Tâche 2 : commande `/deploy`
**Files:** Create `templates/commands/deploy.md` · Modify `scripts/setup.mjs`, `scripts/lib/cursor-commands.test.mjs`.
Runbook de déploiement qui lit la stack dans `AGENTS.md` et applique : SaaS → `npx convex deploy` + hébergeur (Vercel/Netlify) ; mobile → EAS (`eas build`/`eas submit`) ; desktop → `electron-builder` + signature. Rappelle : secrets en prod via l'hébergeur, jamais commités. Ajouter `deploy` à la boucle + au test.

## Tâche 3 : `scripts/update.mjs` + manifeste `.vibecoding.json`
**Files:** Create `scripts/update.mjs`, `scripts/lib/update.test.mjs` · Modify `scripts/setup.mjs` (écrit `.vibecoding.json`).
`setup.mjs` écrit `.vibecoding.json` `{ stack, assistant, version }` dans le projet. `update.mjs` le lit et **re-joue les copies non destructives** (via `setup.mjs`, `copyIfAbsent` n'écrase rien) pour récupérer les nouveaux fichiers du kit sans toucher au travail de l'élève. Test : après suppression d'un fichier généré, `update` le recrée ; un fichier modifié n'est pas écrasé.

## Tâche 4 : CI anti-pourrissement `rot-check` (hebdo)
**Files:** Create `.github/workflows/rot-check.yml`.
Job `schedule` (cron hebdo) + `workflow_dispatch` qui vérifie que les dépôts de skills (`better-auth/skills`, `get-convex/agent-skills`, `expo/skills`, `google-labs-code/stitch-skills`, `anthropics/skills`) et les URLs `llms.txt`/MCP répondent (curl -m 10, code < 400). Échec = alerte (le job rougit) pour qu'Antoine sache qu'une source externe a bougé.

## Tâche 5 : question caveman clarifiée (P2)
**Files:** Modify `scripts/lib/wizard.mjs`.
La question caveman piège le débutant (réponses IA courtes ↔ mode apprentissage verbeux). Reformuler en **option avancée** explicite, défaut non : `(avancé) Réponses IA plus courtes pour réduire les coûts ? [o/N]`.

## Tâche 6 : coûts (P2)
**Files:** Create `docs/COUTS.md` (guide kit) · Modify `templates/ONBOARDING.md` (renvoi coûts).
`docs/COUTS.md` : pourquoi la facture IA monte, comment la suivre (`npx ccusage`), les réflexes (petites tâches, mode apprentissage, éviter `/build --all` sur gros projets). ONBOARDING : une ligne « Surveille tes coûts → voir COUTS.md » (dans le kit, pas dans le projet généré — ajout à `docs/COUTS.md` du repo + lien depuis le README).

## Tâche 7 : dossier formateur (P2, niveau kit)
**Files:** Create `formateur/plan-de-cours.md`, `formateur/README.md`.
Au niveau du KIT (jamais copié dans un projet) : un plan de cours (progression leçon par leçon alignée sur les commandes/guides), une grille de revue, le fil rouge. `formateur/README.md` explique que c'est pour l'animateur.

## Auto-revue
- [ ] Couverture : debug (T1), deploy (T2), update+manifeste (T3), rot-check (T4), caveman (T5), coûts (T6), formateur (T7).
- [ ] Zéro placeholder ; français ; pas de « formation » dans les templates générés (formateur/ est hors génération).
- [ ] Suite verte + smoke E2E vert après chaque tâche touchant setup.mjs.
