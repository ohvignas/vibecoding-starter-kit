# Design — Installeur de projet piloté par l'IA (« vibe-stack »)

**Date :** 2026-07-04
**Statut :** en revue (brainstorming terminé, spec à valider)
**Contexte :** évolution du repo `best_practices_vibecoding` (kit de stacks vibecoding déjà construit : 3 stacks + `ai-context/` + skills + `.mcp.json`).

---

## 1. Objectif

Permettre à un·e débutant·e de la formation Vibe Coding de **créer un nouveau projet complet en parlant simplement à son IA** — sans taper de commande. L'élève donne un lien GitHub à son assistant (Cursor / Claude Code / Codex) et dit « installe et configure-moi tout ». L'IA :

1. pose des questions dans le chat (quoi construire, quel assistant, maquette ?),
2. installe le contexte IA de la stack choisie + un ensemble d'outils IA (BMAD, superpowers, karpathy, awesome-cursorrules),
3. démarre le projet avec **BMAD** : interview → PRD → maquette → scaffold → build.

## 2. Utilisateurs & besoin

- **Qui :** débutants complets, sous **Cursor en priorité**, mais aussi **Claude Code** et **Codex**.
- **Besoin :** ne pas avoir à connaître les commandes ni la plomberie ; obtenir une stack + une méthode de travail (BMAD) prêtes, et être guidé du PRD jusqu'à l'app.
- **Contrainte clé :** l'entrée est conversationnelle (« parle à l'IA + donne le lien »), pas une CLI que l'élève tape.

## 3. Expérience cible (bout en bout)

1. L'élève ouvre son assistant et dit : *« Installe et configure ce projet : `github.com/<org>/vibe-stack` — suis son playbook. »*
2. L'IA lit `AGENTS.md` (routeur) → `playbook/00-START.md`.
3. L'IA demande, dans le chat :
   - **Quel type d'app ?** SaaS / mobile / desktop.
   - **Quel assistant utilises-tu ?** (souvent auto-détectable ; sinon demande) Cursor / Claude Code / Codex.
   - **Nom du projet ?** (→ nouveau dossier).
   - **As-tu une maquette ?** (déjà faite via Claude, image, HTML, ou lien) — sinon on en génère une plus tard.
4. L'IA exécute `node scripts/setup.mjs …` → installe tout dans le nouveau dossier, au bon format pour l'assistant, et affiche un rapport.
5. L'IA demande : *« On démarre le projet maintenant ? »*
6. Si oui → **BMAD** : interview → **PRD** → validation → maquette intégrée → **scaffold du squelette** (vraies commandes de la stack) → **build** feature par feature.

L'élève ne voit **que la conversation** et le résultat.

## 4. Mécanisme

**Installeur piloté par l'IA = playbook (runbook déterministe) + script helper.**

- **`playbook/`** : fichiers Markdown écrits *pour être exécutés par une IA*. Étapes numérotées, commandes exactes, points de décision explicites. C'est ce que l'IA lit et suit.
- **`scripts/setup.mjs`** : moteur Node (cross-platform Mac/Windows/Linux) qui fait les parties **mécaniques et faillibles** (clone/copie/`npx`), invoqué par l'IA en une passe pour éviter la dérive. L'IA garde le **conversationnel** (questions, BMAD).
- **Raison :** les agents IA dérivent sur les tâches multi-étapes. On confie le déterministe au script, le dialogue à l'IA.

**Vérité d'architecture :** le script *prépare* ; c'est l'assistant IA qui *exécute* BMAD (une commande shell ne peut pas tenir la conversation IA). L'installeur se termine en **amorçant le 1er pas de BMAD**.

## 5. Structure du repo

```
vibe-stack/
├── AGENTS.md                     # NOUVEAU — routeur : "pour installer ce projet, suivre playbook/00-START.md"
├── playbook/                     # NOUVEAU — runbook lu PAR l'IA
│   ├── 00-START.md               #   orchestrateur : questions + branchement stack/assistant
│   ├── stack-saas.md
│   ├── stack-mobile.md
│   ├── stack-desktop.md
│   ├── install-tooling.md        #   BMAD + superpowers + karpathy + cursorrules (matrice par assistant)
│   └── bmad-kickoff.md           #   interview → PRD → maquette → scaffold → build
├── scripts/
│   ├── setup.mjs                 # NOUVEAU — moteur déterministe (Node)
│   └── download-ai-context.sh    # existant
├── stacks/                       # existant (saas / mobile / desktop : README, AGENTS.md, prompts)
├── ai-context/                   # existant (llms.txt + règles)
├── .claude/skills/               # existant (stack-saas / stack-mobile / stack-desktop)
├── guides/ · .mcp.json · README.md  # existants
```

