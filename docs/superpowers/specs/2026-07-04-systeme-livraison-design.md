# Système de livraison & intelligence (vibe-stack) — Design

**Date :** 2026-07-04
**Statut :** en revue (brainstorming terminé)
**Portée :** vue d'ensemble des 6 briques + spec détaillée du 1er sous-projet (`/new-project`).

> Évolution majeure du kit `best_practices_vibecoding`. **Change le pilote** : la boucle **superpowers** devient la méthode (BMAD retiré), portée par 3 commandes, une mémoire auto-croissante et un « dream hook ». Inspiré de l'`AGENTS.md` de production de l'utilisateur (Kweeto).

---

## 1. Objectif

Donner au kit (et aux élèves) un **système de développement piloté par l'IA**, discipliné et répétable, déclenché par des **commandes simples** :
- créer un nouveau projet avec une **fondation complète** (PRD + tech spec + design + roadmap) ;
- livrer chaque feature via une **boucle bout-en-bout** (brainstorm → … → merge) ;
- éditer l'UI **avec tout le contexte design** chargé ;
- **ne rien oublier** (mémoire auto-croissante) et **proposer proactivement** (dream hook).

Cible assistants : **Cursor (prio), Claude Code, Codex**. Public : débutants ET usage pro (comme Kweeto).

## 2. Le système — 6 briques

| # | Brique | Rôle |
|---|---|---|
| 1 | **`/new-project <idée>`** | Fondation « giga » : PRD + tech spec/architecture + design + roadmap. Multi-agents pour la profondeur. Validation humaine à chaque artefact. |
| 2 | **`/new-feature <desc>`** | Boucle de livraison par feature : préflight (GitHub + worktree) → brainstorm → plan → sub-agents (TDD) → review → test live → sécu → commit → PR → CI → merge sur `dev`. |
| 3 | **`/edit-design <desc>`** | Charge les 5 skills design + `design.md` AVANT d'éditer l'UI, puis édite en respectant le design system. |
| 4 | **Mémoire auto-croissante** | `docs/memory/` nourri quand un agent découvre un piège/décision, rechargé chaque session. Anti-oubli, anti-répétition d'erreur. |
| 5 | **Dream hook** | GitHub Action planifiée : analyse commits + code, **propose** (feature/bug/dette/UX) dans `docs/DREAM.md`. Propose-only. |
| 6 | **Rework installeur** | Retrait BMAD → superpowers pilote ; install des 5 skills design ; génération des 3 commandes + mémoire + dream + squelette docs, par assistant. |

## 3. Décisions ancrées (recherche vérifiée)

- **Pilote = boucle superpowers, BMAD retiré.** (Décision utilisateur, cohérent avec Kweeto.) superpowers reste installé comme **pilote** ; karpathy + awesome-cursorrules + caveman(opt) inchangés.
- **Gates humains** : la boucle s'arrête pour validation au **brainstorm** et au **plan** (et à chaque artefact de `/new-project`), puis tourne en autonome jusqu'au merge. Def-of-done = **mergé sur `dev` + testé live** (jamais « fini » sur CI verte seule).
- **Mémoire** (pattern *Memory Bank* + mémoire native Claude Code) : **index petit toujours chargé** (`@import`) + **fichiers détail en lazy-load**. Catégories `gotchas/conventions/decisions` + `archive`. Nourrie par règle `AGENTS.md` (« ajoute le piège dès que tu le trouves ») + passe de **consolidation** (`consolidate-memory`). Plafonds de taille → consolidation ; **jamais de dump auto par hook** (pollution de contexte = erreur connue de claude-mem v3) ; vérif-à-la-lecture pour l'obsolescence.
- **Dream** (pattern *reflection* des Generative Agents ; NB : Anthropic a une feature « Dreaming » officielle, mécanique différente) : **GitHub Actions `on: schedule`** (pas le laptop de l'élève), **propose-only** (jamais commit/merge de code ; allowlist d'outils minimale : `Read` + `git log/diff` + `Edit(docs/DREAM.md)`). Entrées **datées, catégorisées, tag confiance, evidence (commit/file:line), cap par run, dédup, gate skip-if-quiet**. Cadence par défaut **4h** (configurable ; 12h conseillé pour petit projet à cause du coût).
- **Livraison des commandes par assistant** : Claude Code `.claude/commands/*.md` ; Cursor `.cursor/commands/*.md` ; Codex → boucle dans `AGENTS.md` (déclenchée en langage naturel). **Toujours** : la boucle + les règles (design, mémoire) vivent dans `AGENTS.md`/`CLAUDE.md` (toujours en contexte).
- **Test live par stack** : SaaS (web) = navigateur (MCP Claude Preview / chrome-devtools / Playwright) + screenshot + vérif résultat ; Desktop (Electron) = lancement fenêtre + capture (`electron:testing-debugging`) ; Mobile (Expo) = build + smoke, validation finale sur téléphone (limite assumée).

## 4. Découpe en sous-projets & ordre de build

Chaque sous-projet = sa spec détaillée → plan → build → review.

1. **SP-A — `/new-project`** (priorité ; établit les patterns réutilisés). ← **détaillé en §5**
2. **SP-C — `/edit-design`** (réutilise le chargement design de A ; petit).
3. **SP-B — `/new-feature`** (la boucle de livraison).
4. **SP-D — Mémoire** + **SP-E — Dream** (couche « intelligente », indépendante des commandes).
5. **SP-F — Rework installeur** (retrait BMAD + génération de tout ce qui précède, par assistant). Packe le tout.

