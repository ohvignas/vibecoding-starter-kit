## Mémoire du projet (anti-oubli)

Le cerveau du projet vit dans `docs/memory/`. **Toujours chargé** : `docs/memory/index.md` (mets `@docs/memory/index.md` en haut de l'`AGENTS.md`). Les fichiers détail se lisent **à la demande**.

- **Nourrir** : dès que tu découvres un piège, une convention, ou une décision non évidente, ajoute UNE ligne au fichier concerné — `gotchas.md` / `conventions.md` / `decisions.md` — au format `- [AAAA-MM-JJ] <quoi> → <règle ou fix>`, + une ligne pointeur dans `index.md` si c'est un nouveau sujet.
- **Charger** : si une tâche touche un sujet listé dans `index.md`, lis le fichier détail correspondant avant d'agir.
- **Consolider** : lance le skill `consolidate-memory` périodiquement — fusionne les doublons, corrige ou archive les entrées obsolètes (déplace vers `archive.md`, ne supprime pas), garde `index.md` < 50 lignes.
- **Anti-dump** : jamais d'ajout massif automatique ; une entrée ancienne se vérifie contre le code actuel avant qu'on s'y fie.
