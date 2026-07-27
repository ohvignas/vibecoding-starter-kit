## Mémoire du projet (anti-oubli)

Le cerveau du projet vit dans `docs/memory/`. **Toujours chargé** : `index.md` (via `@docs/memory/index.md` en haut de l'`AGENTS.md`) ; le détail se lit **à la demande**.

- **Nourrir** : un piège, une convention ou une décision non évidente → UNE ligne dans `gotchas.md` / `conventions.md` / `decisions.md`, format `- [AAAA-MM-JJ] <quoi> → <règle ou fix>`, + un pointeur dans `index.md` si le sujet est nouveau. Jamais d'ajout massif automatique.
- **Charger** : la tâche touche un sujet listé dans `index.md` → lis le fichier détail **avant** d'agir, et revérifie une entrée ancienne contre le code actuel.
- **Consolider** : `index.md` passe ~50 lignes, ou l'utilisateur le demande → joue `consolidate-memory` **dans le fil** : fusionne les doublons, archive l'obsolète (vers `archive.md`, ne supprime pas), reviens sous 50 lignes. Rien en arrière-plan, l'utilisateur voit le diff.
