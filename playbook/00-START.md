# Playbook d'installation (lu par l'IA)

Tu es l'assistant d'un·e débutant·e. Objectif : créer un nouveau projet et le configurer.
Va étape par étape, en français, sans jargon.

## Étape 1 — Installer l'environnement (l'élève, dans un terminal)
**Le chemin fiable = le wizard, depuis npm.** Rien à cloner. Demande à l'élève de lancer, **dans un dossier vide** :
`npm create vibecoding-kit@latest`
Il répond à 4-5 questions (quoi construire, quel assistant, le nom du projet, — pour un SaaS — Convex en cloud ou en local, et le mode apprentissage). **Toi, l'IA, tu ne choisis rien et tu ne scaffoldes rien à ce stade.**

> **Windows** : lance avec **`node`** (jamais un `.sh`). Pour que les hooks Git (`.githooks/*`, en bash) s'exécutent, ouvre un **Git Bash** (installé avec Git for Windows).
> **Stack vitrine** : Astro 7 exige **Node ≥ 22.12**. Fais vérifier `node --version` avant de commencer.

## Étape 2 — (fallback) Si c'est toi l'IA qui installes
Seulement si l'élève ne peut pas lancer le wizard. **GATE DUR** : commence par lui poser les mêmes questions, **ne devine JAMAIS la stack**, n'exécute aucun scaffold (`npm create convex`…) avant ses réponses. Puis lance, toujours sans rien cloner :
`npx create-vibecoding-kit --stack <STACK> --assistant <ASSISTANT> --project <NOM> --yes` (`--backend local` pour un Convex local ; `--no-learning` s'il refuse le mode apprentissage ; `--caveman` seulement s'il le demande explicitement — le wizard, lui, ne pose plus cette question).

## Étape 3 — Étapes « dans l'assistant » (`docs/A-FAIRE.md`)
Ouvre **`docs/A-FAIRE.md`** dans le projet généré — c'est le **seul** fichier d'install — et exécute chaque case (plugins, MCP à autoriser ; les skills, eux, sont déjà posés par le wizard). Détails : `playbook/install-tooling.md`.

## Étape 4 — Détails par stack
Ouvre le fichier correspondant : `playbook/stack-saas.md` · `playbook/stack-mobile.md` · `playbook/stack-desktop.md` · `playbook/stack-vitrine.md`.

## Étape 5 — Mettre à jour un projet déjà généré
Depuis le dossier du projet : `npx create-vibecoding-kit --refresh` (ajoute `--dry-run` pour prévisualiser). Ça régénère les règles, les runbooks et les agents ; `src/`, `docs/` et la zone de règles perso ne sont **jamais** touchés.

## Étape 6 — Démarrer le projet
- **L'entrée, la seule à retenir** : **`/help`** — elle liste les 10 runbooks et dit par où continuer.
- **Rien n'est encore posé** : **`/init-vibecoding`** (l'IA installe et déroule `docs/A-FAIRE.md` avec l'élève).
- **Première fois sur un produit** : **`/new-project`** (fondation : PRD + tech spec + design + maquette + roadmap).
- **Chaque feature** : **`/new-feature <description>`** (boucle → merge sur `main`).
- **Éditer l'UI** : **`/edit-design`** (charge les skills design + `docs/design.md`).

> Chez **Codex**, ces runbooks ne sont pas des slash-commands : ce sont des **fichiers** dans `docs/commands/` — ouvre-les et suis-les pas à pas.

La boucle d'itération et les règles sont dans l'`AGENTS.md` généré.
