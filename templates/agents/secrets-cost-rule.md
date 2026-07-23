## Règle secrets & coûts

**Secrets (sécurité)**
- Clés / API / tokens → **uniquement** dans `.env` (déjà gitignored). **Jamais** en dur dans le code, jamais côté client, jamais dans un commit.
- `.env.example` liste les **noms** de variables, **sans valeurs**. Ne pousse **jamais** `.env`.
- Le hook **pre-commit** bloque les secrets détectés — ne le contourne pas (`--no-verify` interdit sauf raison explicite validée).
- **Demande avant toute action destructive** : suppression de données, `git push --force`, migration, `rm`.

**Coûts (tu dépenses de l'argent réel)**
- **Modèle adapté à la tâche** : petit/rapide pour le mécanique, gros seulement pour l'architecture ou le raisonnement dur.
- **Pas de fan-out inutile** : sous-agents en parallèle **seulement** si le travail est vraiment indépendant (voir « Règle sous-agents »).
- **Règle des 3 essais** : 3 corrections ratées sur le même bug → **stop** (ne brûle pas des tokens en boucle ; reviens au dernier état vert).
