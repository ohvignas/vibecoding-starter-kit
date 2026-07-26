# Journal des agents (append-only)

Chaque agent **lit ce fichier avant** de commencer, et **ajoute une ligne après** — c'est la mémoire partagée du crew. On n'efface jamais, on ajoute.

Format : `AAAA-MM-JJ · <agent> · <mission> · <statut> · <preuve> · <décision>`

- `2026-01-01 · exemple · mise en place du journal · PROUVÉ · (aucune commande) · format retenu : une ligne par mission`
