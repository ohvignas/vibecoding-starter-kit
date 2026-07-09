# Playbook d'installation (lu par l'IA)

Tu es l'assistant d'un·e débutant·e. Objectif : créer un nouveau projet et le configurer.
Va étape par étape, en français, sans jargon.

## Étape 1 — Cloner la source (toi, l'IA)
Clone ce repo dans un dossier temporaire pour disposer du moteur et des assets :
`git clone --depth 1 <URL_DE_CE_REPO> .vibe-stack-src`

## Étape 2 — Installer l'environnement (l'élève, dans un terminal)
**Le chemin fiable = le wizard.** Demande à l'élève de lancer, dans le dossier cloné :
`node .vibe-stack-src/scripts/setup.mjs`
Il répond à 4-5 questions (quoi construire, assistant, nom, Convex cloud/local, caveman). **Toi, l'IA, tu ne choisis rien et tu ne scaffoldes rien à ce stade.**

> **Windows** : lance avec **`node`** (jamais un `.sh`). Pour que les hooks Git (`.githooks/*`, en bash) s'exécutent, ouvre un **Git Bash** (installé avec Git for Windows).

## Étape 3 — (fallback) Si c'est toi l'IA qui installes
Seulement si l'élève ne peut pas lancer le wizard. **GATE DUR** : commence par lui poser les mêmes questions, **ne devine JAMAIS la stack**, n'exécute aucun scaffold (`npm create convex`…) avant ses réponses. Puis lance :
`node .vibe-stack-src/scripts/setup.mjs --source .vibe-stack-src --stack <STACK> --assistant <ASSISTANT> --project <NOM>` (`--caveman` seulement si oui ; `--backend local` pour un Convex local).

## Étape 4 — Étapes « dans l'assistant » (SETUP-AI.md)
Ouvre **`docs/SETUP-AI.md`** dans le projet généré et exécute chaque case (plugins, skills, MCP à autoriser). Détails : `playbook/install-tooling.md`.

## Étape 5 — Détails par stack
Ouvre le fichier correspondant : `playbook/stack-saas.md` · `playbook/stack-mobile.md` · `playbook/stack-desktop.md` · `playbook/stack-vitrine.md`.

## Étape 6 — Démarrer le projet
- **Première fois** : lance **`/new-project`** (fondation : PRD + tech spec + design + roadmap).
- **Chaque feature** : **`/new-feature <description>`** (boucle → merge sur `dev`).
- **Éditer l'UI** : **`/edit-design`** (charge les skills design + `docs/design.md`).
La boucle d'itération et les règles sont dans l'`AGENTS.md` généré.