- **Cible d'installation = un nouveau dossier projet** (nom demandé à l'élève). Ce repo est la **source** (playbook + assets) ; les 4 repos externes sont récupérés dans le nouveau projet.
- Le nouveau projet reçoit à sa racine un **`maquette/`** (voir §8).

## 6. Matrice d'installation (stack × assistant)

`node scripts/setup.mjs --stack <saas|mobile|desktop> --assistant <cursor|claude-code|codex> --project <nom> [--mockup <path|url>]`

Ce qui est posé selon l'assistant :

| Asset | Cursor | Claude Code | Codex |
|---|---|---|---|
| Règles de la stack (les nôtres, depuis `stacks/`+`ai-context/`) | `.cursor/rules/*.mdc` | `.claude/skills/` + `AGENTS.md` | `AGENTS.md` |
| **BMAD** (méthode pilote) | `npx bmad-method install --tools cursor` → `.agents/skills` | `--tools claude-code` → `.claude/skills` | `--tools codex` → `.agents/skills` ✅ |
| **superpowers** (outils, *cmd plugin dans l'assistant*) | `/add-plugin superpowers` | `/plugin install superpowers@claude-plugins-official` | `/plugins` → Superpowers |
| **karpathy** (hygiène de code) | `.cursor/rules/karpathy.mdc` | skill / `CLAUDE.md` | fusion `AGENTS.md` |
| **awesome-cursorrules** | sous-ensemble curé `.cursor/rules/` | *(Cursor-only → skip)* | *(skip)* |
| **MCP** (SaaS/mobile) | `.cursor/mcp.json` | `.mcp.json` | note dans `AGENTS.md` |

> **Note install superpowers :** ce sont des **commandes de plugin exécutées *dans* l'assistant** (pas en shell). `scripts/setup.mjs` ne peut donc pas les lancer ; c'est **l'IA elle-même** qui les exécute (elle a accès à sa propre commande plugin). Codex App = via l'UI Plugins (pas de commande). Le helper les liste dans son rapport si l'IA ne peut pas les lancer.

## 7. Traitement des 4 repos externes + résolution de conflit

- **BMAD** (`bmad-code-org/BMAD-METHOD`, **v4 stable**) : installé via `npx bmad-method install` en ciblant l'assistant choisi. **C'est LE pilote de projet.**
- **superpowers** (`obra/superpowers`) : installé sur **les 3 assistants** (support multi-agent confirmé ; 10 plateformes dont Cursor, Codex App/CLI, Claude Code). Install = **commande plugin dans l'assistant**, exécutée par l'IA : Cursor `/add-plugin superpowers`, Codex CLI `/plugins` → Superpowers (Codex App via UI), Claude Code `/plugin install superpowers@claude-plugins-official`. Rôle = **boîte à outils** (TDD, systematic-debugging) utilisée *pendant* le build. **Ne doit pas relancer son propre brainstorming/planning** sur un projet piloté par BMAD.
- **karpathy** (`multica-ai/andrej-karpathy-skills`) : 4 principes d'hygiène. On **copie les fichiers directement depuis ce repo** (pas via le slug marketplace, qui pointe par erreur vers `forrestchang`). Format selon l'assistant.
- **awesome-cursorrules** (`PatrickJS/awesome-cursorrules`) : pas de CLI. Le helper **copie un sous-ensemble curé** de `.cursor/rules/*.mdc` correspondant à la stack (ex. TypeScript, React, clean-code). **Cursor uniquement** ; ignoré sur Claude Code/Codex.

**Conflit géré :** BMAD et superpowers sont tous deux des méthodes « pilote de projet ». Règle inscrite dans l'`AGENTS.md` **généré** : *BMAD pilote le processus (planning→build) ; superpowers ne fournit que des skills d'exécution (TDD, debug) et ne lance jamais son propre cycle de planification.* karpathy + cursorrules sont passifs → cohabitent sans risque.

## 8. Flux BMAD v4 + maquette

Déclenché si l'élève accepte de démarrer :

1. **Interview** — l'IA (agents BMAD : Analyst/PM) pose les questions projet dans le chat.
2. **Maquette** — convention **dossier `maquette/`** à la racine du projet :
   - si l'élève a **déjà** une maquette (image PNG/JPG, HTML généré par Claude, ou lien Figma/Claude), il la **dépose dans `maquette/`** ou en donne le chemin/lien ;
   - **sinon, l'agent propose d'en générer une** (HTML/image) avant de construire ;
   - la maquette est lue et injectée comme **contexte UX** pour le PRD et le build.
3. **PRD** — BMAD produit le PRD complet → **validation par l'élève** (point d'arrêt).
4. **Architecture** — allégée : la stack est déjà fixée (celle choisie) ; BMAD se concentre sur le découpage en composants/épics.
5. **Scaffold** — *maintenant* (post-PRD), l'IA lance les vraies commandes de la stack :
   - SaaS : `npm create convex@latest -- -t tanstack-start` (+ Better Auth),
   - mobile : `npx create-expo-app@latest` (+ `convex`),
   - desktop : `npx create-electron-app@latest --template=vite-typescript`.
