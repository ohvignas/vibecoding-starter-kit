# Plan de cours — Vibe Coding (débutants)

Progression pensée pour des élèves **qui n'ont jamais codé**. Chaque leçon : un objectif, une durée, un livrable, un critère de réussite. Le fil rouge = un vrai petit projet construit du début à la fin.

## Module 0 — Mise en route (30-45 min)
- **Objectif** : avoir un environnement qui marche.
- **Fais** : installer Node + git + Cursor (`guides/02-installer-les-outils.md`) ; dans un dossier vide, lancer **`npm create vibecoding-kit@latest`** (rien à cloner) ; répondre aux 4-5 questions du wizard ; coller dans l'assistant le prompt de `COLLE-MOI-DANS-L-IA.md`, puis jouer `docs/A-FAIRE.md` (plugins + MCP).
- **Livrable** : un dossier de projet généré, `git` initialisé.
- **Réussite** : dans l'assistant, `/doctor` affiche « ✅ Ton environnement est prêt ».
- **Piège salle** : stack **vitrine** → Astro 7 exige **Node ≥ 22.12**. Faire vérifier `node --version` avant de lancer quoi que ce soit.

## Module 1 — Parler à l'IA (45 min)
- **Objectif** : comprendre le prompting et le vocabulaire.
- **Fais** : lire `guides/01-comment-parler-a-l-IA.md` + le `guides/glossaire.md` (il est aussi **dans le projet de l'élève**, en `docs/glossaire.md` — c'est là qu'il ira le chercher) ; jouer `stacks/saas/prompts-de-demarrage.md`.
- **Réussite** : l'élève explique avec ses mots : LLM, MCP, stack, jalon, maquette.
- **Entrée unique à faire retenir** : `/help`. Toutes les autres commandes se retrouvent depuis là.

## Module 2 — La fondation (1 h)
- **Objectif** : transformer une idée en plan.
- **Fais** : `/new-project "<idée>"` → PRD, tech spec, **maquette**, roadmap. Valider chaque gate.
- **Réussite** : une maquette validée dans `maquette/` + une roadmap dont chaque jalon a un « ✅ Ce que tu vois ».

## Module 3 — Construire (2-3 h, mode apprentissage ON)
- **Objectif** : voir l'app grandir, en comprenant.
- **Fais** : `/build` jalon par jalon ; répondre aux questions de compréhension ; utiliser `/next` si perdu.
- **Réussite** : au moins 3 jalons cochés, chacun vérifié en vrai (navigateur/simulateur).

## Module 3bis — L'équipe d'agents (30 min)
- **Objectif** : savoir que l'élève n'est pas seul face à son code.
- **Fais** : montrer les **7 agents** posés dans le projet (`.claude/agents/`, `.cursor/agents/` ou `docs/agents/crew/` selon l'assistant) et les appeler à la main : « lance `critique-ux` sur cet écran ». Puis ouvrir `docs/agents/` : `JOURNAL.md` (append-only, une ligne par mission avec sa preuve), `state.yaml` (l'état courant, un seul écrivain), `inventaire.md` (ce que la maquette promet, élément par élément).
- **Réussite** : l'élève sait dire qui prononce **PROUVÉ** sur un jalon, et où le lire.

## Module 4 — Quand ça casse (1 h)
- **Objectif** : ne plus paniquer.
- **Fais** : provoquer un bug, demander à l'IA de le traquer méthodiquement (**Règle Preuve** : 3 tentatives max, puis `BLOQUÉ`), puis `/sos` ; revenir à un tag `jalon-*` ; noter le piège dans `docs/memory/`.
- **Réussite** : l'élève répare seul un bug simple et sait revenir à un état vert.
- **À rappeler** : la **Règle Réalité** — un bouton qui ne fait rien n'est pas fini, même s'il est joli. Zéro mock hors des fichiers de test.

## Module 5 — Livrer (1 h)
- **Objectif** : mettre en ligne.
- **Fais** : `/new-feature` pour une feature isolée (PR + CI) ; `/deploy` pour publier.
- **Réussite** : l'app est en ligne (ou buildée) ; l'élève sait où vont les secrets de prod.

## Transverses (à rappeler tout du long)
- **Sécurité** : jamais de secret commité (`guides/03-securite-et-couts.md`, hooks du kit).
- **Coûts** : `docs/COUTS.md` — `/build` pas `--all`, conversations courtes, `npx ccusage`.
- **Grille de revue** (par jalon) : ça tourne en vrai ? l'élève sait expliquer ce que l'IA a fait ? pas de secret ? commité + tag ?
