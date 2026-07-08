# Plan de cours — Vibe Coding (débutants)

Progression pensée pour des élèves **qui n'ont jamais codé**. Chaque leçon : un objectif, une durée, un livrable, un critère de réussite. Le fil rouge = un vrai petit projet construit du début à la fin.

## Module 0 — Mise en route (30-45 min)
- **Objectif** : avoir un environnement qui marche.
- **Fais** : installer Node + git + Cursor (`guides/02-installer-les-outils.md`) ; cloner le kit ; lancer `node scripts/setup.mjs`.
- **Livrable** : un dossier de projet généré, `git` initialisé.
- **Réussite** : dans l'assistant, `/doctor` affiche « ✅ ton environnement est prêt ».

## Module 1 — Parler à l'IA (45 min)
- **Objectif** : comprendre le prompting et le vocabulaire.
- **Fais** : lire `guides/01-comment-parler-a-l-IA.md` + le `guides/glossaire.md` ; jouer `stacks/saas/prompts-de-demarrage.md`.
- **Réussite** : l'élève explique avec ses mots : LLM, MCP, stack, jalon, maquette.

## Module 2 — La fondation (1 h)
- **Objectif** : transformer une idée en plan.
- **Fais** : `/new-project "<idée>"` → PRD, tech spec, **maquette**, roadmap. Valider chaque gate.
- **Réussite** : une maquette validée dans `maquette/` + une roadmap dont chaque jalon a un « ✅ Ce que tu vois ».

## Module 3 — Construire (2-3 h, mode apprentissage ON)
- **Objectif** : voir l'app grandir, en comprenant.
- **Fais** : `/build` jalon par jalon ; répondre aux questions de compréhension ; utiliser `/next` si perdu.
- **Réussite** : au moins 3 jalons cochés, chacun vérifié en vrai (navigateur/simulateur).

## Module 4 — Quand ça casse (1 h)
- **Objectif** : ne plus paniquer.
- **Fais** : provoquer un bug, utiliser `/debug` puis `/sos` ; revenir à un tag `jalon-*` ; noter le piège dans `docs/memory/`.
- **Réussite** : l'élève répare seul un bug simple et sait revenir à un état vert.

## Module 5 — Livrer (1 h)
- **Objectif** : mettre en ligne.
- **Fais** : `/new-feature` pour une feature isolée (PR + CI) ; `/deploy` pour publier.
- **Réussite** : l'app est en ligne (ou buildée) ; l'élève sait où vont les secrets de prod.

## Transverses (à rappeler tout du long)
- **Sécurité** : jamais de secret commité (`guides/03-securite-et-couts.md`, hooks du kit).
- **Coûts** : `docs/COUTS.md` — `/build` pas `--all`, conversations courtes, `npx ccusage`.
- **Grille de revue** (par jalon) : ça tourne en vrai ? l'élève sait expliquer ce que l'IA a fait ? pas de secret ? commité + tag ?