6. **Build** — cycle dev BMAD (story par story) depuis PRD + maquette, en s'appuyant sur les règles de la stack et les skills superpowers (TDD/debug).

## 9. Robustesse

- **Idempotence :** `setup.mjs` relançable ; ne réécrit pas un fichier modifié par l'élève sans demander (détection + confirmation).
- **Rapport final :** le helper affiche, par assistant, ce qui a été **installé / sauté / à faire manuellement** (ex. commandes de plugin à lancer dans l'assistant lui-même).
- **Dépendances :** vérifie Node ≥ 20.12 (requis par BMAD) et `git` ; message clair si absent (renvoi vers `guides/02-installer-les-outils.md`).
- **Étapes non-shell :** certaines installs (plugins Claude Code, plugins Cursor) se font *dans l'assistant*, pas en shell. Le playbook les fait exécuter **par l'IA elle-même** (elle a accès à ces commandes) ou, à défaut, les liste dans le rapport pour l'élève.
- **Échecs réseau :** le clone/`npx` peut échouer ; le helper réessaie et continue les autres étapes, puis signale les échecs.

## 10. Points à vérifier (avant/pendant l'implémentation)

1. ~~superpowers — commandes Cursor/Codex~~ ✅ **RÉSOLU** : Cursor `/add-plugin superpowers`, Codex CLI `/plugins`, Codex App via UI, Claude Code `/plugin install superpowers@claude-plugins-official` (commandes plugin dans l'assistant).
2. ~~BMAD — support Codex~~ ✅ **RÉSOLU** : `codex`, `cursor`, `claude-code` tous supportés et `preferred:true` dans `platform-codes.yaml`. Cibles : `.agents/skills` (Cursor/Codex), `.claude/skills` (Claude Code).
3. **awesome-cursorrules** — définir le **sous-ensemble exact** de règles par stack (éviter de copier tout le repo). *(à faire en implémentation)*
4. **BMAD v4** — confirmer que la ligne v4 reste installable via `npx bmad-method install` (vs v6 par défaut) ; sinon épingler la version. *(à faire en implémentation)*

## 11. Hors périmètre (YAGNI)

- Pas de publication d'un paquet npm ni de CLI que l'élève tape (l'entrée est conversationnelle).
- Pas d'interface web / TUI.
- Pas de support d'assistants au-delà de Cursor / Claude Code / Codex (extensible plus tard).
- Pas de gestion de déploiement dans l'installeur (le déploiement reste guidé par les `stacks/*/prompts-de-demarrage.md`).
- Pas de v6 BMAD dans cette version (swap possible ultérieurement).

## 12. Critères de succès

- Un élève sous **Cursor** (puis Claude Code, puis Codex) peut, en donnant le lien et en discutant, obtenir : un nouveau projet + le contexte IA de sa stack + BMAD/superpowers/karpathy/cursorrules posés au bon format, **sans taper de commande**.
- BMAD démarre et produit un **PRD validé**, intègre une **maquette** (fournie ou générée), puis **scaffolde + construit** l'app.
- Aucun conflit « deux pilotes » : BMAD dirige, superpowers assiste.
- `setup.mjs` est **relançable sans casse** et **rapporte** clairement ce qu'il a fait.
