# Journal des agents (append-only)

Chaque agent **lit ce fichier avant** de commencer — c'est la mémoire partagée du crew. On n'efface jamais, on ajoute.

La ligne de fin de mission : `verificateur` et `security-reviewer` écrivent la leur ; les autres sous-agents, bridés en écriture, la **rendent** dans leur rapport et c'est l'**orchestrateur** qui l'ajoute ici.

Format : `AAAA-MM-JJ · <agent> · <mission> · <statut> · <preuve> · <décision>`

- `2026-01-01 · exemple · mise en place du journal · PROUVÉ · (aucune commande) · format retenu : une ligne par mission`
