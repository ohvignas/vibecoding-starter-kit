# 00 — Préflight

> Étape 00/04 de `/new-feature` — l'atelier, avant la boucle. **Le cadre** (la boucle d'itération d'`AGENTS.md`, les gates humains) est dans le sommaire : `../new-feature.md`.

## Préflight
1. Vérifie GitHub : `gh auth status`. Vérifie le remote : `git remote`. Si aucun remote → propose `gh repo create` et relie le projet.
2. **La base, c'est la branche où tu es** — `git rev-parse --abbrev-ref HEAD`. Sur un projet neuf, c'est `main` ; sur un projet qui a plusieurs branches, c'est celle que l'utilisateur a choisie, et le kit n'en décide pas à sa place. **Synchronise-la** : `git fetch origin`, puis `git status` ; en retard → `git pull --rebase`. Sans ça, deux features lancées à deux moments partent de deux bases différentes et la seconde conflicte au merge. **Retiens ce nom : la PR reviendra dessus.**
3. Crée un **worktree** isolé pour la feature (`superpowers:using-git-worktrees`) sur une branche `feat/…`, **partant de cette base synchronisée**.
