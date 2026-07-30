# Dossier formateur

Ces documents sont pour **l'animateur** de la formation Vibe Coding. Ils **ne sont jamais copiés** dans le projet d'un élève : ce dossier ne part même pas dans le paquet npm (voir le champ `files` de `package.json`).

- [`plan-de-cours.md`](plan-de-cours.md) — progression leçon par leçon, alignée sur les commandes et guides du kit, avec objectifs, durées et critères de réussite.

Ce que le kit copie **vraiment** dans un projet : le contenu de `templates/` (règles, runbooks, agents, mémoire, CI…) **et** `guides/glossaire.md`, embarqué en `docs/glossaire.md` pour que l'élève ait le vocabulaire sous la main sans revenir au dépôt.

Le kit lui-même reste neutre : les projets générés ne parlent ni de « formation » ni d'« accompagnement » — un test l'exige, dans les deux langues (`scripts/lib/docs.test.mjs`, « H7bis »).
