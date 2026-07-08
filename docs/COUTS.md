# Maîtriser les coûts de l'IA

Coder avec une IA (Cursor, Claude…) coûte de l'argent à l'usage. Voici comment éviter les mauvaises surprises.

## Pourquoi la facture monte
- Plus le contexte est **gros** (fichiers ouverts, longues conversations), plus chaque message coûte.
- Les **boucles automatiques** (`/build --all` sur un gros projet) enchaînent beaucoup d'étapes d'un coup.
- Relire tout le projet à chaque question = cher et inutile.

## Suivre ta consommation
- **`npx ccusage`** — affiche ta consommation Claude/Cursor récente (jour, session). Lance-le de temps en temps.
- Dans **Cursor** : Settings → Usage montre ta consommation et tes limites.

## Les bons réflexes (débutant)
- **Une tâche à la fois** : `/build` jalon par jalon (pas `/build --all`) tant que tu débutes — tu vois ce qui se passe et tu dépenses moins.
- **Mode apprentissage** (activé par défaut) : l'IA explique et avance par petits pas → moins de gros allers-retours ratés.
- **Conversations courtes** : quand un sujet est fini, ouvre une nouvelle conversation (contexte plus léger = moins cher).
- **`/next`** quand tu es perdu : une réponse ciblée coûte moins qu'une longue exploration.
- **Règle des 3 essais** : si un bug résiste 3 fois, on s'arrête (`/sos`) au lieu de brûler des tokens en boucle.

## Prérequis de la formation
Cursor **Pro** (~20 $/mois) est recommandé : usage confortable + Bugbot + agents. Commence en gratuit pour ta première victoire, passe Pro quand tu construis vraiment.
