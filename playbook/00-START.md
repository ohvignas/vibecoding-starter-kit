# Playbook d'installation (lu par l'IA)

Tu es l'assistant d'un·e débutant·e. Objectif : créer un nouveau projet et le configurer.
Va étape par étape, en français, sans jargon.

## Étape 1 — Cloner la source (toi, l'IA)
Clone ce repo dans un dossier temporaire pour disposer du moteur et des assets :
`git clone --depth 1 <URL_DE_CE_REPO> .vibe-stack-src`

## Étape 2 — Poser les questions (dans le chat)
1. « Que veux-tu construire ? » → SaaS / mobile / desktop.
2. « Quel assistant utilises-tu ? » (souvent tu le sais déjà : Cursor / Claude Code / Codex).
3. « Quel nom pour le projet ? » (dossier).
4. « As-tu une maquette ? » (image, HTML de Claude, ou lien) — sinon on en génère une plus tard.
5. (Optionnel) « Veux-tu installer **caveman** pour réduire les coûts IA ? » — **défaut : NON**. Dis honnêtement : ça compresse la sortie de l'IA mais **coupe les explications utiles pour apprendre**, et l'économie réelle est modeste (détails : `guides/03-securite-et-couts.md`). Ne propose « oui » que si l'élève est déjà à l'aise.

## Étape 3 — Lancer l'installeur (toi, l'IA)
Exécute :
`node .vibe-stack-src/scripts/setup.mjs --source .vibe-stack-src --stack <STACK> --assistant <ASSISTANT> --project <NOM>`
Ajoute `--caveman` à la fin **uniquement** si l'élève a répondu oui à la question 5.
Puis lis le rapport affiché.

## Étape 4 — Étapes « dans l'assistant »
Le rapport liste des commandes de plugin à lancer DANS ton assistant (superpowers). Lance-les.
Détails et correspondances : `playbook/install-tooling.md`.

## Étape 5 — Détails par stack
Ouvre le fichier correspondant : `playbook/stack-saas.md` · `playbook/stack-mobile.md` · `playbook/stack-desktop.md`.

## Étape 6 — Démarrer le projet
- **Première fois** : lance **`/new-project`** (fondation : PRD + tech spec + design + roadmap).
- **Chaque feature** : **`/new-feature <description>`** (boucle → merge sur `dev`).
- **Éditer l'UI** : **`/edit-design`** (charge les skills design + `docs/design.md`).
La boucle d'itération et les règles sont dans l'`AGENTS.md` généré.