> **Décision de branche (à trancher avec l'utilisateur) :** la branche `feat/installeur-ia` (installeur BMAD, terminé + reviewé) va être **remaniée** (BMAD retiré). Option 1 : la finaliser/merger telle quelle puis brancher `feat/delivery-system`. Option 2 : la laisser et faire évoluer ce travail comme son remplaçant. À décider avant SP-F.

---

## 5. SP-A détaillé — `/new-project <idée>`

**But :** produire, à fond, la **fondation** d'un nouveau produit, avec validation humaine à chaque artefact. C'est « le plus important ».

### Entrée
`/new-project <description libre de l'idée>` (ex. « un SaaS de réservation pour coiffeurs avec agent IA »).

### Phases (chaque artefact = un point d'arrêt validé)
1. **Brainstorm produit** — `superpowers:brainstorming` : intention, users/personas, contraintes, périmètre, critères de succès. → validation.
2. **PRD complète** → `docs/PRD.md` : problème, personas, objectifs, scope, features, user flows, métriques, **non-goals**. → validation.
3. **Choix de stack** — parmi les 3 du kit (SaaS / mobile / desktop) selon l'idée ; réutilise `stacks/<x>/` (README + AGENTS.md + ai-context).
4. **Tech spec / architecture** → `docs/superpowers/specs/AAAA-MM-JJ-<projet>-architecture.md` : composants, modèle de données, APIs, intégrations, sécurité/RGPD, arbitrages. → validation.
5. **Design** → `docs/design.md` : direction UI/UX, design system (couleurs/typo/espacements), états clés ; maquettes optionnelles (`frontend-design` / Pencil / Stitch / Figma). Charge les **5 skills design**. → validation.
6. **Roadmap** → `docs/ROADMAP.md` : features découpées par phase.
7. **Mise en place du projet** : scaffold de la stack choisie (`npm create convex …` / `create-expo-app` / `create-electron-app`), écriture de l'`AGENTS.md`/`CLAUDE.md` (boucle d'itération + règles design + règles mémoire + liens vers PRD/ROADMAP/design/memory), squelette `docs/memory/` + `docs/DREAM.md`.

### Profondeur « giga » (multi-agents)
Pour PRD/architecture/design, `/new-project` **fan-out** des sous-agents (recherche marché/concurrents, rédaction PRD, options d'architecture, direction design) et **synthétise** — pour une fondation vraiment complète, pas bâclée. (Orchestration : le pilote lance des sous-agents en parallèle par artefact.)

### Sorties (fichiers créés)
`docs/PRD.md`, `docs/ROADMAP.md`, `docs/design.md`, `docs/superpowers/specs/<date>-<projet>-architecture.md`, `AGENTS.md`(+`CLAUDE.md`), squelette `docs/memory/`, `docs/DREAM.md`, + le projet scaffoldé.

### Livraison de la commande (par assistant)
Un runbook `new-project` : Claude Code `.claude/commands/new-project.md`, Cursor `.cursor/commands/new-project.md`, Codex → référencé dans `AGENTS.md`. Contenu = le runbook des 7 phases ci-dessus, avec les gates.

### Le runbook (artefact livrable de SP-A)
Un fichier Markdown déterministe (numéroté, gates explicites) que l'IA suit. Source dans le repo (ex. `templates/commands/new-project.md`) → copié par l'installeur (SP-F). **Livrable de SP-A = ce runbook + un validateur** (checke que les phases/refs/fichiers-cibles sont cohérents), pas encore le wiring installeur.

### Gestion d'erreurs / gates
- Chaque artefact **attend validation** avant le suivant (évite de bâtir sur un PRD faux).
- Si l'idée est trop vague → le brainstorm pose des questions **une à la fois** (comme superpowers), ne devine pas.

---

## 6. Hors périmètre (YAGNI)

- Pas d'auto-implémentation par le dream hook (propose-only ; l'humain trie).
- Pas de mémoire vectorielle/embeddings (fichiers markdown git-trackés suffisent à cette échelle).
- Pas de support d'assistants au-delà de Cursor/Claude Code/Codex.
- `/new-feature`, `/edit-design`, mémoire, dream, wiring installeur = **sous-projets suivants**, pas dans SP-A.
- Pas de refonte des 3 stacks existantes (réutilisées telles quelles).

## 7. Critères de succès (système)

- Une commande installe le système ; puis `/new-project` produit une **fondation validée** (PRD+tech-spec+design+roadmap) sur les 3 assistants, sans que l'élève tape de commande shell.
- `/new-feature` livre une feature jusqu'au **merge sur `dev` + test live**, avec gates humains.
- `/edit-design` charge toujours les 5 skills + `design.md` avant d'éditer.
- La **mémoire** grossit proprement (index + lazy-load, pas de dump) et évite des répétitions d'erreur.
- Le **dream hook** dépose des propositions utiles (datées, catégorisées, dédupées), propose-only.
- BMAD retiré ; superpowers = pilote unique (plus de conflit « 2 chefs »).

### Critères de succès (SP-A seul)
- `/new-project "<idée>"` produit les 6 fichiers fondation + le projet scaffoldé, avec un point d'arrêt validé par artefact, sur Cursor/Claude Code/Codex.
- Le runbook est déterministe et passe son validateur.
